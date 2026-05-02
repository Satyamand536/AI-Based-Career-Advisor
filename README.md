# AI-Based Career Advisor

An intelligent job recommendation system powered by AI that analyzes resumes and provides explainable, personalized tech job recommendations.

## 🚀 Features

- **Resume Upload & AI Parsing**: Upload PDF/DOCX resumes and extract skills, experience, education using NLP
- **Semantic Job Matching**: 384-dimensional embeddings with cosine similarity for deep skill alignment
- **Explainable Recommendations**: Transparent reasoning with matched skills, embedding scores, and experience justification
- **Multi-Factor Scoring**: Weighted algorithm (60% semantic + 30% skill match + 10% experience)
- **Secure Architecture**: User-scoped directories, file validation, rate limiting

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18+ (port 3000)
- **Backend**: Node.js + Express + MongoDB (port 8000)
- **AI Service**: Flask + sentence-transformers (all-MiniLM-L6-v2) (port 5001)

### Services
```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │─────▶│   Express   │─────▶│   Flask AI  │
│  Frontend   │◀─────│   Backend   │◀─────│   Service   │
│  (port 3000)│      │  (port 8000)│      │  (port 5001)│
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   MongoDB   │
                     └─────────────┘
```

---

## 📦 Installation

### Prerequisites
- Node.js >= 16
- Python >= 3.8
- MongoDB (local or Atlas)

### 1. Clone Repository
```bash
git clone <repository-url>
cd AI-based-career-advisor
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
MONGO_URL=mongodb://localhost:27017/career-advisor
PORT=8000
JWT_SECRET=your_secret_key_here
AI_SERVICE_URL=http://localhost:5001
```

### 3. AI Service Setup
```bash
cd ai
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `.env` file in the `ai` directory:
```env
OPENROUTER_API_KEY_B64=your_base64_encoded_openrouter_key
OPENROUTER_CHAT_API_KEY=your_openrouter_chat_api_key
```

### 4. Frontend Setup
```bash
cd front
npm install
```

---

## 🎯 Running the Application

### Start All Services (3 terminals)

**Terminal 1: Backend**
```bash
cd backend
npm run dev
```
Server runs on `http://localhost:8000`

**Terminal 2: AI Service**
```bash
cd ai
# Activate venv first
python app.py
```
Service runs on `http://localhost:5001`

**Terminal 3: Frontend**
```bash
cd front
npm start
```
Frontend runs on `http://localhost:3000`

---

## 🌱 Seeding Sample Jobs

Before using the recommendation system, populate the database with sample jobs:

```bash
cd backend

# Ensure AI service is running first!
node scripts/seedJobs.js
```

This will:
1. Connect to MongoDB
2. Generate embeddings for 25 sample tech jobs
3. Store jobs with precomputed embeddings
4. Display progress and confirmation

**Expected output:**
```
✅ Connected to MongoDB
✅ AI service is running at http://localhost:5001
🧠 Generating embeddings for jobs...
[1/25] Processing: Full Stack Developer at TechCorp Solutions
   ✅ Embedded and saved (384 dimensions)
...
✅ Seeding complete!
   Success: 25 jobs
   Total: 25 jobs processed
```

---

## 📡 API Documentation

### Authentication
All protected endpoints require JWT cookie authentication. Login via `/user/login` first.

---

### **POST** `/jobs/upload-resume`

Upload a resume (PDF/DOCX) for AI parsing and profile creation.

#### Request
```http
POST http://localhost:8000/jobs/upload-resume
Content-Type: multipart/form-data
Cookie: token=<jwt-token>

--boundary
Content-Disposition: form-data; name="resume"; filename="resume.pdf"
Content-Type: application/pdf

<binary-data>
--boundary--
```

#### Response (200 OK)
```json
{
  "ok": true,
  "profileId": "64a1e2f3c8b4a1234567890a",
  "profile": {
    "userId": "64a1e2...",
    "name": "Satyam Tiwari",
    "email": "satyam@example.com",
    "phone": "+91xxxxxxxxxx",
    "skills": ["react", "node", "express", "mongodb"],
    "experience_years": 3,
    "education": ["B.Tech Computer Science"],
    "resumePath": "uploads/64a1e2.../resume-1702345678.pdf",
    "profileEmbeddingId": "emb_64a1e2..."
  }
}
```

#### Error Responses
```json
// 401 Unauthorized
{ "ok": false, "error": "Please login first" }

// 400 Bad Request
{ "ok": false, "error": "No file uploaded" }
{ "ok": false, "error": "Only PDF and DOCX files are allowed" }

// 500 Server Error
{ "ok": false, "error": "Failed to parse resume. AI service may be unavailable." }
```

---

### **GET** `/jobs/recommendations`

Get personalized job recommendations based on user profile.

#### Request
```http
GET http://localhost:8000/jobs/recommendations?top_k=20
Cookie: token=<jwt-token>
```

#### Query Parameters
- `top_k` (optional, default: 20): Number of recommendations to return

#### Response (200 OK)
```json
{
  "ok": true,
  "recommendations": [
    {
      "jobId": "64b2c3...",
      "job": {
        "id": "64b2c3...",
        "title": "Full Stack Developer",
        "company": "TechCorp Solutions",
        "location": "Bangalore",
        "jobType": "Full-time",
        "requiredSkills": ["react", "node", "mongodb"],
        "experience_required": 2,
        "description": "We are looking for a Full Stack Developer..."
      },
      "matchScore": 87.5,
      "reason": "Strong skill match (react, node, mongodb) and experience meets requirements (3+ years)",
      "explainability": {
        "skill_matches": [
          { "skill": "react", "weight": 0.33 },
          { "skill": "node", "weight": 0.33 },
          { "skill": "mongodb", "weight": 0.33 }
        ],
        "embedding_similarity": 0.78,
        "experience_score": 1.0
      }
    }
  ]
}
```

#### Scoring Algorithm
```
Final Score = (0.6 × embedding_similarity) + (0.3 × skill_match) + (0.1 × experience_score)
```

- **Embedding Similarity**: Cosine similarity between profile and job embeddings (0–1)
- **Skill Match**: Fraction of required skills present in profile (0–1)
- **Experience Score**: Profile experience vs required experience (0–1)

#### Error Responses
```json
// 401 Unauthorized
{ "ok": false, "error": "Please login first" }

// 404 Not Found
{ "ok": false, "error": "Profile not found. Please upload your resume first." }

// 400 Bad Request
{ "ok": false, "error": "Profile embedding not found. Please re-upload your resume." }
```

---

### **GET** `/jobs/jobs`

Browse all available jobs (public endpoint).

#### Request
```http
GET http://localhost:8000/jobs/jobs?limit=50&skip=0&search=react
```

#### Query Parameters
- `limit` (optional, default: 50): Max jobs to return
- `skip` (optional, default: 0): Pagination offset
- `search` (optional): Search term for title/company/skills

#### Response
```json
{
  "ok": true,
  "jobs": [
    {
      "_id": "64b2c3...",
      "jobId": "job_001",
      "title": "Full Stack Developer",
      "company": "TechCorp Solutions",
      "location": "Bangalore",
      "jobType": "Full-time",
      "requiredSkills": ["react", "node", "mongodb"],
      "experience_required": 2,
      "description": "...",
      "postedAt": "2024-03-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "skip": 0
}
```

---

## 🗂️ Database Schemas

### UserProfile
```javascript
{
  userId: ObjectId (ref: "user", unique),
  name: String,
  email: String,
  phone: String,
  skills: [String],
  experience_years: Number,
  education: [String],
  preferredLocations: [String],
  careerGoals: String,
  resumePath: String,
  profileEmbedding: [Number],  // 384-dim vector
  createdAt: Date,
  updatedAt: Date
}
```

### Job
```javascript
{
  jobId: String (unique),
  title: String,
  company: String,
  location: String,
  jobType: String (enum: ["Full-time", "Part-time", "Remote", ...]),
  description: String,
  requiredSkills: [String],
  experience_required: Number,
  tags: [String],
  postedAt: Date,
  embedding: [Number],  // 384-dim precomputed vector
  createdAt: Date,
  updatedAt: Date
}
```

### Recommendation
```javascript
{
  userId: ObjectId (ref: "user"),
  jobId: ObjectId (ref: "job"),
  matchScore: Number (0-100),
  reason: String,
  explainability: {
    skill_matches: [{ skill: String, weight: Number }],
    embedding_similarity: Number,
    experience_score: Number
  },
  recommendedAt: Date,
  clicked: Boolean,
  applied: Boolean
}
```

---

## 🔒 Security Features

- **File Validation**: Only PDF/DOCX allowed, 5MB size limit
- **MIME Type Checking**: Server-side MIME validation
- **User-Scoped Directories**: Resumes stored in `uploads/<userId>/`
- **Sanitized Filenames**: UUIDs prevent path traversal
- **Authentication**: JWT httpOnly cookies
- **CORS**: Restricted to `http://localhost:3000`

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test
```

### Run AI Service Tests
```bash
cd ai
pytest tests/
```

### E2E Tests (Cypress)
```bash
cd front
npx cypress run
```

---

## 📊 Project Structure

```
AI-based-career-advisor/
├── backend/
│   ├── models/
│   │   ├── job.js
│   │   ├── userProfile.js
│   │   └── recommendation.js
│   ├── routes/
│   │   ├── userRoute.js
│   │   └── jobRoute.js
│   ├── utils/
│   │   └── scoring.js
│   ├── scripts/
│   │   └── seedJobs.js
│   ├── middlewares/
│   └── server.js
├── ai/
│   ├── services/
│   │   ├── resume_parser.py
│   │   └── embedding_service.py
│   ├── app.py
│   └── requirements.txt
├── front/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   └── App.js
│   └── package.json
└── README.md
```

---

## 🐛 Troubleshooting

### AI Service Not Responding
```bash
# Check if AI service is running
curl http://localhost:5001/health

# Restart AI service
cd ai
source venv/bin/activate  # or venv\Scripts\activate
python app.py
```

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod`
- Check `MONGO_URL` in `.env`

### Resume Upload Fails
- Verify file size < 5MB
- Only PDF/DOCX allowed
- Check AI service is running on port 5001

### No Recommendations
- Run seed script first: `node scripts/seedJobs.js`
- Ensure user has uploaded resume

---

## 📝 License

MIT License

---

## 👥 Contributors

Satyam Tiwari (@Satyamand536)

---

## 🔮 Future Enhancements

- [ ] Vector database (Milvus/FAISS) for scalable search
- [ ] Real-time job scraping from LinkedIn/Indeed
- [ ] Multi-resume support with version history
- [ ] Email notifications for new matching jobs
- [ ] Admin dashboard for job management
- [ ] Analytics: track clicks, applies, conversion rates
