# 🧠 AI-Based Career Advisor — System Architecture

> **Top 0.1% Architecture Documentation**  
> A full-stack, AI-powered career advisory platform with semantic job matching, LLM-driven mentoring, skill-gap analysis, adaptive testing, and personalized roadmap generation.

---

## 1. 🗺️ High-Level System Overview

```mermaid
graph TB
    subgraph CLIENT["🌐 Client Layer"]
        BROWSER["👤 User Browser\nReact SPA · Port 3000"]
    end

    subgraph ORCHESTRATION["⚙️ Orchestration & API Gateway"]
        BACKEND["🟢 Node.js / Express\nBackend API · Port 8000"]
    end

    subgraph AI_ENGINE["🤖 AI Intelligence Engine"]
        FLASK["🐍 Python / Flask\nAI Microservice · Port 5001"]
    end

    subgraph DATA["🗄️ Data Layer"]
        MONGO[("🍃 MongoDB\nAtlas / Local")]
        UPLOADS["📁 File Storage\nuploads/ (Multer)"]
    end

    subgraph EXTERNAL["☁️ External Services"]
        OPENROUTER["🔁 OpenRouter API\nLLM Gateway"]
        GEMINI["✨ Google Gemini\nLLM Fallback"]
        ADZUNA["🔎 Adzuna API\nJob Boards"]
        THEMUSE["🔎 TheMuse API\nJob Boards"]
        JOOBLE["🔎 Jooble API\nJob Boards"]
        MPNET["🧬 SentenceTransformers\nall-mpnet-base-v2"]
    end

    BROWSER -- "REST · HTTP/JSON\nCORS Enabled" --> BACKEND
    BROWSER -- "Direct AI calls\n(Resume parse, Chat)" --> FLASK
    BACKEND -- "Async AI Bridge\nHTTP/JSON" --> FLASK
    BACKEND -- "Mongoose ODM" --> MONGO
    BACKEND -- "File Uploads\nMulter" --> UPLOADS
    FLASK -- "Embedding Model\n(local inference)" --> MPNET
    FLASK -- "LLM API Calls\nfallback chain" --> OPENROUTER
    FLASK -- "LLM Fallback" --> GEMINI
    BACKEND -- "Job Ingestion\nREST APIs" --> ADZUNA
    BACKEND -- "Job Ingestion\nREST APIs" --> THEMUSE
    BACKEND -- "Job Ingestion\nREST APIs" --> JOOBLE

    style CLIENT fill:#1a1a2e,stroke:#4fc3f7,color:#e0f7fa
    style ORCHESTRATION fill:#0d2137,stroke:#26c6da,color:#e0f7fa
    style AI_ENGINE fill:#1b0a24,stroke:#ce93d8,color:#f3e5f5
    style DATA fill:#0a1a0f,stroke:#66bb6a,color:#e8f5e9
    style EXTERNAL fill:#1a1200,stroke:#ffca28,color:#fff8e1
```

---

## 2. 🎨 Frontend Architecture (React SPA)

```mermaid
graph TD
    subgraph REACT["⚛️ React App  ·  Port 3000"]
        direction TB

        subgraph ROUTES["📍 Pages / Routes"]
            HOME["🏠 Home.jsx\nLanding & Upload"]
            DASH["📊 Dashboard.jsx\nUser Overview"]
            CHAT["💬 Chat.jsx\nAI Career Mentor"]
            ROAD["🗺️ Roadmap.jsx\nLearning Roadmap"]
            MATCH["🎯 TechJobMatch.jsx\nJob Recommendations"]
            SKILLS["⚡ SkillGapTests.jsx\nSkill Gap Analysis"]
            PROFILE["🔍 ProfileIntelligence.jsx\nProfile Insights"]
            TEST["📝 Test.jsx\nAdaptive Tech Test"]
        end

        subgraph COMPONENTS["🧩 Shared Components"]
            NAVBAR["🔼 Navbar.jsx"]
            SIDEBAR["📌 Sidebar.jsx"]
            SIGNIN["🔑 Signin.jsx"]
            SIGNUP["📋 Signup.jsx"]
        end

        subgraph STATE["💾 State & Config"]
            APPJS["App.js\n(Router + Layout)"]
        end
    end

    APPJS --> NAVBAR
    APPJS --> SIDEBAR
    APPJS --> HOME
    APPJS --> DASH
    APPJS --> CHAT
    APPJS --> ROAD
    APPJS --> MATCH
    APPJS --> SKILLS
    APPJS --> PROFILE
    APPJS --> TEST
    APPJS --> SIGNIN
    APPJS --> SIGNUP

    style REACT fill:#0d1a2e,stroke:#4fc3f7,color:#e0f7fa
    style ROUTES fill:#0a1730,stroke:#29b6f6,color:#e0f7fa
    style COMPONENTS fill:#0a1730,stroke:#26c6da,color:#b3e5fc
    style STATE fill:#07101f,stroke:#0288d1,color:#b3e5fc
```

### Frontend → Backend API Mapping

| Page | Backend Endpoint | Method |
|---|---|---|
| `Home.jsx` | `/api/resume/upload` | `POST` |
| `Dashboard.jsx` | `/api/user/profile`, `/api/jobs` | `GET` |
| `TechJobMatch.jsx` | `/api/jobs`, AI `/api/recommend` | `GET/POST` |
| `SkillGapTests.jsx` | AI `/api/skill-gaps` | `POST` |
| `Roadmap.jsx` | `/api/roadmap/*`, AI `/generate-roadmap` | `GET/POST` |
| `Test.jsx` | `/api/test/*`, AI `/generate-test` | `GET/POST` |
| `Chat.jsx` | `/api/chat/*`, AI `/api/chat` | `POST` |
| `ProfileIntelligence.jsx` | AI `/api/classify`, `/api/career-paths` | `POST` |

---

## 3. 🟢 Backend Architecture (Node.js / Express)

```mermaid
graph TD
    subgraph BACKEND["🟢 Express Server  ·  Port 8000"]
        direction TB

        subgraph MIDDLEWARE_LAYER["🛡️ Middleware Stack"]
            CORS_MW["CORS\nOrigin Whitelist"]
            AUTH_MW["JWT Auth\ncheckForAuthenticationCookie"]
            BODY_MW["Body Parser\n+ Cookie Parser"]
            UPLOAD_MW["Multer\nFile Upload Handler"]
            ERR_MW["Global Error\nHandler"]
        end

        subgraph ROUTES_LAYER["🛤️ Route Layer"]
            USER_R["/api/user\nuserRoute.js"]
            JOB_R["/api/jobs\njobRoute.js"]
            RESUME_R["/api/resume\nresumeRoute.js"]
            ROAD_R["/api/roadmap\nroadmapRoute.js"]
            TEST_R["/api/test\ntestRoute.js"]
            CHAT_R["/api/chat\nchatRoute.js"]
        end

        subgraph MODELS_LAYER["📦 Mongoose Models"]
            M_USER["User.js\n(Auth + Credentials)"]
            M_PROFILE["UserProfile.js\n(Skills, Experience)"]
            M_JOB["Job.js\n(Listings + Embeddings)"]
            M_RESUME["Resume.js\n(File Meta + ParsedData)"]
            M_CHAT["ChatHistory.js\n(Conversation Logs)"]
            M_ROADMAP["TrainingRoadmap.js\n(Learning Plans)"]
            M_REC["Recommendation.js\n(Match Results)"]
            M_RESULT["Result.js\n(Test Scores)"]
            M_SKILL["Skill.js\n(Taxonomy)"]
            M_TEST["Test.js\n(Question Bank)"]
        end

        subgraph CRON_LAYER["⏰ Cron Jobs"]
            JOB_CRON["jobCron.js\nAutomated Job Ingestion\nnode-cron"]
        end

        subgraph SERVICES_LAYER["🔧 Backend Services"]
            AI_BRIDGE["AI Bridge Service\nHTTP → Flask AI Engine"]
            EXT_JOBS["External Job APIs\nAdzuna · TheMuse · Jooble"]
        end
    end

    CORS_MW --> AUTH_MW --> BODY_MW --> ROUTES_LAYER
    USER_R --> M_USER
    USER_R --> M_PROFILE
    JOB_R --> M_JOB
    RESUME_R --> M_RESUME
    RESUME_R --> AI_BRIDGE
    CHAT_R --> M_CHAT
    CHAT_R --> AI_BRIDGE
    ROAD_R --> M_ROADMAP
    ROAD_R --> AI_BRIDGE
    TEST_R --> M_TEST
    TEST_R --> M_RESULT
    TEST_R --> AI_BRIDGE
    JOB_CRON --> EXT_JOBS
    JOB_CRON --> M_JOB

    style BACKEND fill:#0d2137,stroke:#26c6da,color:#e0f7fa
    style MIDDLEWARE_LAYER fill:#0a1a2a,stroke:#0288d1,color:#b3e5fc
    style ROUTES_LAYER fill:#0a1a2a,stroke:#26c6da,color:#b3e5fc
    style MODELS_LAYER fill:#0a1a2a,stroke:#00acc1,color:#b3e5fc
    style CRON_LAYER fill:#0a1a2a,stroke:#00bcd4,color:#b3e5fc
    style SERVICES_LAYER fill:#0a1a2a,stroke:#0097a7,color:#b3e5fc
```

---

## 4. 🤖 AI Engine Architecture (Python / Flask)

```mermaid
graph TD
    subgraph AI["🐍 Flask AI Microservice  ·  Port 5001"]
        direction TB

        subgraph API_ENDPOINTS["🌐 REST Endpoints"]
            EP1["GET  /health"]
            EP2["POST /parse-resume"]
            EP3["POST /recommend (legacy)"]
            EP4["POST /api/recommend"]
            EP5["POST /api/classify"]
            EP6["POST /api/skill-gaps"]
            EP7["POST /api/career-paths"]
            EP8["POST /chat"]
            EP9["POST /api/chat"]
            EP10["POST /generate-roadmap"]
            EP11["POST /generate-test"]
            EP12["POST /api/readiness-score"]
            EP13["POST /api/classify-stage"]
            EP14["GET  /api/status"]
        end

        subgraph SERVICES["🧠 AI Service Layer (Lazy-Loaded)"]
            EMBED["EmbeddingService\nall-mpnet-base-v2\n768-dim vectors"]
            LLM["LLMService\nOpenRouter + Gemini\nFallback Chain"]
            CLASSIFY["ClassifierService\nZero-shot Category\nClassification"]
            RECOMM["RecommenderEngine\nCosine Similarity +\nWeighted Scoring"]
            SKILL_GAP["SkillGapAnalyzer\nGap Detection +\nLearning Roadmap"]
            CAREER["CareerPathAnalyzer\nPath Progression\nSuggestions"]
            RESUME["ResumeParser\nPDF + DOCX\nNLP Extraction"]
            ROAD_GEN["RoadmapGenerator\nPersonalized\nLearning Plans"]
            TEST_GEN["TestGenerator\nAdaptive MCQ\nGeneration"]
            READY["ReadinessCalculator\nCRI Score (0-100)"]
            EXPLAIN["ExplainabilityService\nMatch Reasoning\n+ Insights"]
            SIMIL["SimilarityEngine\nCosine + Jaccard\nHybrid Scoring"]
        end

        subgraph MODELS_ML["🏗️ ML Model Artifacts"]
            MPNET_MODEL["SentenceTransformer\nall-mpnet-base-v2\n(local weights)"]
            SKILL_TAXONOMY["Skill Taxonomy\nCategory Mapping\nJSON Knowledge Base"]
        end

        subgraph INIT["⚙️ Lifecycle"]
            LAZY_INIT["Lazy Initialization\non first request\n< 1s cold start"]
            GLOBAL_STATE["Global Service\nRegistry\n(singleton pattern)"]
        end
    end

    EP2 --> RESUME
    EP2 --> EMBED
    EP3 --> RECOMM
    EP4 --> RECOMM
    EP4 --> SKILL_GAP
    EP4 --> CAREER
    EP5 --> CLASSIFY
    EP6 --> SKILL_GAP
    EP7 --> CAREER
    EP7 --> CLASSIFY
    EP8 --> LLM
    EP9 --> LLM
    EP10 --> ROAD_GEN
    EP11 --> TEST_GEN
    EP12 --> READY
    EP13 --> CLASSIFY

    RECOMM --> EMBED
    RECOMM --> CLASSIFY
    RECOMM --> SIMIL
    RECOMM --> EXPLAIN
    RECOMM --> SKILL_GAP
    RECOMM --> CAREER
    CLASSIFY --> EMBED
    EMBED --> MPNET_MODEL
    CLASSIFY --> SKILL_TAXONOMY

    LAZY_INIT --> EMBED
    LAZY_INIT --> LLM
    LAZY_INIT --> CLASSIFY
    LAZY_INIT --> RECOMM
    LAZY_INIT --> GLOBAL_STATE

    style AI fill:#1b0a24,stroke:#ce93d8,color:#f3e5f5
    style API_ENDPOINTS fill:#180820,stroke:#ab47bc,color:#e1bee7
    style SERVICES fill:#180820,stroke:#9c27b0,color:#e1bee7
    style MODELS_ML fill:#180820,stroke:#7b1fa2,color:#ce93d8
    style INIT fill:#0f0515,stroke:#6a1b9a,color:#ce93d8
```

---

## 5. 🔄 Core Data Flow — Job Recommendation Pipeline

```mermaid
sequenceDiagram
    actor U as 👤 User
    participant FE as ⚛️ React Frontend
    participant BE as 🟢 Express Backend
    participant AI as 🐍 Flask AI Engine
    participant DB as 🍃 MongoDB
    participant LLM as ☁️ OpenRouter/Gemini

    U->>FE: Upload Resume (PDF/DOCX)
    FE->>BE: POST /api/resume/upload (multipart)
    BE->>DB: Save file metadata → Resume model
    BE->>AI: POST /parse-resume {filePath}
    AI->>AI: ResumeParser → extract skills, experience, education
    AI->>AI: EmbeddingService → encode profile (768-dim vector)
    AI-->>BE: {profile, embedding}
    BE->>DB: Save profile → UserProfile model

    U->>FE: Request Job Recommendations
    FE->>BE: GET /api/jobs (fetch listings)
    BE->>DB: Query Job collection
    DB-->>BE: Job listings + embeddings
    BE->>AI: POST /api/recommend {profile, jobs, top_k}
    
    Note over AI: RecommenderEngine Pipeline
    AI->>AI: ClassifierService → classify profile category
    AI->>AI: SimilarityEngine → cosine similarity (profile ↔ jobs)
    AI->>AI: SkillGapAnalyzer → detect missing skills
    AI->>AI: CareerPathAnalyzer → suggest paths
    AI->>AI: ExplainabilityService → generate match reasoning
    
    opt LLM Ranking Enabled
        AI->>LLM: Re-rank via LLM inference
        LLM-->>AI: Ranked results
    end
    
    AI-->>BE: {recommendations, skillGaps, careerPaths, profileSummary}
    BE->>DB: Save → Recommendation model
    BE-->>FE: Paginated recommendations + insights
    FE-->>U: 🎯 Personalized Dashboard
```

---

## 6. 💬 AI Chat / Mentor Flow

```mermaid
sequenceDiagram
    actor U as 👤 User
    participant FE as ⚛️ Chat.jsx
    participant BE as 🟢 chatRoute.js
    participant DB as 🍃 ChatHistory
    participant AI as 🐍 Flask LLMService
    participant OR as 🔁 OpenRouter API
    participant GEM as ✨ Gemini API

    U->>FE: Send career question
    FE->>BE: POST /api/chat {message, context}
    BE->>DB: Load chat history (last N turns)
    BE->>AI: POST /api/chat {messages, profile_context}
    
    Note over AI: LLM Fallback Chain
    AI->>OR: Primary: OpenRouter (claude/gpt/mistral)
    alt OpenRouter success
        OR-->>AI: Career advice response
    else OpenRouter fails
        AI->>GEM: Fallback: Google Gemini
        GEM-->>AI: Career advice response
    end
    
    AI-->>BE: {reply}
    BE->>DB: Persist → ChatHistory model
    BE-->>FE: Streamed response
    FE-->>U: 💬 AI Mentor reply
```

---

## 7. ⏰ Automated Job Ingestion Flow

```mermaid
flowchart LR
    subgraph CRON["⏰ node-cron Scheduler"]
        direction TB
        TRIGGER["Scheduled Trigger\n(configurable interval)"]
    end

    subgraph SOURCES["🔎 Job Board APIs"]
        A["Adzuna API"]
        B["TheMuse API"]
        C["Jooble API"]
    end

    subgraph PIPELINE["⚙️ Processing Pipeline"]
        FETCH["Fetch Raw Jobs"]
        NORMALIZE["Normalize Schema\n(title, skills, category)"]
        EMBED_JOB["Request Embedding\nfrom AI Engine"]
        UPSERT["Upsert to MongoDB\n(dedup by source_link)"]
    end

    subgraph STORE["🍃 MongoDB"]
        JOBS_COL["Job Collection\n+ vector embeddings"]
    end

    TRIGGER --> FETCH
    A --> FETCH
    B --> FETCH
    C --> FETCH
    FETCH --> NORMALIZE
    NORMALIZE --> EMBED_JOB
    EMBED_JOB --> UPSERT
    UPSERT --> JOBS_COL

    style CRON fill:#1a1200,stroke:#ffca28,color:#fff8e1
    style SOURCES fill:#1a1200,stroke:#ffa000,color:#fff8e1
    style PIPELINE fill:#1a0a00,stroke:#ff8f00,color:#ffe0b2
    style STORE fill:#0a1a0f,stroke:#66bb6a,color:#e8f5e9
```

---

## 8. 🧬 AI Services Dependency Graph

```mermaid
graph LR
    subgraph CORE["Core Infrastructure"]
        EMBED_SVC["EmbeddingService\nall-mpnet-base-v2\n768-dim"]
        LLM_SVC["LLMService\nOpenRouter / Gemini\nfallback chain"]
    end

    subgraph INTELLIGENCE["Reasoning Layer"]
        CLASS_SVC["ClassifierService\nCategory prediction\n+ confidence score"]
        SIMIL_SVC["SimilarityEngine\nCosine + Jaccard\nhybrid scoring"]
        EXPLAIN_SVC["ExplainabilityService\nHuman-readable\nmatch rationale"]
    end

    subgraph ANALYSIS["Analysis Layer"]
        SKILL_SVC["SkillGapAnalyzer\nMissing skills\nlearning roadmap"]
        CAREER_SVC["CareerPathAnalyzer\nProgression paths\ntimeline estimates"]
        READY_SVC["ReadinessCalculator\nCRI Score\n(0-100 composite)"]
    end

    subgraph GENERATION["Generation Layer"]
        RECOMM_SVC["RecommenderEngine\n(orchestrator)"]
        ROAD_SVC["RoadmapGenerator\nWeekly milestones\ncourse suggestions"]
        TEST_SVC["TestGenerator\nAdaptive MCQs\nby domain + level"]
        RESUME_SVC["ResumeParser\nPDF / DOCX\nNLP extraction"]
    end

    EMBED_SVC --> CLASS_SVC
    EMBED_SVC --> SIMIL_SVC
    EMBED_SVC --> RECOMM_SVC

    CLASS_SVC --> RECOMM_SVC
    SIMIL_SVC --> RECOMM_SVC
    EXPLAIN_SVC --> RECOMM_SVC

    RECOMM_SVC --> SKILL_SVC
    RECOMM_SVC --> CAREER_SVC

    LLM_SVC -.->|"optional\nLLM rerank"| RECOMM_SVC
    LLM_SVC --> ROAD_SVC
    LLM_SVC --> TEST_SVC

    EMBED_SVC --> RESUME_SVC

    style CORE fill:#0d0d1a,stroke:#5c6bc0,color:#e8eaf6
    style INTELLIGENCE fill:#0d1a0d,stroke:#43a047,color:#e8f5e9
    style ANALYSIS fill:#1a0d00,stroke:#ef6c00,color:#fff3e0
    style GENERATION fill:#1a001a,stroke:#ab47bc,color:#f3e5f5
```

---

## 9. 🗄️ Database Schema (MongoDB Collections)

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string name
        string email
        string password_hash
        string role
        date createdAt
    }
    USERPROFILE {
        ObjectId _id PK
        ObjectId userId FK
        string[] skills
        number experience_years
        string education
        string[] certifications
        float[] embedding
    }
    JOB {
        ObjectId _id PK
        string title
        string company
        string description
        string location
        string type
        string[] required_skills
        string category
        number experience_required
        float[] embeddings
        string source
        string apply_url
        date posted_at
    }
    RESUME {
        ObjectId _id PK
        ObjectId userId FK
        string filePath
        string parsedData
        date uploadedAt
    }
    RECOMMENDATION {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId[] jobIds FK
        float[] scores
        string[] explanations
        date generatedAt
    }
    CHATHISTORY {
        ObjectId _id PK
        ObjectId userId FK
        string role
        string content
        date timestamp
    }
    TRAININGROADMAP {
        ObjectId _id PK
        ObjectId userId FK
        string goal
        object[] milestones
        number progress
        date createdAt
    }
    RESULT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId testId FK
        number score
        object[] answers
        date takenAt
    }
    TEST {
        ObjectId _id PK
        string domain
        string difficulty
        object[] questions
    }

    USER ||--o{ USERPROFILE : "has"
    USER ||--o{ RESUME : "uploads"
    USER ||--o{ CHATHISTORY : "messages"
    USER ||--o{ RECOMMENDATION : "receives"
    USER ||--o{ TRAININGROADMAP : "follows"
    USER ||--o{ RESULT : "scores"
    RECOMMENDATION }o--o{ JOB : "references"
    TEST ||--o{ RESULT : "generates"
```

---

## 10. 🔐 Security & Auth Architecture

```mermaid
flowchart TD
    subgraph AUTH["🔐 Authentication Flow"]
        REGISTER["POST /api/user/signup"]
        LOGIN["POST /api/user/signin"]
        JWT_ISSUE["Issue JWT Token\n(httpOnly Cookie)"]
        COOKIE["Cookie Storage\n(token, SameSite)"]
    end

    subgraph GUARD["🛡️ Route Guard"]
        MW_CHECK["checkForAuthenticationCookie\nmiddleware"]
        JWT_VERIFY["JWT.verify()\ntoken validation"]
        REQ_USER["req.user → populated"]
        NEXT["next() → proceed"]
        BLOCK["401 Unauthorized"]
    end

    subgraph PROTECTED["🔒 Protected Resources"]
        PROFILE_R["User Profile APIs"]
        RESUME_ACCESS["Resume File Access\n/uploads/:userId/:file"]
        RECOMMEND_R["Recommendation APIs"]
        ROADMAP_R["Roadmap APIs"]
    end

    REGISTER --> JWT_ISSUE
    LOGIN --> JWT_ISSUE
    JWT_ISSUE --> COOKIE
    COOKIE --> MW_CHECK
    MW_CHECK --> JWT_VERIFY
    JWT_VERIFY -- "valid" --> REQ_USER --> NEXT --> PROTECTED
    JWT_VERIFY -- "invalid/expired" --> BLOCK

    PROFILE_R & RESUME_ACCESS & RECOMMEND_R & ROADMAP_R --> PROTECTED

    style AUTH fill:#1a0a0a,stroke:#ef5350,color:#ffebee
    style GUARD fill:#1a0a0a,stroke:#e57373,color:#ffcdd2
    style PROTECTED fill:#0a1a0a,stroke:#66bb6a,color:#e8f5e9
```

---

## 11. 🏗️ Deployment & Infrastructure View

```mermaid
graph TB
    subgraph LOCAL["💻 Local Development (Current)"]
        direction LR
        FE_LOCAL["React Dev Server\nlocalhost:3000\nnpm run start"]
        BE_LOCAL["Express Server\nlocalhost:8000\nnodemon server.js"]
        AI_LOCAL["Flask Server\nlocalhost:5001\npython app.py"]
        DB_LOCAL[("MongoDB\n(Atlas / Local)")]
        START_BAT["start_all.bat\nProcess Orchestrator"]
    end

    START_BAT -.->|"spawns"| FE_LOCAL
    START_BAT -.->|"spawns"| BE_LOCAL
    START_BAT -.->|"spawns"| AI_LOCAL
    BE_LOCAL --> DB_LOCAL
    AI_LOCAL --> DB_LOCAL

    subgraph ENV_FILES["📄 Config"]
        BE_ENV["backend/.env\nMONGO_URL, JWT_SECRET\nExternal API Keys"]
        AI_ENV["ai/.env\nOPENROUTER_API_KEY\nGEMINI_API_KEY"]
    end

    BE_ENV -.-> BE_LOCAL
    AI_ENV -.-> AI_LOCAL

    style LOCAL fill:#0a0a1a,stroke:#4db6ac,color:#e0f2f1
    style ENV_FILES fill:#1a1a0a,stroke:#ffee58,color:#fffff0
```

---

## 12. 📊 Technology Stack Summary

| Layer | Technology | Version / Details |
|---|---|---|
| **Frontend** | React.js | SPA · JSX · CSS Modules |
| **Routing** | React Router | Client-side routing |
| **Backend** | Node.js + Express | v5.x · REST API |
| **Authentication** | JWT + Cookie | `jsonwebtoken` · `cookie-parser` |
| **File Uploads** | Multer | Disk storage · PDF/DOCX |
| **Database** | MongoDB + Mongoose | v8.x ODM |
| **Scheduled Jobs** | node-cron | Job board ingestion |
| **AI Framework** | Python + Flask | v3.0 · CORS enabled |
| **Embeddings** | SentenceTransformers | `all-mpnet-base-v2` · 768-dim |
| **ML** | scikit-learn + PyTorch | Cosine similarity · classification |
| **LLM Gateway** | OpenRouter API | claude, gpt, mistral (routing) |
| **LLM Fallback** | Google Gemini API | `google-generativeai` |
| **Document Parsing** | PyPDF2 + python-docx | PDF + DOCX resume parsing |
| **Node.js LLM** | OpenAI SDK + Gemini SDK | Backend-side LLM calls |
| **External Jobs** | Adzuna · TheMuse · Jooble | REST job aggregators |
| **DevOps** | `.bat` orchestrator | `start_all.bat` multi-process |

---

## 13. 🧩 Key Architectural Patterns

> [!NOTE]
> **Lazy Service Initialization** — The Flask AI Engine uses a singleton lazy-load pattern. All heavy ML models (SentenceTransformers, classifiers) are loaded only on the first request, keeping cold-start time under 1 second.

> [!TIP]
> **LLM Fallback Chain** — The `LLMService` implements a waterfall fallback: OpenRouter (primary, multiple models) → Google Gemini (secondary). This guarantees near-100% availability for chat and generation features.

> [!IMPORTANT]
> **Decoupled AI Bridge** — The Node.js backend does NOT contain any ML logic. All intelligence is delegated to the Flask microservice via HTTP. This allows the AI engine to be independently scaled, swapped, or updated without touching the core backend.

> [!NOTE]
> **Vector-First Job Matching** — Jobs in MongoDB store pre-computed 768-dim embeddings. At query time, only cosine similarity computation is needed, making recommendations sub-second even at scale.

> [!TIP]
> **Explainability-First Design** — Every recommendation includes human-readable reasoning via `ExplainabilityService`, making the AI decisions transparent and trust-building for users.

---

*Generated by Antigravity AI · April 2026 · Top 0.1% Architecture Documentation*
