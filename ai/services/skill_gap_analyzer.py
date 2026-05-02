"""
Skill Gap Analyzer - Skill Assessment Module
=============================================
Analyzes skill gaps between user profiles and job requirements.
Provides prioritized recommendations for skill development.

Features:
- Aggregate skill gap analysis across multiple jobs
- Skill prioritization based on frequency and importance
- Learning path recommendations
- Skill clustering by category

Author: AI Career Advisor System
"""

from typing import Dict, List, Set, Tuple, Optional
from collections import Counter, defaultdict
import logging
import re

logger = logging.getLogger(__name__)


class SkillGapAnalyzer:
    """
    Analyzes and prioritizes skill gaps for career development.
    
    Aggregates missing skills across job recommendations and provides
    actionable recommendations for skill development.
    """
    
    SKILL_CATEGORIES = {
        "programming_languages": [
            "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang",
            "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab"
        ],
        "frontend": [
            "react", "vue", "angular", "svelte", "html", "css", "sass", "scss",
            "tailwind", "bootstrap", "webpack", "redux", "nextjs", "gatsby"
        ],
        "backend": [
            "node", "express", "django", "flask", "fastapi", "spring", "rails",
            "laravel", "asp.net", "graphql", "rest", "microservices"
        ],
        "databases": [
            "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
            "dynamodb", "cassandra", "neo4j", "firebase"
        ],
        "cloud_devops": [
            "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
            "jenkins", "gitlab", "github actions", "ci/cd", "linux"
        ],
        "data_science": [
            "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "keras",
            "spark", "hadoop", "airflow", "tableau", "power bi", "statistics"
        ],
        "ai_ml": [
            "machine learning", "deep learning", "nlp", "computer vision",
            "transformers", "bert", "gpt", "langchain", "llm", "neural networks"
        ],
        "mobile": [
            "react native", "flutter", "ios", "android", "swift", "kotlin",
            "xcode", "android studio"
        ],
        "security": [
            "security", "penetration testing", "owasp", "cryptography",
            "network security", "siem", "incident response"
        ],
        "soft_skills": [
            "agile", "scrum", "leadership", "communication", "problem solving",
            "project management", "stakeholder management"
        ]
    }
    
    SKILL_IMPORTANCE_WEIGHTS = {
        "programming_languages": 1.5,
        "cloud_devops": 1.4,
        "ai_ml": 1.4,
        "data_science": 1.3,
        "backend": 1.2,
        "frontend": 1.2,
        "databases": 1.2,
        "security": 1.3,
        "mobile": 1.1,
        "soft_skills": 0.8
    }
    
    LEARNING_RESOURCES = {
        "python": {
            "beginner": ["Python for Everybody (Coursera)", "Automate the Boring Stuff"],
            "intermediate": ["Python Data Science Handbook", "Fluent Python"],
            "advanced": ["High Performance Python", "CPython Internals"]
        },
        "javascript": {
            "beginner": ["JavaScript.info", "freeCodeCamp JavaScript"],
            "intermediate": ["You Don't Know JS", "JavaScript: The Good Parts"],
            "advanced": ["Functional JavaScript", "JavaScript Design Patterns"]
        },
        "react": {
            "beginner": ["Official React Tutorial", "React for Beginners (Wesbos)"],
            "intermediate": ["Epic React (Kent C Dodds)", "React Patterns"],
            "advanced": ["React Performance", "Advanced React Patterns"]
        },
        "aws": {
            "beginner": ["AWS Cloud Practitioner", "A Cloud Guru Intro"],
            "intermediate": ["AWS Solutions Architect Associate", "AWS in Action"],
            "advanced": ["AWS Solutions Architect Professional", "AWS Security Specialty"]
        },
        "docker": {
            "beginner": ["Docker Getting Started", "Docker for Beginners"],
            "intermediate": ["Docker Deep Dive", "Docker and Kubernetes Guide"],
            "advanced": ["Docker in Production", "Container Security"]
        },
        "kubernetes": {
            "beginner": ["Kubernetes Basics", "CKAD Prep Course"],
            "intermediate": ["Kubernetes Up and Running", "CKA Certification"],
            "advanced": ["Production Kubernetes", "Kubernetes Patterns"]
        },
        "machine learning": {
            "beginner": ["ML by Andrew Ng", "Hands-On ML with Scikit-Learn"],
            "intermediate": ["Deep Learning Specialization", "Fast.ai"],
            "advanced": ["Papers with Code", "ML Research Papers"]
        },
        "sql": {
            "beginner": ["SQL Zoo", "Mode SQL Tutorial"],
            "intermediate": ["SQL Performance Explained", "Use the Index, Luke"],
            "advanced": ["High Performance MySQL", "PostgreSQL Internals"]
        }
    }
    
    def __init__(self):
        """Initialize the skill gap analyzer."""
        self._skill_to_category = {}
        for category, skills in self.SKILL_CATEGORIES.items():
            for skill in skills:
                self._skill_to_category[skill.lower()] = category
        logger.info("📊 [SkillGapAnalyzer] Initialized")
    
    def _categorize_skill(self, skill: str) -> str:
        """Get the category for a skill."""
        return self._skill_to_category.get(skill.lower().strip(), "other")
    
    def _calculate_priority(
        self,
        skill: str,
        occurrences: int,
        total_jobs: int,
        avg_job_score: float
    ) -> Tuple[str, float]:
        """
        Calculate priority for a skill gap.
        
        Args:
            skill: Skill name
            occurrences: Number of jobs requiring this skill
            total_jobs: Total number of jobs analyzed
            avg_job_score: Average match score of jobs requiring this skill
            
        Returns:
            Tuple of (priority_level, priority_score)
        """
        frequency_ratio = occurrences / max(total_jobs, 1)
        
        category = self._categorize_skill(skill)
        importance_weight = self.SKILL_IMPORTANCE_WEIGHTS.get(category, 1.0)
        
        priority_score = (
            0.5 * frequency_ratio +
            0.3 * importance_weight / 1.5 +
            0.2 * avg_job_score
        )
        
        if priority_score >= 0.5 or occurrences >= total_jobs * 0.4:
            priority = "high"
        elif priority_score >= 0.3 or occurrences >= total_jobs * 0.2:
            priority = "medium"
        else:
            priority = "low"
            
        return priority, priority_score
        
    def _normalize_skill(self, skill: str) -> str:
        """
        Normalize skill name for better matching.
        e.g., 'React.js' -> 'react', 'Node.js' -> 'node'
        """
        if not skill:
            return ""
        s = skill.lower().strip()
        # Remove version numbers
        s = re.sub(r'\s*v?\d+(\.\d+)*$', '', s)
        # Remove common suffixes
        s = s.replace(".js", "").replace("js", "")
        # Remove special chars
        s = re.sub(r'[^\w\s\+\#]', '', s) # Keep + (C++) and # (C#)
        return s.strip()

    def analyze_skill_gaps(
        self,
        profile_skills: List[str],
        jobs_with_scores: List[Tuple[Dict, Dict]],
        top_n: int = 15
    ) -> Dict:
        """
        Analyze skill gaps across multiple job recommendations.
        """
        
        # Normalize profile skills for flexible matching
        profile_skills_norm = {self._normalize_skill(s) for s in profile_skills if s}
        # Also keep original lowercased for exact matches
        profile_skills_lower = {s.lower().strip() for s in profile_skills if s}
        
        missing_counter = Counter()
        skill_job_scores = defaultdict(list)
        skill_job_categories = defaultdict(set)
        
        for job, scores in jobs_with_scores:
            required_skills = job.get("requiredSkills", [])
            nice_to_have = job.get("niceToHaveSkills", [])
            job_category = job.get("category", "")
            final_score = scores.get("final_score", 0)
            
            for skill in required_skills:
                skill_raw = skill.lower().strip()
                skill_norm = self._normalize_skill(skill)
                
                # Check both exact and normalized match
                if skill_raw and skill_raw not in profile_skills_lower and skill_norm not in profile_skills_norm:
                    missing_counter[skill_raw] += 1
                    skill_job_scores[skill_raw].append(final_score)
                    skill_job_categories[skill_raw].add(job_category)
            
            for skill in nice_to_have:
                skill_raw = skill.lower().strip()
                skill_norm = self._normalize_skill(skill)
                
                if skill_raw and skill_raw not in profile_skills_lower and skill_norm not in profile_skills_norm:
                    missing_counter[skill_raw] += 0.5
                    skill_job_scores[skill_raw].append(final_score * 0.8)
                    skill_job_categories[skill_raw].add(job_category)
        
        total_jobs = len(jobs_with_scores)
        skill_gaps = []
        
        for skill, count in missing_counter.most_common(top_n * 2):
            avg_score = sum(skill_job_scores[skill]) / len(skill_job_scores[skill]) if skill_job_scores[skill] else 0
            priority, priority_score = self._calculate_priority(skill, int(count), total_jobs, avg_score)
            
            skill_gaps.append({
                "skill": skill,
                "occurrences": int(count),
                "priority": priority,
                "priority_score": round(priority_score, 3),
                "category": self._categorize_skill(skill),
                "roles": list(skill_job_categories[skill])[:3],
                "avg_job_match": round(avg_score * 100, 1)
            })
        
        skill_gaps.sort(key=lambda x: (
            -{"high": 3, "medium": 2, "low": 1}[x["priority"]],
            -x["priority_score"],
            -x["occurrences"]
        ))
        
        by_category = defaultdict(list)
        for gap in skill_gaps:
            category = gap["category"]
            by_category[category].append(gap)
        
        by_category_sorted = {
            cat: sorted(gaps, key=lambda x: -x["priority_score"])[:5]
            for cat, gaps in by_category.items()
        }
        
        return {
            "top_gaps": skill_gaps[:top_n],
            "by_category": dict(by_category_sorted),
            "summary": {
                "total_gaps_identified": len(skill_gaps),
                "high_priority_count": sum(1 for g in skill_gaps if g["priority"] == "high"),
                "medium_priority_count": sum(1 for g in skill_gaps if g["priority"] == "medium"),
                "categories_affected": list(by_category.keys())
            },
            "profile_skills_count": len(profile_skills_lower)
        }
    
    def get_learning_recommendations(
        self,
        skill: str,
        current_level: str = "beginner"
    ) -> Dict:
        """
        Get learning recommendations for a specific skill.
        
        Args:
            skill: Skill to learn
            current_level: Current proficiency level
            
        Returns:
            Learning recommendations dictionary
        """
        skill_lower = skill.lower().strip()
        
        if skill_lower in self.LEARNING_RESOURCES:
            resources = self.LEARNING_RESOURCES[skill_lower]
        else:
            resources = {
                "beginner": [f"Search '{skill} tutorial for beginners'", "Coursera/Udemy courses"],
                "intermediate": [f"'{skill} best practices'", "Official documentation"],
                "advanced": [f"'{skill}' open source projects", "Technical blogs and papers"]
            }
        
        levels = ["beginner", "intermediate", "advanced"]
        current_idx = levels.index(current_level) if current_level in levels else 0
        
        if current_idx == 0:
            timeframe = "2-4 weeks for basics"
            suggested_level = "intermediate"
        elif current_idx == 1:
            timeframe = "1-2 months for proficiency"
            suggested_level = "advanced"
        else:
            timeframe = "Ongoing mastery"
            suggested_level = "advanced"
        
        category = self._categorize_skill(skill)
        
        return {
            "skill": skill,
            "category": category,
            "current_level": current_level,
            "target_level": suggested_level,
            "resources": resources.get(current_level, resources.get("beginner")),
            "next_level_resources": resources.get(suggested_level, []),
            "estimated_timeframe": timeframe,
            "practice_suggestions": [
                f"Build a small project using {skill}",
                f"Contribute to open source projects that use {skill}",
                f"Write a blog post about what you learned"
            ]
        }
    
    def create_learning_roadmap(
        self,
        skill_gaps: List[Dict],
        available_time_weekly_hours: int = 10
    ) -> Dict:
        """
        Create a prioritized learning roadmap from skill gaps.
        
        Args:
            skill_gaps: List of skill gap dictionaries
            available_time_weekly_hours: Weekly hours available for learning
            
        Returns:
            Learning roadmap dictionary
        """
        high_priority = [g for g in skill_gaps if g["priority"] == "high"][:3]
        medium_priority = [g for g in skill_gaps if g["priority"] == "medium"][:3]
        
        phases = []
        
        if high_priority:
            phase1_skills = [g["skill"] for g in high_priority]
            phases.append({
                "phase": 1,
                "name": "Foundation Skills",
                "duration_weeks": 4,
                "skills": phase1_skills,
                "weekly_hours": available_time_weekly_hours,
                "goals": [f"Reach intermediate level in {skill}" for skill in phase1_skills[:2]],
                "milestones": [
                    "Complete introductory course/tutorial",
                    "Build one small project per skill",
                    "Update resume with new skills"
                ]
            })
        
        if medium_priority:
            phase2_skills = [g["skill"] for g in medium_priority]
            phases.append({
                "phase": 2,
                "name": "Expanding Capabilities",
                "duration_weeks": 6,
                "skills": phase2_skills,
                "weekly_hours": available_time_weekly_hours,
                "goals": [f"Gain working knowledge of {skill}" for skill in phase2_skills[:2]],
                "milestones": [
                    "Complete intermediate tutorials",
                    "Integrate skills into a larger project",
                    "Prepare for technical interviews"
                ]
            })
        
        total_weeks = sum(p["duration_weeks"] for p in phases)
        
        return {
            "roadmap": phases,
            "summary": {
                "total_duration_weeks": total_weeks,
                "skills_to_learn": len(high_priority) + len(medium_priority),
                "weekly_commitment_hours": available_time_weekly_hours
            },
            "tips": [
                "Focus on one skill at a time for better retention",
                "Practice daily, even if just for 30 minutes",
                "Join communities (Discord, Reddit) for your target skills",
                "Track your progress and celebrate small wins"
            ]
        }
    
    def compare_with_target_role(
        self,
        profile_skills: List[str],
        target_role: str,
        role_required_skills: List[str]
    ) -> Dict:
        """
        Compare profile skills with a specific target role's requirements.
        
        Args:
            profile_skills: Current profile skills
            target_role: Target role name
            role_required_skills: Skills required for the target role
            
        Returns:
            Comparison analysis dictionary
        """
        profile_lower = {s.lower().strip() for s in profile_skills if s}
        required_lower = [s.lower().strip() for s in role_required_skills if s]
        
        matched = [s for s in required_lower if s in profile_lower]
        missing = [s for s in required_lower if s not in profile_lower]
        
        coverage = len(matched) / len(required_lower) if required_lower else 0
        
        if coverage >= 0.8:
            readiness = "ready"
            message = f"You're well-prepared for {target_role} roles!"
        elif coverage >= 0.5:
            readiness = "almost_ready"
            message = f"You're close! Focus on developing {len(missing)} more skills."
        elif coverage >= 0.3:
            readiness = "developing"
            message = f"Good foundation. Build on your strengths while adding new skills."
        else:
            readiness = "early_stage"
            message = f"This is a stretch goal. Start with the fundamentals."
        
        return {
            "target_role": target_role,
            "coverage_percent": round(coverage * 100, 1),
            "readiness": readiness,
            "message": message,
            "matched_skills": matched,
            "missing_skills": missing,
            "priority_skills": missing[:5]
        }
