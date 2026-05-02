"""
Career Path Analyzer - Career Trajectory Module
================================================
Analyzes user profiles and suggests career progression paths.
Uses a graph-based approach to map career transitions.

Features:
- Career transition graph with validated pathways
- Experience-based progression recommendations
- Job mapping to career path steps
- Multi-path exploration

Author: AI Career Advisor System
"""

from typing import Dict, List, Tuple, Optional, Set
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class CareerPathAnalyzer:
    """
    Analyzes and suggests career paths based on profile classification.
    
    Uses a directed graph of career transitions to recommend
    realistic progression pathways from current role to target roles.
    """
    
    CAREER_GRAPH = {
        "Frontend Developer": {
            "progressions": ["Senior Frontend Developer", "Frontend Architect", "Full Stack Developer", "UI/UX Designer"],
            "transitions": ["Full Stack Developer", "Mobile App Developer", "UI/UX Designer"],
            "leadership": ["Engineering Manager", "Frontend Lead", "Tech Lead"]
        },
        "Backend Developer": {
            "progressions": ["Senior Backend Developer", "Backend Architect", "Full Stack Developer"],
            "transitions": ["DevOps Engineer", "Cloud Engineer", "Data Engineer", "AI Engineer"],
            "leadership": ["Engineering Manager", "Tech Lead", "CTO"]
        },
        "Full Stack Developer": {
            "progressions": ["Senior Full Stack Developer", "Solutions Architect"],
            "transitions": ["Backend Developer", "Frontend Developer", "DevOps Engineer", "Product Manager"],
            "leadership": ["Tech Lead", "Engineering Manager", "CTO"]
        },
        "Data Scientist": {
            "progressions": ["Senior Data Scientist", "Lead Data Scientist", "Principal Data Scientist"],
            "transitions": ["AI Engineer", "ML Engineer", "NLP Engineer", "Data Engineer"],
            "leadership": ["Head of Data Science", "Chief Data Officer"]
        },
        "AI Engineer": {
            "progressions": ["Senior AI Engineer", "Lead AI Engineer", "AI Architect"],
            "transitions": ["ML Engineer", "NLP Engineer", "Data Scientist", "Research Scientist"],
            "leadership": ["Head of AI", "AI Research Director"]
        },
        "NLP Engineer": {
            "progressions": ["Senior NLP Engineer", "NLP Architect"],
            "transitions": ["AI Engineer", "Data Scientist", "Research Scientist"],
            "leadership": ["NLP Team Lead", "Head of NLP"]
        },
        "DevOps Engineer": {
            "progressions": ["Senior DevOps Engineer", "DevOps Architect", "Platform Engineer"],
            "transitions": ["Cloud Engineer", "SRE", "Backend Developer"],
            "leadership": ["DevOps Lead", "Head of Infrastructure", "VP Engineering"]
        },
        "Cloud Engineer": {
            "progressions": ["Senior Cloud Engineer", "Cloud Architect", "Solutions Architect"],
            "transitions": ["DevOps Engineer", "Platform Engineer", "Security Engineer"],
            "leadership": ["Cloud Lead", "Head of Cloud"]
        },
        "Mobile App Developer": {
            "progressions": ["Senior Mobile Developer", "Mobile Architect"],
            "transitions": ["Frontend Developer", "Full Stack Developer", "iOS/Android Specialist"],
            "leadership": ["Mobile Lead", "Engineering Manager"]
        },
        "QA Engineer": {
            "progressions": ["Senior QA Engineer", "QA Lead", "QA Architect"],
            "transitions": ["SDET", "DevOps Engineer", "Security Tester"],
            "leadership": ["QA Manager", "Head of Quality"]
        },
        "Cyber Security": {
            "progressions": ["Senior Security Analyst", "Security Architect", "Principal Security Engineer"],
            "transitions": ["DevSecOps Engineer", "Cloud Security Engineer", "Penetration Tester"],
            "leadership": ["Security Lead", "CISO", "Head of Security"]
        },
        "Blockchain Developer": {
            "progressions": ["Senior Blockchain Developer", "Blockchain Architect"],
            "transitions": ["Backend Developer", "Security Engineer", "DeFi Developer"],
            "leadership": ["Blockchain Lead", "CTO (Web3)"]
        },
        "IoT Engineer": {
            "progressions": ["Senior IoT Engineer", "IoT Architect"],
            "transitions": ["Embedded Systems Engineer", "Cloud Engineer", "AI Engineer (Edge)"],
            "leadership": ["IoT Lead", "Head of Hardware"]
        },
        "UI/UX Designer": {
            "progressions": ["Senior UI/UX Designer", "Principal Designer", "Design Architect"],
            "transitions": ["Product Designer", "Frontend Developer", "Product Manager"],
            "leadership": ["Design Lead", "Head of Design", "VP Design"]
        },
        "Product Manager": {
            "progressions": ["Senior Product Manager", "Principal PM", "Director of Product"],
            "transitions": ["Technical Program Manager", "Engineering Manager", "Entrepreneur"],
            "leadership": ["VP Product", "CPO", "CEO"]
        }
    }
    
    SENIORITY_PROGRESSION = {
        0: "Intern",
        1: "Junior",
        2: "Junior",
        3: "Mid",
        4: "Mid",
        5: "Senior",
        6: "Senior",
        7: "Senior",
        8: "Lead",
        9: "Lead",
        10: "Principal",
        11: "Principal",
        12: "Director"
    }
    
    SKILL_REQUIREMENTS = {
        "Full Stack Developer": ["javascript", "node", "react", "sql", "api"],
        "DevOps Engineer": ["docker", "kubernetes", "ci/cd", "linux", "aws"],
        "Cloud Engineer": ["aws", "azure", "terraform", "networking", "security"],
        "AI Engineer": ["python", "tensorflow", "pytorch", "ml", "deep learning"],
        "Data Scientist": ["python", "sql", "statistics", "ml", "data analysis"],
        "Product Manager": ["product strategy", "agile", "roadmap", "stakeholder management"],
        "Security Engineer": ["security", "penetration testing", "cryptography", "network security"]
    }
    
    def __init__(self):
        """Initialize the career path analyzer."""
        logger.info("🛤️ [CareerPathAnalyzer] Initialized")
    
    def _get_seniority_from_experience(self, years: int) -> str:
        """Map years of experience to seniority level."""
        if years >= 12:
            return "Director"
        return self.SENIORITY_PROGRESSION.get(years, "Mid")
    
    def _format_role_with_seniority(self, role: str, seniority: str) -> str:
        """Format role name with seniority level."""
        if seniority in role or "Senior" in role or "Lead" in role or "Principal" in role:
            return role
        if seniority in ["Intern", "Junior", "Mid"]:
            return f"{role} ({seniority})"
        elif seniority in ["Senior", "Lead", "Principal", "Director"]:
            return f"{seniority} {role}"
        return role
    
    def get_career_paths(
        self,
        current_category: str,
        experience_years: int,
        profile_skills: List[str],
        target_category: Optional[str] = None,
        max_paths: int = 3,
        max_steps: int = 3
    ) -> List[Dict]:
        """
        Generate career path recommendations.
        
        Args:
            current_category: Current/classified job category
            experience_years: Years of experience
            profile_skills: List of profile skills
            target_category: Optional target category to aim for
            max_paths: Maximum number of paths to return
            max_steps: Maximum steps per path
            
        Returns:
            List of career path dictionaries
        """
        if current_category == "Non-Technical" or current_category not in self.CAREER_GRAPH:
            return self._get_generic_paths(experience_years, current_category)
        
        # Type safety: ensure experience_years is int
        try:
            experience_years = int(experience_years)
        except (ValueError, TypeError):
            experience_years = 0
            
        current_seniority = self._get_seniority_from_experience(experience_years)
        profile_skills_lower = {s.lower() for s in profile_skills}
        
        paths = []
        
        vertical_path = self._build_vertical_path(
            current_category, current_seniority, experience_years, max_steps
        )
        if vertical_path:
            paths.append(vertical_path)
        
        transitions = self.CAREER_GRAPH[current_category].get("transitions", [])
        
        scored_transitions = []
        for trans in transitions:
            required_skills = self.SKILL_REQUIREMENTS.get(trans, [])
            if required_skills:
                overlap = len(profile_skills_lower.intersection(set(s.lower() for s in required_skills)))
                score = overlap / len(required_skills)
            else:
                score = 0.5
            scored_transitions.append((trans, score))
        
        scored_transitions.sort(key=lambda x: x[1], reverse=True)
        
        for trans_category, skill_score in scored_transitions[:2]:
            transition_path = self._build_transition_path(
                current_category, trans_category, current_seniority, 
                experience_years, skill_score, max_steps
            )
            if transition_path:
                paths.append(transition_path)
        
        if target_category and target_category != current_category:
            target_path = self._build_target_path(
                current_category, target_category, current_seniority,
                experience_years, profile_skills_lower, max_steps
            )
            if target_path and target_path not in paths:
                paths.insert(0, target_path)
        
        return paths[:max_paths]
    
    def _build_vertical_path(
        self,
        category: str,
        current_seniority: str,
        experience_years: int,
        max_steps: int
    ) -> Optional[Dict]:
        """Build a vertical progression path within the same category."""
        progressions = self.CAREER_GRAPH.get(category, {}).get("progressions", [])
        if not progressions:
            return None
        
        steps = []
        
        steps.append({
            "role": self._format_role_with_seniority(category, current_seniority),
            "type": "current",
            "experience_years": experience_years,
            "recommendedJobIds": [],
            "skills_to_develop": []
        })
        
        seniority_order = ["Junior", "Mid", "Senior", "Lead", "Principal"]
        current_idx = seniority_order.index(current_seniority) if current_seniority in seniority_order else 1
        
        for i in range(1, min(max_steps, len(seniority_order) - current_idx)):
            next_seniority = seniority_order[min(current_idx + i, len(seniority_order) - 1)]
            projected_years = experience_years + (i * 2)
            
            matching_prog = None
            for prog in progressions:
                if next_seniority.lower() in prog.lower():
                    matching_prog = prog
                    break
            
            role_name = matching_prog or self._format_role_with_seniority(category, next_seniority)
            
            steps.append({
                "role": role_name,
                "type": "progression",
                "experience_years": projected_years,
                "recommendedJobIds": [],
                "skills_to_develop": self._get_advancement_skills(category, next_seniority)
            })
        
        if len(steps) < 2:
            return None
        
        return {
            "name": f"Grow as a {category}",
            "type": "vertical",
            "description": f"Progress from {steps[0]['role']} to {steps[-1]['role']}",
            "from": steps[0]["role"],
            "to": steps[-1]["role"],
            "steps": steps,
            "estimated_years": sum(2 for _ in steps[1:]),
            "difficulty": "moderate"
        }
    
    def _build_transition_path(
        self,
        from_category: str,
        to_category: str,
        current_seniority: str,
        experience_years: int,
        skill_readiness: float,
        max_steps: int
    ) -> Optional[Dict]:
        """Build a transition path to a different category."""
        steps = []
        
        steps.append({
            "role": self._format_role_with_seniority(from_category, current_seniority),
            "type": "current",
            "experience_years": experience_years,
            "recommendedJobIds": [],
            "skills_to_develop": []
        })
        
        if skill_readiness < 0.5:
            bridge_seniority = "Mid" if current_seniority in ["Senior", "Lead", "Principal"] else current_seniority
            steps.append({
                "role": self._format_role_with_seniority(to_category, bridge_seniority),
                "type": "transition",
                "experience_years": experience_years + 1,
                "recommendedJobIds": [],
                "skills_to_develop": self.SKILL_REQUIREMENTS.get(to_category, [])[:5]
            })
            next_exp = experience_years + 3
        else:
            steps.append({
                "role": self._format_role_with_seniority(to_category, current_seniority),
                "type": "transition",
                "experience_years": experience_years + 1,
                "recommendedJobIds": [],
                "skills_to_develop": self.SKILL_REQUIREMENTS.get(to_category, [])[:3]
            })
            next_exp = experience_years + 2
        
        if len(steps) < max_steps:
            target_progressions = self.CAREER_GRAPH.get(to_category, {}).get("progressions", [])
            if target_progressions:
                steps.append({
                    "role": target_progressions[0],
                    "type": "goal",
                    "experience_years": next_exp + 2,
                    "recommendedJobIds": [],
                    "skills_to_develop": []
                })
        
        difficulty = "easy" if skill_readiness >= 0.6 else "moderate" if skill_readiness >= 0.3 else "challenging"
        
        return {
            "name": f"Transition to {to_category}",
            "type": "transition",
            "description": f"Leverage your {from_category} experience to become a {to_category}",
            "from": steps[0]["role"],
            "to": steps[-1]["role"],
            "steps": steps,
            "estimated_years": max(step["experience_years"] for step in steps) - experience_years,
            "difficulty": difficulty,
            "skill_readiness": round(skill_readiness * 100, 1)
        }
    
    def _build_target_path(
        self,
        from_category: str,
        to_category: str,
        current_seniority: str,
        experience_years: int,
        profile_skills: Set[str],
        max_steps: int
    ) -> Optional[Dict]:
        """Build a path to a specific target category."""
        required_skills = set(s.lower() for s in self.SKILL_REQUIREMENTS.get(to_category, []))
        skill_readiness = len(profile_skills.intersection(required_skills)) / max(len(required_skills), 1)
        
        return self._build_transition_path(
            from_category, to_category, current_seniority,
            experience_years, skill_readiness, max_steps
        )
    
    def _get_generic_paths(self, experience_years: int, category: str = "Tech Role") -> List[Dict]:
        """Return dynamic generic paths for unknown technical categories so users don't get stuck in QA defaults."""
        safe_cat = category if category else "Software Engineer"
        target_role = f"Senior {safe_cat}" if experience_years < 3 else f"Lead {safe_cat}"
        
        return [
            {
                "name": f"Grow as a {safe_cat}",
                "type": "vertical",
                "description": f"Standard progression path for {safe_cat}",
                "from": safe_cat,
                "to": target_role,
                "steps": [
                    {"role": f"Junior {safe_cat}", "type": "entry", "experience_years": experience_years, "recommendedJobIds": [], "skills_to_develop": ["core principles", "tooling", "best practices"]},
                    {"role": safe_cat, "type": "progression", "experience_years": experience_years + 2, "recommendedJobIds": [], "skills_to_develop": ["architecture", "optimization", "system design"]},
                    {"role": target_role, "type": "goal", "experience_years": experience_years + 4, "recommendedJobIds": [], "skills_to_develop": ["leadership", "scale", "mentoring"]}
                ],
                "estimated_years": 4,
                "difficulty": "moderate"
            }
        ]
    
    def _get_advancement_skills(self, category: str, seniority: str) -> List[str]:
        """Get skills needed for advancement to a seniority level."""
        advancement_skills = {
            "Senior": ["system design", "mentoring", "code review", "architecture"],
            "Lead": ["team management", "stakeholder communication", "project planning", "technical strategy"],
            "Principal": ["organizational leadership", "cross-team collaboration", "technical vision", "executive communication"]
        }
        
        base_skills = self.SKILL_REQUIREMENTS.get(category, [])[:2]
        seniority_skills = advancement_skills.get(seniority, [])[:2]
        
        return base_skills + seniority_skills
    
    def map_jobs_to_paths(
        self,
        paths: List[Dict],
        jobs: List[Dict],
        job_scores: Dict[str, float]
    ) -> List[Dict]:
        """
        Map recommended jobs to career path steps.
        
        Args:
            paths: Career paths to augment
            jobs: Available jobs
            job_scores: Dictionary of job_id -> match score
            
        Returns:
            Updated paths with job recommendations per step
        """
        jobs_by_category = defaultdict(list)
        for job in jobs:
            category = job.get("category", "")
            job_id = job.get("jobId", job.get("_id", ""))
            score = job_scores.get(job_id, 0)
            jobs_by_category[category].append((job_id, score))
        
        for category in jobs_by_category:
            jobs_by_category[category].sort(key=lambda x: x[1], reverse=True)
        
        for path in paths:
            for step in path.get("steps", []):
                role = step.get("role", "")
                step_type = step.get("type", "")
                
                if step_type == "current":
                    continue
                
                matched_category = None
                for category in jobs_by_category:
                    if category.lower() in role.lower() or role.lower() in category.lower():
                        matched_category = category
                        break
                
                if matched_category:
                    top_jobs = jobs_by_category[matched_category][:3]
                    step["recommendedJobIds"] = [job_id for job_id, _ in top_jobs]
        
        return paths
