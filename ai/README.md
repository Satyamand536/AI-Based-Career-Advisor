# AI Career Advisor - Recommendation Engine

Production-grade AI system for job recommendations using semantic similarity with BERT embeddings.

## 🎯 Features

- **Semantic Job Matching**: Uses Sentence-BERT (all-mpnet-base-v2) for deep semantic understanding
- **Multi-component Scoring**: Combines semantic similarity, skill overlap, category fit, and seniority match
- **Career Path Analysis**: Suggests realistic career progression trajectories
- **Skill Gap Analysis**: Identifies missing skills with prioritized learning recommendations
- **Explainable AI**: Provides human-readable explanations for every recommendation

## 🏗️ Architecture

```
ai/
├── app.py                      # Flask API server
├── services/
│   ├── embedding_service.py    # SBERT embeddings with caching
│   ├── classifier_service.py   # Resume classification (16 categories)
│   ├── similarity_engine.py    # Scoring algorithms
│   ├── recommender_engine.py   # Main orchestration pipeline
│   ├── career_path_analyzer.py # Career trajectory suggestions
│   ├── skill_gap_analyzer.py   # Skill development recommendations
│   ├── explainability.py       # Human-readable explanations
│   └── resume_parser.py        # PDF/DOCX parsing
├── requirements.txt
├── test_system.py              # Comprehensive test suite
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai
pip install -r requirements.txt
```

### 2. Run Tests

```bash
python test_system.py
```

### 3. Start the Server

```bash
python app.py
```

Server runs at `http://localhost:5001`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Comprehensive Recommendations (New)
```
POST /api/recommend
Content-Type: application/json

{
  "profile": {
    "name": "John Doe",
    "skills": ["python", "django", "postgresql"],
    "experience_years": 4,
    "education": ["B.Tech CS"],
    "rawText": "Experienced backend developer..."
  },
  "jobs": [...],
  "top_k": 20,
  "include_career_paths": true,
  "include_skill_gaps": true
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "recommendations": [
      {
        "jobId": "J001",
        "title": "Senior Python Developer",
        "matchScore": 87.5,
        "explanation": {
          "summary": "🌟 Excellent match! This role closely aligns...",
          "score_breakdown": {...},
          "skills": {"matched": [...], "missing": [...]}
        }
      }
    ],
    "profileSummary": {
      "headline": "Senior Backend Developer Profile",
      "primary_role": "Backend Developer",
      "confidence": "high"
    },
    "skillGaps": [...],
    "careerPaths": [...]
  }
}
```

### Legacy Recommendations (Backward Compatible)
```
POST /recommend
```

### Profile Classification
```
POST /api/classify
```

### Skill Gap Analysis
```
POST /api/skill-gaps
```

### Career Path Suggestions
```
POST /api/career-paths
```

## 🧠 ML Pipeline

### Stage 1: Classification
- Classifies resume into 16 job categories
- Uses semantic similarity against category prototypes
- Temperature-scaled softmax for probability distribution

### Stage 2: Embedding Generation
- Profile and job texts converted to 768-dim embeddings
- Uses all-mpnet-base-v2 for superior accuracy
- LRU caching with 10K entry capacity

### Stage 3: Scoring
Multi-component scoring formula:
```
score = 0.45 * semantic^1.5 + 0.25 * skills + 0.20 * category + 0.10 * seniority
```

### Stage 4: Filtering & Ranking
- Minimum semantic threshold: 0.12
- Minimum final score threshold: 0.08
- Returns top-K ranked jobs

### Stage 5: Analysis & Explanation
- Career path suggestions based on category and experience
- Skill gap analysis with prioritization
- Human-readable explanations for each recommendation

## 📊 Job Categories

1. Data Scientist
2. Frontend Developer
3. Backend Developer
4. Full Stack Developer
5. DevOps Engineer
6. Cloud Engineer
7. AI Engineer
8. NLP Engineer
9. Mobile App Developer
10. Blockchain Developer
11. IoT Engineer
12. QA Engineer
13. Cyber Security
14. UI/UX Designer
15. Product Manager
16. Non-Technical

## 🔧 Configuration

Edit `RecommenderEngine.CONFIG` in `recommender_engine.py`:

```python
CONFIG = {
    "min_semantic_threshold": 0.12,
    "min_final_score_threshold": 0.08,
    "non_technical_block": True,
    "low_confidence_threshold": 0.08,
    "default_top_k": 20,
    "enable_career_paths": True,
    "enable_skill_gaps": True,
    "max_career_paths": 3
}
```

## 📈 Performance

- **Model**: all-mpnet-base-v2 (768 dimensions)
- **Cache Hit Rate**: ~70-90% after warmup
- **Recommendation Time**: ~100-500ms for 50 jobs
- **Memory**: ~500MB for model + embeddings

## 🧪 Testing

Run the comprehensive test suite:

```bash
python test_system.py
```

Tests cover:
- EmbeddingService
- ClassifierService
- SimilarityEngine
- SkillGapAnalyzer
- CareerPathAnalyzer
- ExplainabilityModule
- Full Pipeline Integration

## 📝 Sample Input/Output

### Input Profile
```json
{
  "name": "Jane Smith",
  "skills": ["python", "tensorflow", "sql", "docker"],
  "experience_years": 3,
  "education": ["M.Tech AI/ML"],
  "rawText": "Data scientist with experience in ML models..."
}
```

### Output Recommendation
```json
{
  "jobId": "J006",
  "title": "Machine Learning Engineer",
  "company": "AI Labs",
  "matchScore": 82.3,
  "explanation": {
    "summary": "✅ Good match. You have the core qualifications...",
    "score_breakdown": {
      "semantic_similarity": {"score": 72.5, "label": "Content Match"},
      "skill_match": {"score": 75.0, "label": "Skill Coverage"},
      "category_fit": {"score": 85.2, "label": "Category Alignment"}
    },
    "skills": {
      "matched": ["python", "tensorflow", "sql"],
      "missing": ["pytorch", "kubernetes"],
      "coverage_percent": 60.0
    },
    "improvement_suggestions": ["Focus on developing: pytorch, kubernetes"]
  }
}
```

## 🛠️ Integration with Backend

The AI service integrates with the Node.js backend via HTTP:

```javascript
// In Node.js backend
const response = await axios.post('http://localhost:5001/api/recommend', {
  profile: userProfile,
  jobs: jobListings,
  include_career_paths: true,
  include_skill_gaps: true
});
```

## 📄 License

MIT License - See LICENSE file for details.
