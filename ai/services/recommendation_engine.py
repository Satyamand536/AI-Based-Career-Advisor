import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from .embedding_service import EmbeddingService

class RecommendationEngine:
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    def get_recommendations(self, user_profile, all_jobs, top_k=10):
        """User ke liye best jobs recommend karo"""
        
        # User ka embedding generate karo
        user_text = self._create_user_text(user_profile)
        user_embedding = self.embedding_service.generate_embedding(user_text)
        
        # Har job ka embedding generate karo
        recommendations = []
        
        for job in all_jobs:
            job_text = f"{job.get('jobTitle')} {job.get('description')} {' '.join(job.get('requiredSkills', []))}"
            job_embedding = self.embedding_service.generate_embedding(job_text)
            
            # Similarity calculate karo
            similarity = cosine_similarity(
                [user_embedding], 
                [job_embedding]
            )[0][0]
            
            # Skill match bonus
            skill_match = self._calculate_skill_match(
                user_profile.get('skills', []),
                job.get('requiredSkills', [])
            )
            
            # Experience match bonus
            exp_match = self._calculate_experience_match(
                user_profile.get('experience', 0),
                job.get('experience', 0)
            )
            
            # Final score
            final_score = (similarity * 0.6) + (skill_match * 0.3) + (exp_match * 0.1)
            
            recommendations.append({
                'jobId': str(job.get('_id', '')),
                'jobTitle': job.get('jobTitle'),
                'company': job.get('company'),
                'matchScore': float(final_score * 100),
                'skillMatch': skill_match,
                'reason': self._generate_reason(user_profile, job, skill_match)
            })
        
        # Sort by score
        recommendations.sort(key=lambda x: x['matchScore'], reverse=True)
        
        return recommendations[:top_k]
    
    def _create_user_text(self, profile):
        """User profile se text representation banao"""
        text = f"Skills: {' '.join(profile.get('skills', []))}. "
        text += f"Experience: {profile.get('experience', 0)} years. "
        text += f"Education: {' '.join(profile.get('education', []))}. "
        text += f"Career Goal: {profile.get('careerGoals', 'Growth')}"
        return text
    
    def _calculate_skill_match(self, user_skills, job_skills):
        """Skill match percentage"""
        if not job_skills or not user_skills:
            return 0
        
        matched = len(set(user_skills) & set(job_skills))
        total_required = len(job_skills)
        
        return matched / total_required
    
    def _calculate_experience_match(self, user_exp, job_exp):
        """Experience match"""
        if user_exp >= job_exp:
            return 1.0
        else:
            return user_exp / max(job_exp, 1)
    
    def _generate_reason(self, profile, job, skill_match):
        """Recommendation ka reason"""
        reasons = []
        
        if skill_match > 0.7:
            reasons.append("Strong skill match")
        elif skill_match > 0.4:
            reasons.append("Good skill alignment")
        
        if profile.get('experience', 0) >= job.get('experience', 0):
            reasons.append("You meet experience requirement")
        
        return " | ".join(reasons) if reasons else "Interesting opportunity"
