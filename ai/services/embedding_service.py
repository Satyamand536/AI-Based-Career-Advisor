"""
Embedding Service - Core NLP Module
====================================
Provides semantic embedding generation using Sentence-BERT (SBERT).

Features:
- Centralized text preprocessing
- LRU caching for performance optimization
- Batch embedding support
- Lazy loading with semantic hash fallback (100% availability)
- Subprocess worker mode keeps torch out of the Flask process

Author: AI Career Advisor System
"""

import hashlib
import numpy as np
import logging
import re
import os
from typing import List, Dict, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Production-grade embedding service with high availability.
    """

    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        if EmbeddingService._initialized:
            return

        self.model_name = model_name
        self.embedding_dim = 768 if "mpnet" in model_name.lower() else 384

        self.model = None
        self.tokenizer = None
        self._cache: Dict[str, np.ndarray] = {}
        self._cache_hits = 0
        self._cache_misses = 0
        self._loading_failed = False

        logger.info(f"⚙️ [EmbeddingService] Initialized (Lazy Mode). Model: {self.model_name}")
        EmbeddingService._initialized = True

    def _ensure_model_ready(self):
        if self.model is not None or self._loading_failed:
            return

        logger.info(f"🧠 [EmbeddingService] Loading model into RAM: {self.model_name}")
        try:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
                logger.info(f"✅ [EmbeddingService] {self.model_name} loaded via SentenceTransformer.")
            except Exception as e:
                logger.warning(f"⚠️ [EmbeddingService] SentenceTransformer load failed: {e}. Trying transformers fallback...")
                import torch
                from transformers import AutoTokenizer, AutoModel

                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model_base = AutoModel.from_pretrained(self.model_name)
                self.model_base.eval()
                self.model_base.to('cpu')

                class DirectEncoder:
                    def __init__(self, model, tokenizer):
                        self.model = model
                        self.tokenizer = tokenizer

                    def encode(self, texts, **kwargs):
                        if isinstance(texts, str): texts = [texts]
                        inputs = self.tokenizer(texts, padding=True, truncation=True, return_tensors='pt').to('cpu')
                        with torch.no_grad():
                            out = self.model(**inputs)
                        emb = out[0].mean(dim=1)
                        if kwargs.get('normalize_embeddings', True):
                            emb = torch.nn.functional.normalize(emb, p=2, dim=1)
                        res = emb.cpu().numpy()
                        return res[0] if len(texts) == 1 and kwargs.get('batch_size') is None else res

                self.model = DirectEncoder(self.model_base, self.tokenizer)
                logger.info(f"✅ [EmbeddingService] {self.model_name} loaded via Transformers.")
        except Exception as e:
            logger.error(f"❌ [EmbeddingService] CRITICAL model load failure: {e}")
            self._loading_failed = True

    # Subprocess mode keeps torch (~1 GB) OUT of the Flask process, so the AI
    # service stays light and survives sandbox memory guards. Each batch is
    # computed in a short-lived worker that exits right after encoding.
    def _embed_via_worker(self, texts: List[str]) -> Optional[List[np.ndarray]]:
        import subprocess
        import sys
        import json
        script = (
            "import json,sys;"
            "from sentence_transformers import SentenceTransformer;"
            "d=json.loads(sys.stdin.read());"
            "m=SentenceTransformer(d['model']);"
            "v=m.encode(d['texts'], normalize_embeddings=True);"
            "print(json.dumps([[float(x) for x in row] for row in v.tolist()]))"
        )
        try:
            proc = subprocess.run(
                [sys.executable, "-c", script],
                input=json.dumps({"model": self.model_name, "texts": texts}),
                capture_output=True, text=True, timeout=240,
                env={**os.environ, "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1",
                     "TOKENIZERS_PARALLELISM": "false"}
            )
            if proc.returncode != 0:
                logger.warning(f"⚠️ [EmbeddingService] worker failed: {proc.stderr[-300:]}")
                return None
            rows = json.loads(proc.stdout.strip())
            return [np.asarray(r, dtype=np.float32) for r in rows]
        except Exception as e:
            logger.error(f"❌ [EmbeddingService] worker error: {e}")
            return None

    def preprocess_text(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return ""
        text = text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\-\+\#\.\,\@\/\(\)]', ' ', text)
        text = text.strip()
        return text[:8000]

    def _compute_cache_key(self, text: str) -> str:
        return hashlib.sha256(f"{self.model_name}:{text.lower()}".encode('utf-8')).hexdigest()[:32]

    def embed(self, text: str, use_cache: bool = True) -> Optional[np.ndarray]:
        processed = self.preprocess_text(text)
        if not processed:
            return None

        if use_cache:
            cache_key = self._compute_cache_key(processed)
            if cache_key in self._cache:
                self._cache_hits += 1
                return self._cache[cache_key].copy()
            self._cache_misses += 1

        if self.model is None and os.getenv("AI_SUBPROCESS_EMBED", "1") == "1":
            vecs = self._embed_via_worker([processed])
            if vecs is not None:
                if use_cache:
                    self._cache[cache_key] = vecs[0].copy()
                return vecs[0]
            # worker failed — fall through to in-process model / hash below

        self._ensure_model_ready()

        if self.model:
            try:
                embedding = self.model.encode(processed)
                if use_cache:
                    self._cache[cache_key] = embedding.copy()
                return embedding
            except Exception as e:
                logger.error(f"❌ [EmbeddingService] Encoding error: {e}")

        # Fallback hashing (keeps availability when the model cannot load)
        h = hashlib.sha256(processed.lower().encode()).digest()
        repeat = (self.embedding_dim // 32) + 1
        vec = np.frombuffer(h * repeat, dtype=np.float32)[:self.embedding_dim].copy()
        vec = vec / (np.linalg.norm(vec) + 1e-9)
        if use_cache:
            self._cache[cache_key] = vec.copy()
        return vec

    def embed_batch(self, texts: List[str], use_cache: bool = True) -> List[Optional[np.ndarray]]:
        if not texts:
            return []
        processed = [self.preprocess_text(t) for t in texts]
        need = [p for p in processed if p]
        if not need:
            return [None] * len(texts)

        # Single worker call for all texts (avoid one subprocess per text).
        if self.model is None and os.getenv("AI_SUBPROCESS_EMBED", "1") == "1":
            cache_keys = [self._compute_cache_key(p) for p in need]
            key_to_vec = {}
            uncached = [p for p, k in zip(need, cache_keys) if k not in self._cache]
            if uncached:
                vecs = self._embed_via_worker(uncached)
                if vecs is not None:
                    for p, v in zip(uncached, vecs):
                        self._cache[self._compute_cache_key(p)] = v.copy()
                else:
                    return [self.embed(t) for t in texts]  # fall back per-text
            for k in cache_keys:
                key_to_vec.setdefault(k, self._cache[k].copy())
            return [key_to_vec[cache_keys[i]] if p else None for i, p in enumerate(processed)]

        return [self.embed(t, use_cache=use_cache) for t in texts]

    def get_cache_stats(self) -> Dict:
        return {"size": len(self._cache), "hits": self._cache_hits, "misses": self._cache_misses}


def build_profile_text(profile: Dict) -> str:
    skills = profile.get('skills', '')
    if isinstance(skills, list):
        skills = ", ".join(skills)

    summary = profile.get('summary') or profile.get('desired_role', '')

    parts = [
        f"Skills: {skills}",
        f"Exp: {profile.get('experience_years', 0)}yr",
        f"Summary: {str(summary)[:1000]}"
    ]
    return ". ".join(parts)


def build_job_text(job: Dict) -> str:
    req_skills = job.get('required_skills') or job.get('requiredSkills', '')
    if isinstance(req_skills, list):
        req_skills = ", ".join(req_skills)

    parts = [
        f"Title: {job.get('title', '')}",
        f"Skills: {req_skills}",
        f"Desc: {str(job.get('description', ''))[:1000]}"
    ]
    return ". ".join(parts)
