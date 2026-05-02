"""
Similarity Engine - Scoring & Matching Module (v2 - Domain-Aware)
=================================================================
Provides pure, stateless functions for computing similarity scores
between profiles and jobs using cosine similarity and multi-component scoring.

KEY FIX (v2):
- Added domain-aware pre-filtering: classifies profile into tech domains,
  then penalizes jobs from mismatched domains (e.g. MERN dev won't get blockchain jobs)
- Category boosting now works even when job.category field is missing
- Hybrid scoring: semantic + domain_match + skill_overlap + seniority

Author: AI Career Advisor System
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Set
from sklearn.metrics.pairwise import cosine_similarity
import logging
import re

logger = logging.getLogger(__name__)


SENIORITY_LEVELS = ["Intern", "Junior", "Mid", "Senior", "Lead", "Principal", "Director"]

# ===================================================================
# DOMAIN KEYWORD MAP (v2 - Root Cause Fix)
# Maps classifier categories → keywords that appear in job titles/text
# This fixes the bug where category_prob was always 0.0
# ===================================================================
DOMAIN_KEYWORD_MAP = {
    "Software Developer": [
        "react", "node", "javascript", "python", "java", "fullstack",
        "full stack", "full-stack", "mern", "mean", "frontend", "backend",
        "web developer", "software engineer", "software developer", "flask",
        "django", "express", "php", "angular", "vue", "next.js", "next js",
        "typescript", "application developer", "web engineer", "rest api",
        ".net", "spring", "nestjs"
    ],
    "Data & AI Engineer": [
        "data scientist", "data engineer", "machine learning", "ml engineer",
        "ai engineer", "deep learning", "nlp", "data analyst", "analytics",
        "tensorflow", "pytorch", "pandas", "numpy", "llm", "computer vision",
        "bi engineer", "data platform", "statistical"
    ],
    "Cloud & Systems": [
        "devops", "cloud", "aws", "azure", "gcp", "kubernetes", "docker",
        "infrastructure", "platform engineer", "site reliability", "sre",
        "terraform", "ci/cd", "devsecops", "systems engineer", "network engineer"
    ],
    "Blockchain Developer": [
        "blockchain", "solidity", "smart contract", "web3", "defi", "nft",
        "ethereum", "crypto", "dapp", "decentralized", "protocol"
    ],
    "Data & AI Engineer": [
        "data scientist", "data engineer", "machine learning", "ai", "deep learning"
    ],
    "QA Engineer": [
        "qa", "test automation", "quality assurance", "sdet", "selenium",
        "cypress", "playwright", "performance testing", "test engineer"
    ],
    "UI/UX Designer": [
        "ui designer", "ux designer", "product designer", "figma", "sketch",
        "interaction designer", "design system", "ux researcher"
    ],
    "IoT & Embedded": [
        "iot", "embedded", "firmware", "robotics", "microcontroller", "rtos",
        "arduino", "raspberry", "edge computing"
    ],
    "Emerging Tech": [
        "prompt engineer", "devrel", "developer advocate", "sdk", "simulation"
    ]
}

# Penalty applied to jobs from mismatched domains
DOMAIN_MISMATCH_PENALTY = 0.55
# Boost applied to jobs from matched domains
DOMAIN_MATCH_BOOST = 1.15


def infer_job_domain(job: Dict) -> str:
    """
    Infer the tech domain of a job by scanning its title, category, and skills.
    Returns the best-matching category name from DOMAIN_KEYWORD_MAP.
    """
    searchable = " ".join([
        job.get("title", ""),
        job.get("category", ""),
        job.get("description", ""),
        " ".join(job.get("requiredSkills", [])),
        " ".join(job.get("skills", []))
    ]).lower()

    best_category = None
    best_count = 0

    for category, keywords in DOMAIN_KEYWORD_MAP.items():
        count = sum(1 for kw in keywords if kw in searchable)
        if count > best_count:
            best_count = count
            best_category = category

    return best_category if best_count > 0 else "Software Developer"  # default


def compute_domain_match_score(profile_category: str, job: Dict) -> float:
    """
    Compute a domain match score (0.0 to 1.0) between profile's top category
    and the inferred job domain. This is the fix for cross-domain recommendations.

    Returns:
        1.0 - perfect match (e.g., Software Developer ↔ fullstack job)
        0.5 - adjacent match (e.g., Software Developer ↔ QA job)
        0.15 - mismatch (e.g., MERN dev ↔ blockchain job)
    """
    job_domain = infer_job_domain(job)

    if not profile_category or not job_domain:
        return 0.7  # neutral

    if profile_category == job_domain:
        return 1.0

    # Adjacent domains (acceptable cross-matches)
    ADJACENT_MAP = {
        "Software Developer": {"QA Engineer", "UI/UX Designer", "Emerging Tech"},
        "Cloud & Systems": {"Software Developer", "QA Engineer"},
        "Data & AI Engineer": {"Software Developer", "Emerging Tech"},
        "QA Engineer": {"Software Developer", "Cloud & Systems"},
        "UI/UX Designer": {"Software Developer", "Emerging Tech"},
    }

    adjacent = ADJACENT_MAP.get(profile_category, set())
    if job_domain in adjacent:
        return 0.5

    # Hard mismatch: blockchain for MERN dev, etc.
    return 0.15


def compute_cosine_similarity(
    profile_embedding: np.ndarray,
    job_embeddings: np.ndarray
) -> np.ndarray:
    """
    Compute cosine similarity between profile and job embeddings.

    Args:
        profile_embedding: Shape (embedding_dim,) - user profile embedding
        job_embeddings: Shape (n_jobs, embedding_dim) - job embeddings

    Returns:
        Array of shape (n_jobs,) with similarity scores in range [-1, 1]
    """
    if profile_embedding is None or job_embeddings is None:
        return np.array([])

    if len(job_embeddings.shape) == 1:
        job_embeddings = job_embeddings.reshape(1, -1)

    profile_2d = profile_embedding.reshape(1, -1)
    similarities = cosine_similarity(profile_2d, job_embeddings)[0]

    return similarities


def compute_skill_overlap(
    profile_skills: Set[str],
    required_skills: List[str],
    nice_to_have_skills: Optional[List[str]] = None
) -> Dict[str, any]:
    """
    Analyze skill overlap between profile and job requirements.

    Args:
        profile_skills: Set of skills from user profile (lowercase)
        required_skills: List of required skills for the job
        nice_to_have_skills: Optional list of nice-to-have skills

    Returns:
        Dictionary containing matched/missing skills and coverage ratios
    """
    SKILL_ALIASES = {
        "js": "javascript",
        "py": "python",
        "reactjs": "react",
        "react.js": "react",
        "node": "node.js",
        "nodejs": "node.js",
        "golang": "go",
        "aws": "amazon web services",
        "k8s": "kubernetes",
        "docker-compose": "docker",
        "postgresql": "postgres",
        "mongodb": "mongo",
        "tf": "terraform",
        "html5": "html",
        "css3": "css",
        "ts": "typescript",
        "nextjs": "next.js",
        "vuejs": "vue",
        "ai": "artificial intelligence",
        "ml": "machine learning",
        "dl": "deep learning",
        "nlp": "natural language processing"
    }

    def normalize(s: str) -> str:
        s = s.lower().strip().replace("-", "").replace(" ", "")
        return SKILL_ALIASES.get(s, s)

    profile_lower = {normalize(s) for s in profile_skills if s}

    matched_required = []
    for rs in required_skills:
        if normalize(rs) in profile_lower:
            matched_required.append(rs)

    missing_required = [rs for rs in required_skills if normalize(rs) not in profile_lower]

    matched_nice_to_have = []
    if nice_to_have_skills:
        for ns in nice_to_have_skills:
            if normalize(ns) in profile_lower:
                matched_nice_to_have.append(ns)

    required_coverage = len(matched_required) / len(required_skills) if required_skills else 0.0

    total_skills = len(required_skills) + len(nice_to_have_skills or [])
    total_matched = len(matched_required) + len(matched_nice_to_have)
    total_coverage = total_matched / total_skills if total_skills > 0 else 0.0

    return {
        "matched_required": matched_required,
        "missing_required": missing_required,
        "matched_nice_to_have": matched_nice_to_have,
        "required_coverage": required_coverage,
        "total_coverage": total_coverage
    }


def infer_seniority_from_experience(years: int) -> str:
    if years <= 0:
        return "Intern"
    elif years <= 2:
        return "Junior"
    elif years <= 5:
        return "Mid"
    elif years <= 8:
        return "Senior"
    elif years <= 12:
        return "Lead"
    else:
        return "Principal"


def get_seniority_index(level: str) -> int:
    level_lower = level.lower().strip()
    for i, s in enumerate(SENIORITY_LEVELS):
        if s.lower() == level_lower or level_lower.startswith(s.lower()):
            return i
    return 2


def compute_seniority_match(
    profile_experience_years: int,
    job_experience_required: int,
    job_seniority: Optional[str] = None
) -> float:
    profile_level = infer_seniority_from_experience(profile_experience_years)

    if job_seniority:
        job_level = job_seniority
    else:
        job_level = infer_seniority_from_experience(job_experience_required)

    profile_idx = get_seniority_index(profile_level)
    job_idx = get_seniority_index(job_level)

    diff = job_idx - profile_idx

    if diff == 0:
        return 1.0
    elif diff == 1:
        return 0.85
    elif diff == -1:
        return 0.7
    elif diff == 2:
        return 0.5
    elif diff == -2:
        return 0.4
    else:
        return 0.2


def compute_match_score(
    semantic_similarity: float,
    domain_match: float,
    skill_coverage: float,
    seniority_match: float,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, float]:
    """
    Compute the final match score using multi-component weighted scoring.

    FinalScore = 0.50 * semantic
               + 0.25 * domain_match   ← KEY FIX: replaces category_prob (was always 0)
               + 0.18 * skills
               + 0.07 * seniority

    Domain match is the primary guard against cross-domain recommendations.
    A MERN resume will score ~0.15 on blockchain jobs, killing them from results.
    """
    default_weights = {
        "semantic": 0.50,    # Semantic embedding similarity
        "domain":   0.25,    # Domain match (KEY: replaces broken category_prob)
        "skills":   0.18,    # Skill overlap ratio
        "seniority": 0.07    # Experience match
    }
    w = weights or default_weights

    # Non-linear transforms for better discrimination
    semantic_component = semantic_similarity ** 1.3   # Less punishing than 1.5

    domain_component = domain_match                   # Linear: 1.0, 0.5, or 0.15

    # Boost skill coverage for strong matches
    skill_component = 0.6 * skill_coverage + 0.4 * max(skill_coverage - 0.3, 0) * 2
    skill_component = min(1.0, skill_component)

    seniority_component = seniority_match

    base_score = (
        w["semantic"] * semantic_component +
        w["domain"]   * domain_component +
        w["skills"]   * skill_component +
        w["seniority"] * seniority_component
    )

    # Bonus for high-confidence matches (semantic + skills both strong)
    if semantic_similarity >= 0.55 and skill_coverage >= 0.4 and domain_match >= 0.8:
        base_score = min(1.0, base_score * 1.12)

    # Hard kill: if domain mismatch is severe, cap score
    if domain_match <= 0.15:
        base_score = min(base_score, 0.28)  # Won't appear in top results

    final_score = max(0.0, min(1.0, base_score))

    return {
        "semantic_component": round(semantic_component, 4),
        "domain_component": round(domain_component, 4),
        "skill_component": round(skill_component, 4),
        "seniority_component": round(seniority_component, 4),
        "final_score": round(final_score, 4),
        "raw_semantic": round(semantic_similarity, 4),
        "raw_skill_coverage": round(skill_coverage, 4),
        "domain_match": round(domain_match, 4),
        # Legacy key for backward compat
        "category_component": round(domain_component, 4)
    }


def filter_jobs_by_threshold(
    jobs: List[Dict],
    scores: List[Dict],
    min_semantic: float = 0.15,
    min_final: float = 0.10
) -> Tuple[List[Dict], List[Dict]]:
    """
    Filter jobs that don't meet minimum quality thresholds.
    """
    filtered_jobs = []
    filtered_scores = []

    for job, score in zip(jobs, scores):
        if score["raw_semantic"] >= min_semantic and score["final_score"] >= min_final:
            filtered_jobs.append(job)
            filtered_scores.append(score)

    return filtered_jobs, filtered_scores


def rank_and_sort(
    jobs: List[Dict],
    scores: List[Dict],
    top_k: Optional[int] = None
) -> List[Tuple[Dict, Dict]]:
    """
    Rank jobs by score and return top K.
    """
    paired = list(zip(jobs, scores))
    paired.sort(key=lambda x: x[1]["final_score"], reverse=True)

    if top_k:
        paired = paired[:top_k]

    return paired


def compute_batch_similarities(
    profile_embedding: np.ndarray,
    job_embeddings: np.ndarray,
    profile_skills: Set[str],
    jobs: List[Dict],
    category_probs: Dict[str, float],
    profile_experience: int
) -> List[Dict]:
    """
    Compute all similarity and match scores for a batch of jobs.

    v2 FIX: Uses domain_match instead of the broken category_prob lookup.
    The profile's top category is used to penalize jobs from mismatched domains.
    """
    if profile_embedding is None or len(jobs) == 0:
        return []

    semantic_sims = compute_cosine_similarity(profile_embedding, job_embeddings)

    # Get profile's primary category for domain matching
    profile_category = list(category_probs.keys())[0] if category_probs else "Software Developer"

    scores = []
    for i, job in enumerate(jobs):
        semantic_sim = float(semantic_sims[i]) if i < len(semantic_sims) else 0.0

        skill_result = compute_skill_overlap(
            profile_skills,
            job.get("requiredSkills", []),
            job.get("niceToHaveSkills", [])
        )

        # v2: Use domain_match instead of category_prob (root cause fix)
        domain_match = compute_domain_match_score(profile_category, job)

        seniority_match = compute_seniority_match(
            profile_experience,
            job.get("experience_required", 0),
            job.get("seniority")
        )

        match_scores = compute_match_score(
            semantic_similarity=semantic_sim,
            domain_match=domain_match,
            skill_coverage=skill_result["required_coverage"],
            seniority_match=seniority_match
        )

        match_scores["skill_analysis"] = skill_result
        match_scores["seniority_match_raw"] = seniority_match

        scores.append(match_scores)

    return scores
