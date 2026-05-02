"""
AI Services Module
==================
Core AI services for the Career Advisor system.

Modules:
- embedding_service: SBERT-based semantic embeddings
- classifier_service: Resume classification
- similarity_engine: Scoring and matching
- recommender_engine: Main recommendation pipeline
- career_path_analyzer: Career trajectory suggestions
- skill_gap_analyzer: Skill development recommendations
- explainability: Human-readable explanations
- resume_parser: Document parsing

Author: AI Career Advisor System
"""

from services.embedding_service import EmbeddingService, build_profile_text, build_job_text
from services.classifier_service import ClassifierService
from services.recommender_engine import RecommenderEngine
from services.career_path_analyzer import CareerPathAnalyzer
from services.skill_gap_analyzer import SkillGapAnalyzer
from services.explainability import ExplainabilityModule
from services.resume_parser import parse_resume_file

__all__ = [
    'EmbeddingService',
    'ClassifierService', 
    'RecommenderEngine',
    'CareerPathAnalyzer',
    'SkillGapAnalyzer',
    'ExplainabilityModule',
    'parse_resume_file',
    'build_profile_text',
    'build_job_text'
]
