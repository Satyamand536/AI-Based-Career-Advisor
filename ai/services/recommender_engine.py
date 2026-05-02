"""
Recommendation Engine - Core Orchestration Module
===================================================
Orchestrates all AI services to produce comprehensive job recommendations
with explanations, career paths, and skill gap analysis.

This is the main entry point for the recommendation pipeline.

Architecture:
- EmbeddingService: Semantic embeddings
- ClassifierService: Profile classification
- SimilarityEngine: Scoring and matching
- CareerPathAnalyzer: Career trajectory suggestions
- SkillGapAnalyzer: Skill development recommendations
- ExplainabilityModule: Human-readable explanations

Author: AI Career Advisor System
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
import logging
import time

from services.embedding_service import EmbeddingService, build_profile_text, build_job_text
from services.classifier_service import ClassifierService
from services.similarity_engine import (
    compute_batch_similarities,
    filter_jobs_by_threshold,
    rank_and_sort
)
from services.career_path_analyzer import CareerPathAnalyzer
from services.skill_gap_analyzer import SkillGapAnalyzer
from services.explainability import ExplainabilityModule
from services.llm_service import LLMService

logger = logging.getLogger(__name__)


class RecommenderEngine:
    """
    Production-grade Job Recommendation Engine.
    
    Implements a multi-stage pipeline:
    1. Profile Classification - Determine job category fit
    2. Job Filtering - Remove irrelevant candidates
    3. Semantic Scoring - Compute similarity scores
    4. Ranking & Selection - Select top recommendations
    5. Career Path Analysis - Suggest progression paths
    6. Skill Gap Analysis - Identify development areas
    7. Explainability - Generate human-readable explanations
    """
    
    CONFIG = {
        "min_semantic_threshold": 0.20,  # LOWERED: To better support hybrid MERN+AI roles
        "min_final_score_threshold": 0.20, # LOWERED: To prevent valid jobs from being filtered
        "non_technical_block": False,    # DISABLED: Caused Data Scientist resumes to be blocked
        "low_confidence_threshold": 0.15,
        "default_top_k": 20,
        "enable_career_paths": True,
        "enable_skill_gaps": True,
        "max_career_paths": 3
    }
    
    def __init__(
        self,
        embedding_service: Optional[EmbeddingService] = None,
        classifier_service: Optional[ClassifierService] = None,
        llm_service: Optional[LLMService] = None
    ):
        """
        Initialize the recommendation engine with all required services.
        
        Args:
            embedding_service: Optional pre-initialized EmbeddingService
            classifier_service: Optional pre-initialized ClassifierService
        """
        logger.info("🚀 [RecommenderEngine] Initializing recommendation engine...")
        start_time = time.time()
        
        self.embedding_service = embedding_service or EmbeddingService()
        self.classifier_service = classifier_service or ClassifierService(self.embedding_service)
        self.career_path_analyzer = CareerPathAnalyzer()
        self.skill_gap_analyzer = SkillGapAnalyzer()
        self.explainability = ExplainabilityModule(llm_service=None) # DECOUPLED: No LLM for recommendations
        
        self._job_embedding_cache: Dict[str, np.ndarray] = {}
        
        init_time = time.time() - start_time
        logger.info(f"✅ [RecommenderEngine] Initialized in {init_time:.2f}s")
    
    def _get_profile_skills(self, profile: Dict) -> Set[str]:
        """Extract and normalize skills from profile."""
        skills = profile.get("skills", [])
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",")]
        return {s.lower().strip() for s in skills if s}
    
    def _prepare_job_embeddings(self, jobs: List[Dict]) -> np.ndarray:
        """
        Generate embeddings for jobs with caching.
        
        Args:
            jobs: List of job dictionaries
            
        Returns:
            numpy array of shape (n_jobs, embedding_dim)
        """
        job_texts = []
        cache_indices = []
        compute_indices = []
        
        for i, job in enumerate(jobs):
            job_id = job.get("jobId", job.get("_id", str(i)))
            
            if job_id in self._job_embedding_cache:
                cache_indices.append((i, job_id))
            else:
                job_text = build_job_text(job)
                job_texts.append((i, job_id, job_text))
                compute_indices.append(i)
        
        embeddings = [None] * len(jobs)
        
        for idx, job_id in cache_indices:
            embeddings[idx] = self._job_embedding_cache[job_id]
        
        if job_texts:
            texts_only = [t[2] for t in job_texts]
            computed = self.embedding_service.embed_batch(texts_only)
            
            for (idx, job_id, _), embedding in zip(job_texts, computed):
                if embedding is not None:
                    embeddings[idx] = embedding
                    self._job_embedding_cache[job_id] = embedding
                else:
                    embeddings[idx] = np.zeros(self.embedding_service.embedding_dim)
        
        valid_embeddings = [e for e in embeddings if e is not None]
        if not valid_embeddings:
            return np.array([])
        
        return np.array([e if e is not None else np.zeros(self.embedding_service.embedding_dim) 
                        for e in embeddings])
    
    def recommend(
        self,
        profile: Dict,
        jobs: List[Dict],
        top_k: int = 20,
        include_career_paths: bool = True,
        include_skill_gaps: bool = True,
        use_llm_ranking: bool = False,  # DEFAULT DISABLED for speed
        target_category: Optional[str] = None,
        profile_embedding: Optional[List[float]] = None
    ) -> Dict:
        """
        Generate comprehensive job recommendations.
        
        This is the main entry point for the recommendation pipeline.
        
        Args:
            profile: User profile dictionary with skills, experience, etc.
            jobs: List of available job dictionaries
            top_k: Number of top recommendations to return
            include_career_paths: Whether to include career path suggestions
            include_skill_gaps: Whether to include skill gap analysis
            target_category: Optional target category for career paths
            profile_embedding: Optional pre-computed embedding
            
        Returns:
            Comprehensive recommendation response dictionary
        """
        start_time = time.time()
        logger.info(f"🎯 [RecommenderEngine] Starting recommendation for profile: {profile.get('name', 'Unknown')}")
        
        if not jobs:
            return self._empty_response("No jobs available for matching")
        
        profile_text = build_profile_text(profile)
        if not profile_text or len(profile_text.strip()) < 20:
            return self._empty_response("Profile has insufficient content for semantic matching. Please add more skills or experience.")
        
        profile_skills = self._get_profile_skills(profile)
        experience_years = profile.get("experience_years", 0)
        
        logger.info("🔍 [Stage 1] Classifying profile...")
        category_probs, confidence, is_technical = self.classifier_service.predict_with_confidence(profile_text)
        
        if self.CONFIG["non_technical_block"] and not is_technical:
            logger.info("⛔ [RecommenderEngine] Non-technical profile detected")
            return self._empty_response(
                "Our AI has identified your expertise in professional non-technical domains. At this time, our recommendation engine is exclusively optimized for technical engineering and developer roles to ensure the highest degree of matching precision.",
                category_probs=category_probs,
                is_non_tech=True
            )
        
        top_category = list(category_probs.keys())[0]
        top_prob = category_probs[top_category]
        
        logger.info(f"📊 [Stage 1] Top category: {top_category} ({top_prob:.2%})")
        
        logger.info("🔗 [Stage 2] Retrieving embeddings...")
        
        # Use pre-computed embedding if available, otherwise generate
        if profile_embedding is not None:
             computed_embedding = np.array(profile_embedding) 
        else:
             computed_embedding = self.embedding_service.embed(profile_text)
             
        if computed_embedding is None:
            return self._empty_response("Failed to generate profile embedding")
        
        job_embeddings = self._prepare_job_embeddings(jobs)
        if len(job_embeddings) == 0:
            return self._empty_response("Failed to generate job embeddings")
        
        logger.info("📈 [Stage 3] Computing similarity scores...")
        scores = compute_batch_similarities(
            profile_embedding=computed_embedding,
            job_embeddings=job_embeddings,
            profile_skills=profile_skills,
            jobs=jobs,
            category_probs=category_probs,
            profile_experience=experience_years
        )
        
        filtered_jobs, filtered_scores = filter_jobs_by_threshold(
            jobs=jobs,
            scores=scores,
            min_semantic=self.CONFIG["min_semantic_threshold"],
            min_final=self.CONFIG["min_final_score_threshold"]
        )
        
        logger.info(f"📊 [Stage 4] After filtering: {len(filtered_jobs)} / {len(jobs)} jobs passed thresholds")
        if not filtered_jobs and scores:
            max_semantic = max(s["raw_semantic"] for s in scores)
            max_final = max(s["final_score"] for s in scores)
            logger.warning(f"⚠️ [RecommenderEngine] No jobs passed! Max Semantic: {max_semantic:.4f}, Max Final: {max_final:.4f}")
        
        ranked_results = rank_and_sort(filtered_jobs, filtered_scores, top_k)
        logger.info(f"✅ [Stage 4] Ranked {len(ranked_results)} jobs")
        
        career_paths = []
        if include_career_paths and self.CONFIG["enable_career_paths"]:
            logger.info("🛤️ [Stage 5] Analyzing career paths...")
            career_paths = self.career_path_analyzer.get_career_paths(
                current_category=top_category,
                experience_years=experience_years,
                profile_skills=list(profile_skills),
                target_category=target_category,
                max_paths=self.CONFIG["max_career_paths"]
            )
            
            job_scores_dict = {
                job.get("jobId", job.get("_id", "")): score["final_score"]
                for job, score in ranked_results
            }
            career_paths = self.career_path_analyzer.map_jobs_to_paths(
                paths=career_paths,
                jobs=[job for job, _ in ranked_results],
                job_scores=job_scores_dict
            )
        
        skill_gaps = {"top_gaps": [], "summary": {}}
        if include_skill_gaps and self.CONFIG["enable_skill_gaps"]:
            logger.info("📊 [Stage 6] Analyzing skill gaps...")
            skill_gaps = self.skill_gap_analyzer.analyze_skill_gaps(
                profile_skills=list(profile_skills),
                jobs_with_scores=ranked_results
            )
        
        logger.info("📝 [Stage 7] Generating explanations...")
        top_categories = self.classifier_service.get_top_categories(profile_text, n=3)
        
        profile_summary = self.explainability.generate_profile_summary(
            top_categories=top_categories,
            experience_years=experience_years,
            skills_count=len(profile_skills),
            total_matches=len(ranked_results),
            career_paths=career_paths
        )
        
        # DISCONNECTED: Strictly use fast statistical/template explanations
        logger.info("⚡ [Stage 8] Generating fast template-based explanations")
        response = self.explainability.format_recommendation_response(
            jobs_with_scores=ranked_results,
            profile_summary=profile_summary,
            skill_gaps=skill_gaps.get("top_gaps", []),
            career_paths=career_paths,
            category_probs=category_probs,
            profile_skills=list(profile_skills)
        )
        
        elapsed_time = time.time() - start_time
        response["meta"]["processing_time_ms"] = round(elapsed_time * 1000, 2)
        response["meta"]["cache_stats"] = self.embedding_service.get_cache_stats()
        
        logger.info(f"✅ [RecommenderEngine] Completed in {elapsed_time:.2f}s with {len(ranked_results)} recommendations")
        
        return response
    
    def rank_jobs(
        self,
        profile: Dict,
        jobs: List[Dict],
        top_k: int = 20
    ) -> List[Dict]:
        """
        Legacy compatibility method - returns flat list of ranked jobs.
        
        This method maintains backward compatibility with the existing API.
        For new implementations, use recommend() instead.
        
        Args:
            profile: User profile dictionary
            jobs: List of job dictionaries
            top_k: Number of top recommendations
            
        Returns:
            List of job dictionaries with match scores
        """
        result = self.recommend(
            profile=profile,
            jobs=jobs,
            top_k=top_k,
            include_career_paths=False,
            include_skill_gaps=False
        )
        
        recommendations = result.get("recommendations", [])
        
        legacy_format = []
        for rec in recommendations:
            job_data = {k: v for k, v in rec.items() if k not in ["explanation"]}
            
            explanation = rec.get("explanation", {})
            skill_info = explanation.get("skills", {})
            
            job_data["matchScore"] = rec.get("matchScore", 0)
            job_data["matched_skills"] = skill_info.get("matched", [])
            job_data["missing_skills"] = skill_info.get("missing", [])[:5]
            job_data["reason"] = explanation.get("summary", "")
            
            legacy_format.append(job_data)
        
        return legacy_format
    
    def _empty_response(
        self,
        reason: str,
        category_probs: Optional[Dict] = None,
        is_non_tech: bool = False
    ) -> Dict:
        """Generate an empty response with explanation."""
        return {
            "success": True,
            "recommendations": [],
            "profileSummary": {
                "headline": "Technical Focus Refinement" if is_non_tech else "No Matches Found",
                "reason": reason,
                "confidence": "high" if is_non_tech else "low"
            },
            "skillGaps": [],
            "careerPaths": [],
            "meta": {
                "total_recommendations": 0,
                "reason": reason,
                "category_probabilities": category_probs or {},
                "is_non_tech": is_non_tech
            }
        }
    
    def get_service_status(self) -> Dict:
        """Get status of all services."""
        return {
            "embedding_service": {
                "model": self.embedding_service.model_name,
                "embedding_dim": self.embedding_service.embedding_dim,
                "cache_stats": self.embedding_service.get_cache_stats()
            },
            "classifier_service": {
                "categories": len(self.classifier_service.category_names),
                "technical_categories": len(self.classifier_service.get_technical_categories())
            },
            "job_cache_size": len(self._job_embedding_cache)
        }
    
    def clear_caches(self):
        """Clear all caches."""
        self.embedding_service.clear_cache()
        self._job_embedding_cache.clear()
        logger.info("🗑️ [RecommenderEngine] All caches cleared")
