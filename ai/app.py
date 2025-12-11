from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

from services.embedding_service import EmbeddingService
from services.recommendation_engine import RecommendationEngine
from services.resume_parser import ResumeParser

# Initialize services
embedding_service = EmbeddingService()
recommendation_engine = RecommendationEngine()
resume_parser = ResumeParser()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "AI service running"}), 200

@app.route('/generate-embedding', methods=['POST'])
def generate_embedding():
    """Job description ya resume text ka embedding generate karo"""
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "Text required"}), 400
        
        embedding = embedding_service.generate_embedding(text)
        
        return jsonify({
            "embedding": embedding.tolist(),
            "success": True
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/parse-resume', methods=['POST'])
def parse_resume():
    """Resume upload karke parse karo"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        # Parse karo
        extracted_data = resume_parser.parse_resume(file)
        
        return jsonify({
            "success": True,
            "data": extracted_data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/recommend-jobs', methods=['POST'])
def recommend_jobs():
    """User profile ke basis pe jobs recommend karo"""
    try:
        data = request.json
        user_profile = data.get('profile', {})
        all_jobs = data.get('jobs', [])
        top_k = data.get('top_k', 10)
        
        recommendations = recommendation_engine.get_recommendations(
            user_profile, 
            all_jobs, 
            top_k
        )
        
        return jsonify({
            "success": True,
            "recommendations": recommendations
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
