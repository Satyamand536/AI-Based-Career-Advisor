import logging
import json
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from services.recommender_engine import RecommenderEngine
from services.embedding_service import EmbeddingService
from services.classifier_service import ClassifierService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_recommendation():
    # 1. Initialize services
    print("🚀 Initializing diagnostic services...")
    embedding_service = EmbeddingService(model_name="all-MiniLM-L6-v2")
    classifier_service = ClassifierService(embedding_service)
    recommender = RecommenderEngine(embedding_service, classifier_service)
    
    # 2. Sample Profile
    profile = {
        "name": "Diagnostic User",
        "skills": ["React", "Node.js", "JavaScript", "MongoDB", "Express", "HTML", "CSS"],
        "experience_years": 2,
        "role": "Full Stack Developer",
        "category": "Full Stack Developer"
    }
    
    # 3. Sample Jobs
    jobs = [
        {
            "jobId": "job_1",
            "title": "Junior Full Stack Developer",
            "company": "Tech Corp",
            "description": "Looking for a React and Node.js developer with 1-3 years of experience. Must know MongoDB.",
            "category": "Full Stack Developer",
            "requiredSkills": ["React", "Node.js", "MongoDB"],
            "experience_required": 1
        },
        {
            "jobId": "job_2",
            "title": "Backend Engineer",
            "company": "Data Systems",
            "description": "Develop scalable APIs with Node.js and PostgreSQL.",
            "category": "Backend Developer",
            "requiredSkills": ["Node.js", "PostgreSQL", "API Design"],
            "experience_required": 3
        },
        {
            "jobId": "job_3",
            "title": "Chef",
            "company": "Foodies",
            "description": "Expert in Italian cuisine.",
            "category": "Non-Technical",
            "requiredSkills": ["Cooking", "Knife Skills"],
            "experience_required": 5
        }
    ]
    
    print("\n🎯 Running Recommendation Engine...")
    result = recommender.recommend(profile=profile, jobs=jobs)
    
    print("\n✅ DIAGNOSTIC RESULTS:")
    print(f"Status: {result.get('success', 'N/A')}")
    print(f"Recommendations Count: {len(result.get('recommendations', []))}")
    
    if result.get('recommendations'):
        for i, rec in enumerate(result['recommendations']):
            print(f"{i+1}. {rec.get('title')} at {rec.get('company')} - Score: {rec.get('matchScore')}")
    else:
        print(f"❌ REASON FOR FAILURE: {result.get('profileSummary', {}).get('reason', 'Unknown')}")
        print(f"Meta Reason: {result.get('meta', {}).get('reason')}")
        print(f"Category Probabilities: {result.get('meta', {}).get('category_probabilities')}")

if __name__ == "__main__":
    test_recommendation()
