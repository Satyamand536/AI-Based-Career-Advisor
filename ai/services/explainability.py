"""
Explainability Module - AI Decision Transparency
=================================================
Provides human-readable explanations for why jobs are recommended,
skill gap analysis, and career path reasoning.

Features:
- Per-job explanation generation
- Skill gap explanations with actionable recommendations
- Score breakdown visualization
- Profile summary generation

Author: AI Career Advisor System
"""

from typing import Dict, List, Optional, Tuple
import logging
from services.embedding_service import build_profile_text, build_job_text

logger = logging.getLogger(__name__)


class ExplainabilityModule:
    """
    Generates human-readable explanations for AI recommendations.
    
    Transforms raw scores and analysis into understandable insights
    that help users understand why certain jobs were recommended.
    """
    
    SCORE_THRESHOLDS = {
        "excellent": 0.75,
        "good": 0.55,
        "moderate": 0.35,
        "low": 0.0
    }
    
    SKILL_ACTION_TEMPLATES = {
        "python": {
            "courses": ["Complete Python for Data Science on Coursera", "Practice on LeetCode/HackerRank"],
            "projects": ["Build a data analysis project", "Create a REST API with Flask/FastAPI"]
        },
        "javascript": {
            "courses": ["JavaScript: Understanding the Weird Parts", "Modern JavaScript ES6+ course"],
            "projects": ["Build a React/Vue application", "Create a Node.js backend"]
        },
        "react": {
            "courses": ["React - The Complete Guide", "React patterns and best practices"],
            "projects": ["Build a full-stack app with React", "Contribute to open-source React projects"]
        },
        "aws": {
            "courses": ["AWS Certified Solutions Architect", "A Cloud Guru AWS courses"],
            "projects": ["Deploy an application on AWS", "Set up CI/CD with AWS services"]
        },
        "docker": {
            "courses": ["Docker and Kubernetes: The Complete Guide", "Docker Deep Dive"],
            "projects": ["Containerize an existing application", "Create a multi-container setup"]
        },
        "kubernetes": {
            "courses": ["Kubernetes for Developers", "CKA/CKAD certification prep"],
            "projects": ["Deploy microservices on K8s", "Set up a local Kubernetes cluster"]
        },
        "sql": {
            "courses": ["The Complete SQL Bootcamp", "Database design fundamentals"],
            "projects": ["Optimize complex queries", "Design a normalized database schema"]
        },
        "machine learning": {
            "courses": ["Machine Learning by Andrew Ng", "Hands-On ML with Scikit-Learn"],
            "projects": ["Build an end-to-end ML pipeline", "Kaggle competitions"]
        },
        "default": {
            "courses": ["Find relevant courses on Coursera/Udemy", "Read official documentation"],
            "projects": ["Build portfolio projects using this skill", "Contribute to open-source"]
        }
    }
    
    def __init__(self, llm_service=None):
        """
        Initialize the explainability module.
        
        Args:
            llm_service: Optional LLMService for dynamic explanations
        """
        self.llm_service = llm_service
        self.logger = logger # Added to make self.logger available
        self.logger.info("🔍 [ExplainabilityModule] Initialized (Mode: Template-Based Fast Mode)")
    
    def _get_score_level(self, score: float) -> str:
        """Convert numeric score to qualitative level."""
        if score >= self.SCORE_THRESHOLDS["excellent"]:
            return "excellent"
        elif score >= self.SCORE_THRESHOLDS["good"]:
            return "good"
        elif score >= self.SCORE_THRESHOLDS["moderate"]:
            return "moderate"
        else:
            return "low"
    
    def _get_score_emoji(self, level: str) -> str:
        """Get emoji representation for score level."""
        emoji_map = {
            "excellent": "🌟",
            "good": "✅",
            "moderate": "📊",
            "low": "📈"
        }
        return emoji_map.get(level, "📊")
    
    def explain_job_match(
        self,
        job: Dict,
        scores: Dict,
        category_probs: Dict[str, float],
        profile_skills: List[str],
        is_in_career_path: bool = False,
        career_step: Optional[str] = None,
        use_ai: bool = False
    ) -> Dict:
        """
        Generate comprehensive explanation for a job recommendation.
        
        Args:
            job: Job dictionary
            scores: Scores dictionary from similarity engine
            category_probs: Category probability distribution
            profile_skills: List of profile skills
            is_in_career_path: Whether this job is in a suggested career path
            career_step: Career path step label if applicable
            use_ai: Whether to use LLM for generating explanation
            
        Returns:
            Explanation dictionary with human-readable content
        """
        final_score = scores.get("final_score", 0)
        semantic_score = scores.get("raw_semantic", 0)
        skill_analysis = scores.get("skill_analysis", {})
        
        score_level = self._get_score_level(final_score)
        emoji = self._get_score_emoji(score_level)
        
        job_category = job.get("category", "")
        category_prob = category_probs.get(job_category, 0)
        
        matched_skills = skill_analysis.get("matched_required", [])
        missing_skills = skill_analysis.get("missing_required", [])
        skill_coverage = skill_analysis.get("required_coverage", 0)
        
        primary_reasons = []
        
        if semantic_score >= 0.5:
            primary_reasons.append(
                f"Your experience strongly aligns with this {job_category} role"
            )
        elif semantic_score >= 0.3:
            primary_reasons.append(
                f"Good semantic match with {job_category} role requirements"
            )
        
        if skill_coverage >= 0.7:
            primary_reasons.append(
                f"You have {int(skill_coverage * 100)}% of the required skills"
            )
        elif skill_coverage >= 0.4:
            primary_reasons.append(
                f"Partial skill match ({int(skill_coverage * 100)}%) with growth potential"
            )
        
        if category_prob >= 0.3:
            primary_reasons.append(
                f"Your profile fits the {job_category} category ({int(category_prob * 100)}% confidence)"
            )
        
        if is_in_career_path:
            primary_reasons.append(
                f"This role is part of your recommended career progression"
            )
        
        if score_level == "excellent":
            summary = f"{emoji} Excellent match! This role closely aligns with your skills and experience."
        elif score_level == "good":
            summary = f"{emoji} Good match. You have the core qualifications for this position."
        elif score_level == "moderate":
            summary = f"{emoji} Moderate match. This could be a growth opportunity with some upskilling."
        else:
            summary = f"{emoji} Developing match. Consider this as a stretch goal or learning opportunity."
            
        # DYNAMIC AI SUMMARY (Top 0.1% feature)
        # Only query LLM if explicitly requested and score is decent
        if use_ai and self.llm_service and final_score >= 0.3:
            try:
                profile_text = build_profile_text({"skills": profile_skills})
                job_text = build_job_text(job)
                ai_summary = self.llm_service.generate_job_explanation(profile_text, job_text)
                if ai_summary and "Sorry" not in ai_summary:
                    summary = ai_summary
            except Exception as e:
                logger.warning(f"⚠️ [ExplainabilityModule] AI summary failed: {e}")
        
        improvement_suggestions = []
        if missing_skills:
            top_missing = missing_skills[:3]
            improvement_suggestions.append(
                f"Focus on developing: {', '.join(top_missing)}"
            )
        
        score_breakdown = {
            "semantic_similarity": {
                "score": round(semantic_score * 100, 1),
                "label": "Content Match",
                "description": "How well your profile content matches the job description"
            },
            "skill_match": {
                "score": round(skill_coverage * 100, 1),
                "label": "Skill Coverage",
                "description": f"You have {len(matched_skills)} of {len(matched_skills) + len(missing_skills)} required skills"
            },
            "category_fit": {
                "score": round(category_prob * 100, 1),
                "label": "Category Alignment",
                "description": f"Alignment with {job_category} role type"
            },
            "overall": {
                "score": round(final_score * 100, 1),
                "label": "Overall Match",
                "level": score_level
            }
        }
        
        return {
            "summary": summary,
            "score_level": score_level,
            "primary_reasons": primary_reasons,
            "score_breakdown": score_breakdown,
            "skills": {
                "matched": matched_skills,
                "missing": missing_skills[:10],
                "coverage_percent": round(skill_coverage * 100, 1)
            },
            "improvement_suggestions": improvement_suggestions,
            "career_path": {
                "is_in_path": is_in_career_path,
                "step": career_step
            }
        }
    
    def explain_skill_gap(
        self,
        skill: str,
        priority: str,
        occurrences: int,
        target_roles: List[str]
    ) -> Dict:
        """
        Generate actionable explanation for a skill gap.
        
        Args:
            skill: The missing skill
            priority: Priority level (high/medium/low)
            occurrences: Number of jobs requiring this skill
            target_roles: Target role categories
            
        Returns:
            Skill gap explanation with learning recommendations
        """
        skill_lower = skill.lower().strip()
        
        if skill_lower in self.SKILL_ACTION_TEMPLATES:
            actions = self.SKILL_ACTION_TEMPLATES[skill_lower]
        else:
            actions = self.SKILL_ACTION_TEMPLATES["default"]
        
        if priority == "high":
            priority_text = "🔴 High Priority"
            timeframe = "Focus on this skill first (1-2 months)"
        elif priority == "medium":
            priority_text = "🟡 Medium Priority"
            timeframe = "Add this to your learning roadmap (2-3 months)"
        else:
            priority_text = "🟢 Nice to Have"
            timeframe = "Consider learning when you have time"
        
        roles_text = ", ".join(target_roles[:3]) if target_roles else "your target roles"
        reason = f"This skill appears in {occurrences} {roles_text} positions you're interested in."
        
        return {
            "skill": skill,
            "priority": priority,
            "priority_label": priority_text,
            "reason": reason,
            "timeframe": timeframe,
            "learning_path": {
                "recommended_courses": actions["courses"],
                "project_ideas": actions["projects"]
            },
            "tip": f"Add {skill} to your resume once you've completed a relevant project."
        }
    
    def generate_profile_summary(
        self,
        top_categories: List[Tuple[str, float]],
        experience_years: int,
        skills_count: int,
        total_matches: int,
        career_paths: List[Dict]
    ) -> Dict:
        """
        Generate a summary of the profile analysis.
        
        Args:
            top_categories: List of (category, probability) tuples
            experience_years: Years of experience
            skills_count: Number of identified skills
            total_matches: Number of job matches found
            career_paths: Suggested career paths
            
        Returns:
            Profile summary dictionary
        """
        if not top_categories:
            return {
                "headline": "Profile needs more information",
                "description": "Add more skills and experience to get better recommendations.",
                "confidence": "low"
            }
        
        primary_category, primary_prob = top_categories[0]
        
        if primary_prob >= 0.4:
            confidence = "high"
            confidence_text = "We're confident in these recommendations."
        elif primary_prob >= 0.2:
            confidence = "medium"
            confidence_text = "These recommendations are based on moderate confidence."
        else:
            confidence = "low"
            confidence_text = "Consider adding more details to improve accuracy."
        
        if experience_years <= 2:
            level = "Entry-Level"
        elif experience_years <= 5:
            level = "Mid-Level"
        elif experience_years <= 10:
            level = "Senior"
        else:
            level = "Principal/Leadership"
        
        headline = f"{level} {primary_category} Profile"
        
        secondary_roles = [cat for cat, prob in top_categories[1:3] if prob >= 0.15]
        if secondary_roles:
            alt_text = f"You also match well with: {', '.join(secondary_roles)}"
        else:
            alt_text = ""
        
        return {
            "headline": headline,
            "primary_role": primary_category,
            "primary_confidence": round(primary_prob * 100, 1),
            "experience_level": level,
            "skills_identified": skills_count,
            "total_matches": total_matches,
            "alternative_roles": alt_text,
            "confidence": confidence,
            "confidence_text": confidence_text,
            "suggested_paths": len(career_paths)
        }
    
    def format_recommendation_response(
        self,
        jobs_with_scores: List[Tuple[Dict, Dict]],
        profile_summary: Dict,
        skill_gaps: List[Dict],
        career_paths: List[Dict],
        category_probs: Dict[str, float],
        profile_skills: List[str]
    ) -> Dict:
        """
        Format the complete recommendation response with explanations.
        
        Args:
            jobs_with_scores: List of (job, scores) tuples
            profile_summary: Profile summary dictionary
            skill_gaps: List of skill gap analyses
            career_paths: List of career path recommendations
            category_probs: Category probabilities
            profile_skills: Profile skills list
            
        Returns:
            Complete formatted response
        """
        recommendations = []
        
        # OPTIMIZATION: LLM Disabled for Recommendations per user request (Latency/Timeout issues)
        # We will strictly use the statistical/semantic matching explanations.
        
        for i, (job, scores) in enumerate(jobs_with_scores):
            job_id = job.get("jobId", job.get("_id", ""))
            
            career_info = self._get_job_career_info(job, career_paths)
            
            # FAST PATH: Always use template-based explanations, never LLM
            use_ai_for_this_job = False 
            
            explanation = self.explain_job_match(
                job=job,
                scores=scores,
                category_probs=category_probs,
                profile_skills=profile_skills,
                is_in_career_path=career_info["is_in_path"],
                career_step=career_info["step"],
                use_ai=use_ai_for_this_job
            )
            
            recommendations.append({
                **job,
                "matchScore": round(scores["final_score"] * 100, 2),
                "explanation": explanation,
                "matched_skills": explanation["skills"]["matched"],
                "missing_skills": explanation["skills"]["missing"]
            })
        
        skill_gap_explanations = []
        for gap in skill_gaps[:10]:
            skill_gap_explanations.append(
                self.explain_skill_gap(
                    skill=gap["skill"],
                    priority=gap["priority"],
                    occurrences=gap["occurrences"],
                    target_roles=gap.get("roles", [])
                )
            )
        
        return {
            "success": True,
            "recommendations": recommendations,
            "profileSummary": profile_summary,
            "skillGaps": skill_gap_explanations,
            "careerPaths": career_paths,
            "meta": {
                "total_recommendations": len(recommendations),
                "total_skill_gaps": len(skill_gap_explanations),
                "total_career_paths": len(career_paths),
                "ai_enabled": False
            }
        }
    
    def _get_job_career_info(
        self,
        job: Dict,
        career_paths: List[Dict]
    ) -> Dict:
        """Check if a job is part of any career path."""
        job_id = job.get("jobId", job.get("_id", ""))
        job_category = job.get("category", "")
        
        for path in career_paths:
            for step in path.get("steps", []):
                for rec_job_id in step.get("recommendedJobIds", []):
                    if rec_job_id == job_id:
                        return {
                            "is_in_path": True,
                            "step": step.get("role", ""),
                            "path_name": path.get("name", "")
                        }
        
        return {"is_in_path": False, "step": None, "path_name": None}
