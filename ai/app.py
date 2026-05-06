"""
AI Career Advisor - Flask API Server
=====================================
Production-grade API for resume parsing, job recommendations,
career path analysis, and skill gap identification.

Endpoints:
- GET  /health              - Health check
- POST /parse-resume        - Parse resume file
- POST /recommend           - Get job recommendations (legacy)
- POST /api/recommend       - Get comprehensive recommendations
- POST /api/classify        - Classify profile
- POST /api/skill-gaps      - Analyze skill gaps
- POST /api/career-paths    - Get career path suggestions
- GET  /api/status          - Service status

Author: AI Career Advisor System
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging
import traceback
from typing import Dict, Any, List
import uuid
import json
import json
from dotenv import load_dotenv

# Optimization for gthread/multiprocessing
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from services.resume_parser import parse_resume_file

# --- Global Service Instances (Top 0.1% Architecture) ---
embedding_service = None
llm_service = None
classifier_service = None
recommender = None
skill_gap_analyzer = None
career_path_analyzer = None
SERVICES_READY = False

# Load environment variables early
load_dotenv()
logger.info("✅ [.env] Environment variables loaded")

# Logger and dotenv moved above Sys Path setup for safer early logging

app = Flask(__name__)

CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:8000", "http://localhost:3000", "http://127.0.0.1:8000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


# --- Initializing Services Lazy (Top 0.1% Architecture) ---
def initialize_services():
    """
    Lazy load services on first request to avoid slow startup.
    This allows 'python app.py' to start in < 1 second.
    """
    global embedding_service, llm_service, classifier_service, recommender, skill_gap_analyzer, career_path_analyzer, SERVICES_READY
    
    if SERVICES_READY:
        return True

    logger.info("=" * 60)
    logger.info("🚀 AI Career Advisor - Lazy Loading Services")
    logger.info("=" * 60)

    try:
        logger.info("🧠 Loading Embedding Service (all-MiniLM-L6-v2 - Light Version)...")
        from services.embedding_service import EmbeddingService
        embedding_service = EmbeddingService(model_name="all-MiniLM-L6-v2")
        
        logger.info("🧠 Loading LLM Service (OpenRouter Core)...")
        from services.llm_service import LLMService
        llm_service = LLMService()
        
        logger.info("🧠 Loading Classifier Service...")
        from services.classifier_service import ClassifierService
        classifier_service = ClassifierService(embedding_service)
        
        logger.info("🧠 Loading Recommendation Engine (Top 0.1% Edition)...")
        from services.recommender_engine import RecommenderEngine
        recommender = RecommenderEngine(
            embedding_service=embedding_service,
            classifier_service=classifier_service,
            llm_service=None # STRICT: Disconnect LLM for recommendations
        )
        
        skill_gap_analyzer = recommender.skill_gap_analyzer
        career_path_analyzer = recommender.career_path_analyzer
        
        logger.info("✅ All AI Services initialized and ready!")
        SERVICES_READY = True
        return True
        
    except Exception as e:
        logger.error(f"❌ CRITICAL AI INIT ERROR: {e}")
        logger.error(traceback.format_exc())
        SERVICES_READY = False
        return False



def create_error_response(message: str, status_code: int = 400, request_id: str = None) -> tuple:
    """Create standardized error response."""
    return jsonify({
        "ok": False,
        "error": message,
        "request_id": request_id or str(uuid.uuid4())[:8]
    }), status_code


def validate_request_json(required_fields: list) -> tuple:
    """Validate request JSON and required fields."""
    data = request.get_json()
    if not data:
        return None, ("Missing JSON body", 400)
    
    for field in required_fields:
        if field not in data:
            return None, (f"Missing required field: {field}", 400)
    
    return data, None


@app.route('/', methods=['GET'])
def index():
    """Root endpoint for service discovery."""
    return jsonify({
        "ok": True,
        "message": "AI Career Advisor API is running",
        "endpoints": [
            "/health", "/api/status", "/parse-resume", "/api/recommend"
        ]
    }), 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok" if SERVICES_READY else "degraded",
        "service": "AI Career Advisor v2.0",
        "model": "all-mpnet-base-v2 (Pure MPNet)",
        "services_ready": SERVICES_READY
    }), 200 if SERVICES_READY else 200 # Return 200 even if not ready to avoid LB drops, just report status



@app.route('/api/status', methods=['GET'])
def service_status():
    """Get detailed service status."""
    if not SERVICES_READY:
        initialize_services()
    
    status = {
        "ok": SERVICES_READY,
        "service": "AI Career Advisor v2.0",
        "llm_providers": [p['name'] for p in llm_service.providers] if llm_service else [],
        "recommender_ready": recommender is not None
    }
    return jsonify(status)

@app.route('/api/ai-debug', methods=['GET'])
def ai_debug():
    """Extreme diagnostics for the LLM service."""
    if not llm_service:
        return jsonify({"ok": False, "error": "LLM Service not initialized"})
        
    providers_info = []
    for p in llm_service.providers:
        p_info = {
            "name": p.get("name"),
            "model": p.get("model", "N/A"),
            "has_key": bool(p.get("api_key"))
        }
        providers_info.append(p_info)
        
    return jsonify({
        "ok": True,
        "providers": providers_info,
        "environment_check": {
            "OPENROUTER_B64": bool(os.getenv("OPENROUTER_API_KEY_B64")),
            "GEMINI_KEY": bool(os.getenv("GEMINI_API_KEY"))
        }
    })


@app.route('/parse-resume', methods=['POST'])
def parse_resume():
    """Parse resume file and extract profile information + embeddings."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()

    
    try:
        data, error = validate_request_json(['filePath'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        file_path = data['filePath']
        
        if not os.path.exists(file_path):
            return create_error_response("File not found", 404, request_id)
        
        logger.info(f"📄 [{request_id}] Parsing resume: {file_path}")
        profile = parse_resume_file(file_path)
        
        # Generate embedding for the parsed profile
        from services.embedding_service import build_profile_text
        profile_text = build_profile_text(profile)
        embedding = embedding_service.embed(profile_text)
        
        return jsonify({
            "ok": True,
            "profile": profile,
            "embedding": embedding.tolist() if embedding is not None else [],
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Parse error: {e}")
        traceback.print_exc()
        return create_error_response(f"Failed to parse resume: {str(e)}", 500, request_id)


@app.route('/recommend', methods=['POST'])
def recommend_jobs_legacy():
    """
    Legacy recommendation endpoint for backward compatibility.
    Returns flat list of ranked jobs.
    """
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['profile', 'jobs'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        profile = data['profile']
        jobs = data['jobs']
        top_k = data.get('top_k', 20)
        
        if not jobs:
            return jsonify({"ok": True, "recommendations": [], "request_id": request_id}), 200
        
        logger.info(f"🎯 [{request_id}] Legacy ranking for {profile.get('name', 'User')}")
        
        scored_jobs = recommender.rank_jobs(profile, jobs, top_k=top_k)
        
        logger.info(f"✅ [{request_id}] Returned {len(scored_jobs)} matches")
        return jsonify({
            "ok": True,
            "recommendations": scored_jobs,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Recommendation error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/recommend', methods=['POST'])
def recommend_comprehensive():
    """
    Comprehensive recommendation endpoint.
    Returns recommendations with explanations, career paths, and skill gaps.
    """
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['profile', 'jobs'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        profile = data['profile']
        jobs = data['jobs']
        top_k = data.get('top_k', 20)
        include_career_paths = data.get('include_career_paths', True)
        include_skill_gaps = data.get('include_skill_gaps', True)
        use_llm_ranking = data.get('use_llm_ranking', False)  # DEFAULT: DISABLED for speed
        target_category = data.get('target_category')
        profile_embedding = data.get('embedding')  # Optional pre-computed embedding
        
        if not jobs:
            return jsonify({
                "ok": True,
                "data": {
                    "recommendations": [],
                    "profileSummary": {"headline": "No jobs available"},
                    "skillGaps": [],
                    "careerPaths": []
                },
                "request_id": request_id
            }), 200
        
        logger.info(f"🎯 [{request_id}] Comprehensive recommendation for {profile.get('name', 'User')} (LLM: {use_llm_ranking})")
        
        result = recommender.recommend(
            profile=profile,
            jobs=jobs,
            top_k=top_k,
            include_career_paths=include_career_paths,
            include_skill_gaps=include_skill_gaps,
            use_llm_ranking=use_llm_ranking,  # Pass the LLM flag
            target_category=target_category,
            profile_embedding=profile_embedding
        )
        
        result["request_id"] = request_id
        
        logger.info(f"✅ [{request_id}] Returned {len(result.get('recommendations', []))} recommendations")
        return jsonify({"ok": True, "data": result}), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Recommendation error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)

@app.route('/chat', methods=['POST'])
def chat_endpoint():
    """
    Chat endpoint for AI Career Counselor.
    """
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not (SERVICES_READY and llm_service):
        return create_error_response("AI Chat Service not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['messages'])
        if error:
            return create_error_response(error[0], error[1], request_id)
            
        messages = data['messages']
        profile_context = data.get('profile_context') # Dict or None
        
        # Format profile context as string if it's a dict
        context_str = None
        if profile_context:
            context_str = json.dumps(profile_context, indent=2) if isinstance(profile_context, dict) else str(profile_context)
            
        logger.info(f"💬 [{request_id}] AI Counselor Chat Request")
        response = llm_service.get_chat_response(messages, profile_context=context_str)
        
        return jsonify({
            "ok": True,
            "response": response,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Chat error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/generate-roadmap', methods=['POST'])
def generate_roadmap():
    """
    Generate personalized learning roadmap.
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        data, error = validate_request_json(['profile', 'goal'])
        if error:
            return create_error_response(error[0], error[1], request_id)
            
        profile = data['profile']
        goal = data['goal']
        hours = data.get('hours_per_week', 10)
        
        from services.roadmap_generator import RoadmapGenerator
        generator = RoadmapGenerator()
        
        logger.info(f"🗺️ [{request_id}] Generating roadmap for '{goal}'")
        roadmap = generator.generate_roadmap(profile, goal, hours_per_week=hours)
        
        return jsonify({
            "ok": True,
            "roadmap": roadmap,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Roadmap error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/classify-stage', methods=['POST'])
def classify_stage():
    """
    Classify user stage (NO, MORE, GOOD, WORK).
    """
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    try:
        data, error = validate_request_json(['profile'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        if not SERVICES_READY:
            return create_error_response("Classifier service not ready", 503, request_id)

            
        profile = data['profile']
        stage = classifier_service.predict_stage(profile)
        
        return jsonify({
            "ok": True,
            "stage": stage,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Stage Classify error: {e}")
        return create_error_response(str(e), 500, request_id)


@app.route('/api/classify', methods=['POST'])
def classify_profile():
    """Classify a profile into job categories."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['profile'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        profile = data['profile']
        
        from services.embedding_service import build_profile_text
        profile_text = build_profile_text(profile)
        
        if not profile_text or len(profile_text.strip()) < 20:
            return create_error_response("Profile has insufficient content", 400, request_id)
        
        probs, confidence, is_technical = classifier_service.predict_with_confidence(profile_text)
        top_categories = classifier_service.get_top_categories(profile_text, n=5)
        
        return jsonify({
            "ok": True,
            "data": {
                "probabilities": probs,
                "top_categories": [{"category": cat, "probability": prob} for cat, prob in top_categories],
                "confidence_level": confidence,
                "is_technical": is_technical,
                "primary_category": top_categories[0][0] if top_categories else None
            },
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Classification error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/generate-embeddings', methods=['POST'])
def generate_job_embeddings():
    """
    Trigger embedding generation for jobs.
    Called by backend after fetching new jobs.
    """
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    try:
        data = request.json or {}
        jobs = data.get('jobs', [])
        
        if not jobs:
            # If no jobs provided, we just signal success (warm-up)
            return jsonify({
                "ok": True, 
                "message": "AI Service is warmed up. Send jobs in 'jobs' field for pre-computation.",
                "request_id": request_id
            }), 200
            
        logger.info(f"⚡ [{request_id}] Pre-computing embeddings for {len(jobs)} jobs")
        
        # This will populate RecommenderEngine's internal cache
        recommender._prepare_job_embeddings(jobs)
        
        return jsonify({
            "ok": True,
            "count": len(jobs),
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Embedding generation error: {e}")
        return create_error_response(str(e), 500, request_id)


@app.route('/api/skill-gaps', methods=['POST'])
def analyze_skill_gaps():
    """Analyze skill gaps for a profile against job requirements."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['profile', 'jobs'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        profile = data['profile']
        jobs = data['jobs']
        
        profile_skills = profile.get('skills', [])
        if isinstance(profile_skills, str):
            profile_skills = [s.strip() for s in profile_skills.split(',')]
        
        jobs_with_scores = [(job, {"final_score": 0.5}) for job in jobs]
        
        result = skill_gap_analyzer.analyze_skill_gaps(
            profile_skills=profile_skills,
            jobs_with_scores=jobs_with_scores,
            top_n=15
        )
        
        if result.get('top_gaps'):
            roadmap = skill_gap_analyzer.create_learning_roadmap(
                skill_gaps=result['top_gaps'],
                available_time_weekly_hours=data.get('weekly_learning_hours', 10)
            )
            result['learning_roadmap'] = roadmap
        
        return jsonify({
            "ok": True,
            "data": result,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Skill gap analysis error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/generate-test', methods=['POST'])
def generate_test():
    """
    Generate adaptive technical test.
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        data, error = validate_request_json(['domain'])
        if error:
            return create_error_response(error[0], error[1], request_id)
            
        domain = data['domain']
        difficulty = data.get('difficulty', 'Medium')
        num_questions = data.get('num_questions', 10)
        
        from services.test_generator import TestGenerator
        generator = TestGenerator()
        
        logger.info(f"📝 [{request_id}] Generating test for {domain} ({difficulty})")
        test = generator.generate_test(domain, difficulty, num_questions)
        
        return jsonify({
            "ok": True,
            "test": test,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Test gen error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)

@app.route('/api/readiness-score', methods=['POST'])
def calculate_readiness():
    """
    Calculate Industry Readiness Score (CRI).
    """
    request_id = str(uuid.uuid4())[:8]
    
    try:
        data, error = validate_request_json(['profile'])
        if error:
            return create_error_response(error[0], error[1], request_id)
            
        profile = data['profile']
        test_results = data.get('test_results', [])
        roadmap_progress = data.get('roadmap_progress', 0)
        
        from services.readiness_calculator import ReadinessCalculator
        calculator = ReadinessCalculator()
        
        result = calculator.calculate_score(profile, test_results, roadmap_progress)
        
        return jsonify({
            "ok": True,
            "data": result,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Readiness calc error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/career-paths', methods=['POST'])
def get_career_paths():
    """Get career path suggestions for a profile."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    
    try:
        data, error = validate_request_json(['profile'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        profile = data['profile']
        target_category = data.get('target_category')
        
        from services.embedding_service import build_profile_text
        profile_text = build_profile_text(profile)
        
        top_categories = classifier_service.get_top_categories(profile_text, n=3)
        current_category = top_categories[0][0] if top_categories else "Backend Developer"
        
        profile_skills = profile.get('skills', [])
        if isinstance(profile_skills, str):
            profile_skills = [s.strip() for s in profile_skills.split(',')]
        
        experience_years = profile.get('experience_years', 0)
        
        paths = career_path_analyzer.get_career_paths(
            current_category=current_category,
            experience_years=experience_years,
            profile_skills=profile_skills,
            target_category=target_category,
            max_paths=data.get('max_paths', 3)
        )
        
        return jsonify({
            "ok": True,
            "data": {
                "current_category": current_category,
                "experience_years": experience_years,
                "career_paths": paths,
                "classification": [{"category": cat, "probability": prob} for cat, prob in top_categories]
            },
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Career path error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/learning-recommendations', methods=['POST'])
def get_learning_recommendations():
    """Get learning recommendations for specific skills."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()
    
    if not SERVICES_READY:
        return create_error_response("Services not ready", 503, request_id)

    try:
        data, error = validate_request_json(['skills'])
        if error:
            return create_error_response(error[0], error[1], request_id)
        
        skills = data['skills']
        current_level = data.get('current_level', 'beginner')
        
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',')]
        
        recommendations = []
        for skill in skills[:10]:
            rec = skill_gap_analyzer.get_learning_recommendations(
                skill=skill,
                current_level=current_level
            )
            recommendations.append(rec)
        
        return jsonify({
            "ok": True,
            "data": {
                "recommendations": recommendations,
                "count": len(recommendations)
            },
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Learning recommendations error: {e}")
        traceback.print_exc()
        return create_error_response(str(e), 500, request_id)


@app.route('/api/chat', methods=['POST'])
def chat_with_mentor():
    """Chat with the AI Mentor using profile context."""
    request_id = str(uuid.uuid4())[:8]
    initialize_services()

    try:
        data = request.json
        if not data or 'message' not in data:
            return create_error_response("Message is required", 400, request_id)
            
        message = data['message']
        profile_context = data.get('context', "")
        
        # Enforce character limit to prevent abuse
        if len(message) > 1000:
            message = message[:1000]
            
        response_text = llm_service.generate_career_advice(profile_context, message)
        
        return jsonify({
            "ok": True,
            "reply": response_text,
            "request_id": request_id
        }), 200
        
    except Exception as e:
        logger.error(f"❌ [{request_id}] Chat error: {e}")
        return create_error_response(str(e), 500, request_id)


@app.errorhandler(404)
def not_found(e):
    return jsonify({"ok": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"ok": False, "error": "Internal server error"}), 500


if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("🚀 AI Career Advisor API Server v2.0")
    logger.info("   Mode: Interactive / On-Demand Loading")
    logger.info("   Model: all-MiniLM-L6-v2 (384-dim embeddings)")
    logger.info("   Features: Recommendations, Career Paths, Skill Gaps")
    logger.info("=" * 60)

    
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'true').lower() == 'true'
    
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

