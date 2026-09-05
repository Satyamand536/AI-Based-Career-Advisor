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

IMPORTANT: This package must stay import-light. Heavy dependencies
(torch / sentence-transformers) are only imported inside the service
modules when they are actually used, so the Flask process boots small.
Do not add eager imports here.
"""

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
