"""
Industry Readiness Calculator
=============================
Calculates the Career Readiness Index (CRI) for users.
Score (0-100) based on:
1. Resume Skill Match (vs Market)
2. Test Scores (Technical Assessments)
3. Roadmap Progress
4. Experience Level

Author: AI Career Advisor System
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class ReadinessCalculator:
    """
    Calculates Industry Readiness Score (CRI).
    """
    
    def calculate_score(self, profile: Dict, test_results: List[Dict], roadmap_progress: float) -> Dict:
        """
        Calculate CRI score and generate report.
        
        Args:
            profile: User profile (skills, exp)
            test_results: List of test result dicts (score, difficulty)
            roadmap_progress: Percentage (0-100)
            
        Returns:
            Dict containing score (0-100), label, and breakdown.
        """
        score = 0
        breakdown = {}
        
        # 1. Experience & Skills (Base: 40 points)
        exp_years = profile.get("experience_years", 0)
        skills = profile.get("skills", [])
        if isinstance(skills, str):
            skills = skills.split(",")
            
        skill_count = len(skills)
        
        exp_score = min(20, exp_years * 4) # Max 20 pts for 5 years
        skill_score = min(20, skill_count * 1) # Max 20 pts for 20 skills
        
        score += exp_score + skill_score
        breakdown["experience_skills"] = exp_score + skill_score
        
        # 2. Test Performance (Base: 40 points)
        if test_results:
            avg_test_score = sum(r.get("score", 0) for r in test_results) / len(test_results)
            test_points = (avg_test_score / 100) * 40
        else:
            test_points = 0
            
        score += test_points
        breakdown["assessments"] = round(test_points, 1)
        
        # 3. Roadmap Progress (Base: 20 points)
        progress_points = (roadmap_progress / 100) * 20
        score += progress_points
        breakdown["learning_progress"] = round(progress_points, 1)
        
        final_score = min(100, round(score))
        
        # Determine Label
        if final_score >= 85:
            label = "Expert / Job Ready"
            color = "green"
        elif final_score >= 65:
            label = "Advanced"
            color = "blue"
        elif final_score >= 40:
            label = "Intermediate"
            color = "yellow"
        else:
            label = "Beginner"
            color = "red"
            
        return {
            "score": final_score,
            "label": label,
            "color": color,
            "breakdown": breakdown,
            "feedback": self._generate_feedback(final_score, breakdown)
        }
    
    def _generate_feedback(self, score: int, breakdown: Dict) -> str:
        if score > 80:
            return "Excellent! You are ready for senior roles. Focus on system design and leadership."
        if breakdown.get("assessments", 0) < 10:
            return "Your technical assessment scores are low. Take more tests to prove your skills."
        if breakdown.get("learning_progress", 0) < 5:
            return "Complete more roadmap modules to improve your readiness."
        return "Keep growing! Focus on gaining more practical experience."
