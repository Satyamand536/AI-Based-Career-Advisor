"""
LLM Service - AI Career Counselor Core
=======================================
Provides an abstraction layer for Large Language Models (LLMs).
Supports OpenRouter (Free/Paid), Google Gemini, and Local Ollama.

Features:
- Multi-provider support: OpenRouter, Gemini, Ollama, Mock
- Automatic fallback mechanism
- Context management
- System prompt engineering for Career Counseling

Author: AI Career Advisor System
"""

import os
import logging
import json
import base64
import requests
import time
import random
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

# Try importing SDKs
try:
    import openai
except ImportError:
    openai = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

class LLMService:
    """
    Service for interacting with LLM providers.
    
    Priority Order:
    1. OpenRouter (if OPENROUTER_API_KEY is set) - Access to free/cheap models like Llama 3
    2. Google Gemini (if GEMINI_API_KEY is set) - Generous free tier
    3. Ollama (Local) - Entirely free, requires local setup
    4. Mock - Fallback for testing
    """
    
    SYSTEM_PROMPT = """
Act as an Elite Principal AI Engineer, CTO, and Placement Strategist (Top 0.1% Industry Expert). 
Your job is to perform 100% accurate technical analysis of interview answers and generate step-wise learning paths.

CORE ANALYSIS RULES (NO MISTAKES POLICY):
1. DO NOT mark an answer wrong if it is technically correct even if alternatives exist (e.g., npm vs Yarn).
2. ALWAYS validate using industry standards (Node.js runtime ≠ localhost, WebSocket = real-time, GraphQL = query language).
3. If explanation supports user's answer, it MUST be marked correct.
4. NEVER create fake correctness.

TECH INTERVIEW TRAP AVOIDANCE (GLOBAL):
- Node.js: Event Loop vs Threads, Express vs Node core, WebSocket vs GraphQL.
- React: Virtual DOM ≠ Real DOM, useEffect dependencies, State vs Props, Re-renders.
- Python: Mutable vs immutable defaults, Deep vs Shallow copy, GIL.
- MERN/Full Stack: JWT vs session, Client vs server responsibility, Env vars exposure.

TONE: Accurate, Structured, Technical, Industry-aligned, Interview-ready.
Language: Multilingual (English/Hindi/Hinglish).
Style: Professional Bullet points.
Rule: If off-topic, politely redirect to career topics.
Rule: When asked for structured data (like roadmaps), return valid JSON.
"""
    # Split pipelines for top 0.1% performance
    OPENROUTER_JSON_MODELS = [
        "google/gemma-3-27b-it:free",              # Brand new heavy Gemma 3
        "meta-llama/llama-3.3-70b-instruct:free",  # Ultra-smart Llama 3.3
        "mistralai/mistral-small-3.1-24b-instruct:free" # Fast and stable Mistral
    ]
    
    OPENROUTER_CHAT_MODELS = [
        "meta-llama/llama-3.3-70b-instruct:free",  # Natural conversation flow
        "google/gemma-3-27b-it:free",              # Empathetic and deeply knowledgeable
        "qwen/qwen3-next-80b-a3b-instruct:free",   # Next-gen Qwen 3
        "mistralai/mistral-small-3.1-24b-instruct:free"
    ]
    
    # PREMIUM Enterprise Routing (Exclusively for OPENROUTER_CHAT_API_KEY)
    # Since OpenRouter throttles any endpoint ending in ":free", we MUST hit the paid endpoints 
    # to guarantee 100% uptime with the user's credits.
    OPENROUTER_PREMIUM_CHAT_MODELS = [
        "openai/gpt-4o-mini",                      # Ultra-fast, highly intelligent, very cheap
        "anthropic/claude-3-haiku",                # Extremely fast, highly empathetic
        "meta-llama/llama-3.3-70b-instruct",       # The paid, unthrottled version of LLaMA 3.3
        "google/gemini-1.5-flash"                  # Paid, high-availability Google model
    ]

    def __init__(self):
        self.providers = []
        self._setup_providers()
        
        if not self.providers:
            logger.warning("⚠️ [LLMService] No valid AI providers found. Using MOCK.")
            self.providers.append({"name": "mock"})
        
        # FINAL SANITY CHECK
        self.providers = [p for p in self.providers if p is not None]
        logger.info(f"🧬 [LLMService] Final Providers: {[p.get('name') for p in self.providers]}")

    def _setup_providers(self):
        """Configure available providers based on environment."""
        
        # 1. OpenRouter (OpenAI Compatible)
        api_key = os.getenv("OPENROUTER_API_KEY")
        
        # Security Bypass: Check for Base64 encoded key if plain-text is redacted/not found
        if not api_key:
            b64_key = os.getenv("OPENROUTER_API_KEY_B64")
            if b64_key:
                try:
                    api_key = base64.b64decode(b64_key.strip()).decode()
                    logger.info("🔐 [LLMService] Using Base64 encoded OpenRouter API key")
                except Exception as e:
                    logger.error(f"❌ [LLMService] Failed to decode Base64 API key: {e}")

        if api_key:
            self.providers.append({
                "name": "openrouter",
                "api_key": api_key.strip(),
                "base_url": "https://openrouter.ai/api/v1"
            })
            logger.info(f"✅ [LLMService] OpenRouter (JSON) provider added with key (starts with {api_key[:5]})")
            
        # 1.5 OpenRouter Chat-Specific Premium Key
        chat_api_key = os.getenv("OPENROUTER_CHAT_API_KEY")
        if chat_api_key:
            self.providers.append({
                "name": "openrouter_chat",
                "api_key": chat_api_key.strip(),
                "base_url": "https://openrouter.ai/api/v1"
            })
            logger.info(f"✅ [LLMService] OpenRouter (CHAT) premium key added (starts with {chat_api_key[:5]})")
            
        # 2. Direct Google Gemini (Bypass OpenRouter for reliability)
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            self.providers.append({
                "name": "gemini",
                "api_key": gemini_key.strip(),
                "model": "gemini-1.5-flash"
            })
            logger.info(f"✅ [LLMService] Direct Gemini provider added (Surgical Reliability)")
            
    def is_career_related(self, messages) -> bool:
        """
        Check if the last user message is career-related.
        """
        user_msgs = [m for m in messages if m["role"] == "user"]
        if not user_msgs:
            return True
        
        msg = user_msgs[-1]["content"].lower()
        
        # Super broad list to allow chatbot to be helpful
        career_keywords = [
            'job','career','resume','skills','training','learning',
            'roadmap','placement','interview','developer','ai',
            'internship', 'hiring', 'recruitment', 'experience',
            'salary', 'role', 'company', 'project', 'tech',
            'javascript', 'python', 'react', 'node', 'java', 'html', 'css'
        ]
        
        if any(k in msg for k in career_keywords):
            return True
            
        # Check for context-related queries
        context_keywords = ['this', 'my profile', 'my resume', 'my skills', 'help', 'who are you']
        if any(k in msg for k in context_keywords):
            return True
            
        return True # Default to True to allow the LLM to manage its own personality

    def get_chat_response(
        self, 
        messages, 
        profile_context = None
    ) -> str:
        """
        Get a response from the LLM with fallback.
        """
        system_instruction = self.SYSTEM_PROMPT
        if profile_context:
            system_instruction += f"\n\nUSER PROFILE CONTEXT:\n{profile_context}\n"
            
        last_error = "No active AI providers configured."
        # Try each provider in order
        for provider in self.providers:
            if not provider or not isinstance(provider, dict):
                logger.warning(f"🛸 [LLMService] Skipping invalid provider: {provider}")
                continue
                
            try:
                logger.info(f"🤖 [LLMService] Calling {provider.get('name', 'Unknown')}...")
                response = self._call_provider(provider, messages, system_instruction)
                if response:
                    return response
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                last_error = f"{type(e).__name__}: {str(e)}"
                logger.error(f"❌ [LLMService] Provider {provider.get('name', 'Unknown')} failed: {last_error}\n{error_trace}")
                continue
        
        # If all providers fail, return a professional fallback message instead of a stack trace.
        # This will be shown cleanly in the Chat UI, and for Roadmap/Generators, the JSON parser will fail and safely trigger their native fallback algorithms.
        graceful_msg = "⚠️ I am currently experiencing exceptionally high traffic and my core reasoning engines are momentarily busy. Please try asking your question again in about 30 seconds."
        logger.error(f"🚨 [LLMService] All providers failed. Returning graceful message. Last error: {last_error}")
        return graceful_msg

    def _call_provider(self, provider: Dict, messages: List[Dict], system_instruction: str = None) -> str:
        """Route call to specific provider implementation based on intelligent task deduction."""
        
        # Deduce task type based on system instruction
        task_type = "chat"
        if system_instruction and ("JSON FORMAT" in system_instruction or "OUTPUT FORMAT (STRICT JSON)" in system_instruction or "generate EXACTLY" in system_instruction):
            task_type = "json"

        # If a chat task comes in but we are iterating over the normal "openrouter" provider, 
        # dynamically try to upgrade it to the "openrouter_chat" provider if it exists.
        has_chat_provider = any(p["name"] == "openrouter_chat" for p in self.providers)
        
        if provider["name"] == "openrouter":
            if task_type == "chat" and has_chat_provider:
                # Skip the default model sequence for Chat if we have a dedicated Chat key coming up
                return None  
            return self._call_openrouter(provider, messages, system_instruction, task_type)
            
        elif provider["name"] == "openrouter_chat":
            if task_type == "json":
                # Skip the chat provider for JSON tasks to save premium balance
                return None  
            return self._call_openrouter(provider, messages, system_instruction, task_type)
            
        elif provider["name"] == "gemini":
            return self._call_gemini(provider, messages, system_instruction)
        elif provider["name"] == "ollama":
            return self._call_ollama(provider, messages, system_instruction)
        else:
            return self._call_mock(messages)

    def _call_openrouter(self, provider: Dict, messages: List[Dict], system_instruction: str = None, task_type: str = "chat") -> str:
        """Call OpenRouter with advanced 402/429 bypass queue holding."""
        headers = {
            "Authorization": f"Bearer {provider['api_key']}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "CareerAdvisorAI"
        }
        
        full_messages = [{"role": "system", "content": system_instruction}] + messages
        
        logger.info(f"🤖 [LLMService] Calling openrouter for '{task_type}' task...")

        # Select the correct target model array based on the task and auth provider
        if provider["name"] == "openrouter_chat":
            target_models = self.OPENROUTER_PREMIUM_CHAT_MODELS
            logger.info("💎 [OpenRouter] Using PREMIUM Enterprise 100% Uptime Models")
        else:
            target_models = self.OPENROUTER_JSON_MODELS if task_type == "json" else self.OPENROUTER_CHAT_MODELS
        
        last_failure = None
        
        for model_name in target_models:
            current_model = str(model_name).strip()
            
            # Retry logic for 429/503
            max_retries = 3
            for attempt in range(max_retries + 1):
                try:
                    if attempt > 0:
                        sleep_time = 2 ** attempt  # Exponential backoff: 2s, 4s, 8s...
                        time.sleep(sleep_time)
                        logger.info(f"🔁 [OpenRouter] Retrying {current_model} after {sleep_time}s (Attempt {attempt+1})...")
                    else:
                        logger.info(f"📡 [OpenRouter] Attempting {current_model}...")
                    
                    payload = {
                        "model": current_model,
                        "messages": full_messages,
                        "temperature": 0.5,
                        "max_tokens": 1024 # Strict boundary for free tier reliability
                    }
                    
                    response = requests.post(
                        f"{provider['base_url']}/chat/completions",
                        headers=headers,
                        json=payload,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        if "choices" not in data or not data["choices"]:
                            error_msg = data.get('error', f"Missing choices. Keys: {list(data.keys())}")
                            last_failure = f"API Error: {error_msg}"
                            logger.error(f"❌ [OpenRouter] {current_model} parsing failed: {last_failure}")
                            break # Don't retry parsing error
                            
                        logger.info(f"✅ [OpenRouter] {current_model} Success on attempt {attempt+1}!")
                        return data['choices'][0]['message']['content']
                    
                    elif response.status_code == 429:
                        last_failure = f"HTTP 429 (Busy): {response.text[:100]}"
                        logger.warning(f"⚠️ [OpenRouter] {current_model} is Busy (429). Attempt {attempt+1}/{max_retries+1}")
                        if attempt >= 1: # Only retry once for 429s to keep UI fast
                            break
                        continue
                    
                    elif response.status_code in [402, 404, 400]:
                        last_failure = f"HTTP {response.status_code} (Fatal): {response.text[:100]}"
                        logger.error(f"🚫 [OpenRouter] {current_model} rejected (Fatal {response.status_code}). Skipping model entirely.")
                        break # FATAL for this model. Move to the next model immediately.
                        
                except Exception as e:
                    last_failure = str(e)
                    logger.error(f"❌ [OpenRouter] {current_model} Network/Timeout Error: {last_failure}")
                    continue # Network glitch, try again
                
        logger.warning(f"🚩 [OpenRouter] All models failed. Last error: {last_failure}")
        raise Exception(f"OpenRouter exhausted models: {last_failure}")

    def _call_gemini(self, config, messages, system_instruction) -> str:
        """Call Google Gemini API."""
        model = genai.GenerativeModel(config["model"])
        
        prompt = f"System Instruction: {system_instruction}\n\n"
        for msg in messages:
            role = "User" if msg["role"] == "user" else "Model"
            prompt += f"{role}: {msg['content']}\n"
        prompt += "Model: "
        
        response = model.generate_content(prompt)
        return response.text

    def _call_ollama(self, config, messages, system_instruction) -> str:
        """Call Local Ollama API."""
        full_messages = [{"role": "system", "content": system_instruction}] + messages
        
        payload = {
            "model": config["model"],
            "messages": full_messages,
            "stream": False
        }
        
        response = requests.post(
            config["base_url"],
            json=payload,
            timeout=60
        )
        
        response.raise_for_status()
        data = response.json()
        return data['message']['content']

    def _call_mock(self, messages) -> str:
        """Rule-based offline mentor fallback (no API key needed)."""
        last = ""
        for m in reversed(messages or []):
            if isinstance(m, dict) and m.get("content"):
                last = str(m.get("content"))
                break
        # The app prepends "Profile Context: ... User Question: <text>".
        # Match only against the actual question, not the profile/system text.
        marker = "User Question:"
        if marker in last:
            last = last.split(marker, 1)[1].strip()
        return self._offline_mentor_reply(last)

    @staticmethod
    def _offline_mentor_reply(question: str) -> str:
        """Keyword-driven career mentor answers for the no-API-key case."""
        q = f" {question} ".lower()

        def has(*words):
            return any(w in q for w in words)

        if has("react", "frontend", "front-end"):
            return (
                "**Frontend (React) learning path:**\n"
                "1. HTML + CSS + flexbox/grid (2 wks)\n"
                "2. JavaScript fundamentals: closures, promises, async/await (3 wks)\n"
                "3. React core: components, props, state, hooks (3 wks)\n"
                "4. React patterns: context, reducers, custom hooks, memo (2 wks)\n"
                "5. Build 2-3 projects + one portfolio app\n"
                "6. Add TypeScript, then Tailwind, then testing (Jest/RTL)\n"
                "Aim for **3-4 months** at ~10 hrs/week. Interview prep: chrome devtools, rendering optimization, component design."
            )
        if has("python", "django", "flask"):
            return (
                "**Python backend learning path:**\n"
                "1. Python core: data structures, OOP, decorators, generators (3 wks)\n"
                "2. SQL + one ORM (SQLAlchemy/Django ORM) (2 wks)\n"
                "3. Flask or FastAPI: REST APIs, auth, middleware (2 wks)\n"
                "4. Databases: PostgreSQL, Redis basics, background jobs (2 wks)\n"
                "5. Deploy: Docker, then AWS EC2/Render (1 wk)\n"
                "Build a real CRUD + auth API service and an e-commerce-style backend. "
                "Interview prep: REST design, DB indexing, authentication (JWT/sessions), rate limiting."
            )
        if has("machine learning", "ml", "deep learning", "data science", "pandas", "tensorflow"):
            return (
                "**ML / Data Science learning path:**\n"
                "1. Python + NumPy + Pandas (2-3 wks)\n"
                "2. Stats fundamentals: distributions, hypothesis testing (2 wks)\n"
                "3. sklearn: regression, classification, clustering, evaluation (3 wks)\n"
                "4. Deep learning: neural nets, CNNs, RNNs (PyTorch) (4 wks)\n"
                "5. One end-to-end project: data cleaning → model → deployment (MLflow/FastAPI)\n"
                "Interview prep: bias/variance, overfitting, loss functions, when to use which model."
            )
        if has("dsa", "data structure", "algorithm", "leetcode", "coding round"):
            return (
                "**DSA prep plan (for coding rounds):**\n"
                "1. Arrays + Strings + Hashing (2 wks)\n"
                "2. Two pointers, sliding window, binary search (2 wks)\n"
                "3. Linked lists, stacks, queues (1.5 wks)\n"
                "4. Trees + graphs + DFS/BFS (3 wks)\n"
                "5. Recursion, backtracking, DP (3 wks)\n"
                "Practice 3-4 problems/day, 1 contest/week (LeetCode/Codeforces). "
                "Target: 150-250 problems covering the above patterns before interviews."
            )
        if has("system design"):
            return (
                "**System design interview prep:**\n"
                "1. Learn the building blocks: load balancers, caching (Redis), queues (Kafka), DBs (SQL vs NoSQL), CDN\n"
                "2. Practice the 4-step framework: requirements → estimation → high-level design → deep dive\n"
                "3. Must-do problems: URL shortener, notification service, chat app, news feed, rate limiter\n"
                "4. For frontend roles: focus on component architecture, state, performance, caching\n"
                "Use Grokking System Design + a couple of mock interviews."
            )
        if has("resume"):
            return (
                "**Resume tips that get shortlisted:**\n"
                "1. Lead with impact: 'Built X which improved Y by Z%' — quantify everything\n"
                "2. Max 1 page for < 5 yrs experience; keep bullet points under 2 lines\n"
                "3. Match keywords from the job description (ATS filters)\n"
                "4. Skills section: top 6-10 genuinely used skills, not a laundry list\n"
                "5. Add links: GitHub, portfolio, LinkedIn — make them clickable\n"
                "Proofread twice and save as PDF (not Word)."
            )
        if has("interview"):
            return (
                "**Technical interview prep checklist:**\n"
                "1. DSA: practice 2-3 problems daily, revise patterns weekly\n"
                "2. Projects: rehearse the 3 stories — hardest bug, scaling decision, teamwork conflict\n"
                "3. Fundamentals: OS, networking, DB, and your main language's internals\n"
                "4. Do at least 2 mock interviews (peer or recording yourself)\n"
                "5. Preparation beats memorization: speak while coding, ask clarifying questions first"
            )
        if has("salary", "negotiat", "offer"):
            return (
                "**Salary negotiation advice:**\n"
                "1. Research market range (Glassdoor/Levels.fyi) for role + city + years\n"
                "2. Never give a number first — ask for the budget band\n"
                "3. Anchor slightly above midpoint; negotiate total comp, not just base\n"
                "4. Get competing offers if possible, share numbers politely\n"
                "5. Discuss sign-on bonus and stocks when base is capped\n"
                "It costs them more to re-hire than to bump pay — be politely persistent."
            )
        if has("roadmap", "path", "learn"):
            return (
                "To give you a precise roadmap, tell me your **target role** (e.g., Frontend Developer, "
                "Backend, Data Scientist) and your current skill level. As a starting point: "
                "**1) pick one specialization 2) learn its core stack 3) build 2-3 portfolio projects "
                "4) do DSA 1 hr daily 5) apply with a tailored resume.** I can break down any "
                "specific stack — just ask (e.g., 'roadmap for React developer')."
            )
        if has("skill gap"):
            return (
                "To close skill gaps: **1) list the skills missing in your job matches** "
                "2) rank them by how often they appear 3) learn the top 2-3 first via a course + project "
                "4) re-upload your resume so your skill graph updates 5) let the recommender re-rank jobs. "
                "Go to the **Skill Gap & Tests** tab — it generates tests per domain to measure progress."
            )
        if has("javascript", "node"):
            return (
                "**JavaScript/Node.js path:**\n"
                "1. JS core: closures, event loop, promises, prototype chain (3 wks)\n"
                "2. Node: modules, streams, buffers, child processes (2 wks)\n"
                "3. Express/Fastify REST API + JWT auth + validation (2 wks)\n"
                "4. MongoDB + Mongoose, then PostgreSQL (2 wks)\n"
                "5. Dockerize and deploy (Render/Railway/EC2) (1 wk)\n"
                "Interviews: event loop questions, async patterns, memory leaks, API design."
            )
        if has("java", "spring"):
            return (
                "**Java/Spring path:**\n"
                "1. Java core: OOP, collections, streams, concurrency (3 wks)\n"
                "2. Spring Boot basics: DI, REST, validation, JPA (3 wks)\n"
                "3. Spring Security + JWT, then microservices basics (2 wks)\n"
                "4. Testing: JUnit + Mockito; then Docker + CI (2 wks)\n"
                "Interviews: JVM memory, GC, thread safety, Spring bean lifecycle."
            )
        if has("devops", "docker", "kubernetes", "aws", "cloud"):
            return (
                "**DevOps path:**\n"
                "1. Linux + shell scripting + networking basics (2 wks)\n"
                "2. Git + CI/CD (GitHub Actions) (1 wk)\n"
                "3. Docker + docker-compose (2 wks)\n"
                "4. Kubernetes fundamentals: pods, services, deployments (3 wks)\n"
                "5. IaC: Terraform + AWS core (VPC, EC2, S3, IAM) (3 wks)\n"
                "6. Monitoring: Prometheus + Grafana (1 wk)\n"
                "Interview prep: containerization vs VMs, k8s scheduling, blue-green vs canary."
            )
        if has("sql", "database", "mongodb", "mysql", "postgres"):
            return (
                "**Databases — what to know:**\n"
                "1. SQL: joins, aggregates, window functions, indexing (B-tree) (2 wks)\n"
                "2. Normalization vs denormalization; when to use NoSQL (1 wk)\n"
                "3. MongoDB: documents, indexes, aggregation pipeline (2 wks)\n"
                "4. Transactions, ACID, isolation levels (1 wk)\n"
                "Interview prep: query optimization (EXPLAIN), N+1 problem, indexing trade-offs."
            )
        if has("free", "open source", "beginner", "start", "fresher", "first job"):
            return (
                "**For your first tech job:**\n"
                "1. Pick ONE stack and go deep — depth beats breadth for freshers\n"
                "2. Build 2 solid projects that solve real problems (host them live)\n"
                "3. Contribute to one open-source repo — great resume + GitHub signal\n"
                "4. DSA 1 hr/day consistently (interviewer first filter)\n"
                "5. Apply to 10-15 companies/week, tailor each resume, track in a sheet\n"
                "6. Network: LinkedIn posts on your learnings + connect with recruiters\n"
                "Expect 3-6 months of consistent prep for placement."
            )
        if has("hello", "hi ", "hey", "thanks", "thank"):
            return (
                "Hello! 👋 I'm your AI career mentor. I can help with:\n"
                "• **Learning roadmaps** — ask 'roadmap for React/Python/ML...'\n"
                "• **DSA & interview prep** — 'how to prepare for coding rounds'\n"
                "• **Resume & salary** — 'resume tips', 'negotiate offer'\n"
                "• **Skill gaps** — 'how to close skill gaps' (I use your profile)\n"
                "What would you like to focus on?"
            )
        return (
            "I'm running in **offline mentor mode** (no AI provider key configured yet), "
            "but I can still answer from my built-in career playbooks. Try asking about: "
            "**React/Python/DSA learning paths, system design, resume tips, interview prep, "
            "salary negotiation, or closing skill gaps**. Want me to build you a roadmap "
            "for a specific role? Tell me the role and your level."
        )

    # --- CAREER AI HELPER FUNCTIONS ---

    def generate_career_advice(self, profile_context: str, question: str) -> str:
        """Generate personalized career advice."""
        messages = [
            {
                "role": "user",
                "content": f"Profile Context:\n{profile_context}\n\nUser Question:\n{question}"
            }
        ]
        return self.get_chat_response(messages)

    def generate_learning_roadmap(self, skills) -> str:
        """Create a personalized career learning roadmap based on these skills."""
        skills_str = ", ".join(skills)
        messages = [
            {
                "role": "user",
                "content": f"Create a personalized career learning roadmap based on these skills:\n{skills_str}"
            }
        ]
        return self.get_chat_response(messages)

    def generate_job_explanation(self, profile: str, job_details: str) -> str:
        """Generate a Top 0.1% quality explanation for why a job matches a profile."""
        messages = [
            {
                "role": "user",
                "content": f"Explain why this job is a good match for this profile.\n\nProfile:\n{profile}\n\nJob Details:\n{job_details}\n\nProvide a structured, encouraging explanation."
            }
        ]
        return self.get_chat_response(messages)
