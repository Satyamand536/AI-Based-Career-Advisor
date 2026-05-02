
import sys
import os
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'ai'))

from ai.services.classifier_service import ClassifierService
from ai.services.recommender_engine import RecommenderEngine

print("Loading Classifier...")
clf = ClassifierService()
rec = RecommenderEngine(clf)

profile = {
    "skills": ["python", "django"],
    "experience_years": 3,
    "name": "Python Dev",
    "rawText": "I am an experienced Python Developer with 5 years of experience in Django and Flask. I build backend systems."
}

jobs = [
    {
        "title": "Python Developer",
        "category": "Backend Developer",
        "requiredSkills": ["python"],
        "experience_required": 3,
        "description": "We need a python backend developer."  
    }
]

print("Ranking...")
results = rec.rank_jobs(profile, jobs)
print("Results:", results)
