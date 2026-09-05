const express = require("express");
const router = express.Router();
const { checkForAuthenticationCookie } = require("../auth");
const User = require("../models/user");
const Resume = require("../models/resume");
const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

// Track off-topic warnings per user session (in-memory, resets on server restart)
const offTopicWarnings = {};

const TECH_TOPICS = [
    // Languages & Fundamentals
    "javascript","typescript","python","java","c++","c","go","rust","kotlin","swift","php","ruby","scala","dart",
    // Frameworks
    "react","vue","angular","next.js","express","django","flask","fastapi","spring","laravel","flutter",
    // Infra & DevOps
    "docker","kubernetes","aws","azure","gcp","terraform","ci/cd","linux","bash","nginx","devops","cloud",
    // Data & AI
    "machine learning","deep learning","ai","llm","gpt","nlp","data science","tensorflow","pytorch","pandas","sql","mongodb","database",
    // CS Fundamentals
    "dsa","data structures","algorithms","system design","os","operating system","computer networks","oops","design patterns",
    // Career & HR
    "resume","interview","career","job","salary","promotion","tech role","cto","engineer","developer","internship","placement",
    "hr","offer","negotiation","coding round","technical interview","roadmap","skill gap","certification",
    // General tech
    "api","rest","graphql","microservices","architecture","security","testing","git","agile","scrum","fullstack","frontend","backend","mobile"
];

function isTechRelated(message) {
    const lower = message.toLowerCase();
    return TECH_TOPICS.some(topic => lower.includes(topic));
}

// Minimal offline mentor used when the AI service is unreachable, so chat
// never returns a hard error. Mirrors the Python-side fallback behavior.
function offlineMentorReply(question = "") {
    const q = ` ${question} `.toLowerCase();
    const has = (...words) => words.some(w => q.includes(w));
    if (has("react", "frontend", "front-end")) {
        return "**Frontend (React) path:** HTML/CSS (2 wks) → JS fundamentals (3 wks) → React core + hooks (3 wks) → 2-3 projects (3 wks) → TypeScript + testing. Aim for ~3 months at 10 hrs/week.";
    }
    if (has("python", "django", "flask")) {
        return "**Python backend path:** Python core (3 wks) → SQL + ORM (2 wks) → Flask/FastAPI REST APIs (2 wks) → PostgreSQL + Redis (2 wks) → Docker + deploy (1 wk). Build a CRUD API service as your project.";
    }
    if (has("machine learning", "ml", "data science", "tensorflow", "pandas")) {
        return "**ML/Data Science path:** Python + NumPy/Pandas (2-3 wks) → stats (2 wks) → sklearn models (3 wks) → deep learning basics with PyTorch (4 wks) → one end-to-end project (cleaning → model → API).";
    }
    if (has("dsa", "data structure", "algorithm", "leetcode", "coding round")) {
        return "**DSA prep:** Arrays/strings/hashing (2 wks) → two pointers/binary search (2 wks) → linked lists/stacks/queues (1.5 wks) → trees/graphs (3 wks) → recursion/DP (3 wks). Practice 3-4 problems/day + 1 contest/week.";
    }
    if (has("system design")) {
        return "**System design:** Learn building blocks (load balancers, caching, queues, SQL vs NoSQL, CDN) → use the 4-step framework (requirements → estimation → high-level → deep dive) → practice URL shortener, chat app, news feed, rate limiter.";
    }
    if (has("resume")) {
        return "**Resume tips:** lead with quantified impact ('built X → improved Y by Z%'), keep to 1 page, mirror ATS keywords from the job post, top 6-10 real skills, add GitHub/portfolio links, export as PDF.";
    }
    if (has("interview")) {
        return "**Interview prep:** 2-3 DSA problems daily, rehearse 3 project stories (hardest bug, scaling, conflict), review OS/networking/DB fundamentals, and do 2+ mock interviews.";
    }
    if (has("salary", "negotiat", "offer")) {
        return "**Salary negotiation:** research the band (Levels.fyi/Glassdoor), avoid giving a number first, anchor slightly above midpoint, negotiate total comp (base + equity + sign-on), and share competing offers politely.";
    }
    if (has("roadmap", "path", "learn")) {
        return "Tell me your **target role** (Frontend, Backend, Data, DevOps…) and I'll break down a week-by-week path. Rule of thumb: pick one stack → learn its core → build 2-3 projects → DSA daily → apply with a tailored resume.";
    }
    if (has("hello", "hi ", "hey", "thanks", "thank")) {
        return "Hello! 👋 I'm your career mentor. Ask me about **learning roadmaps (React/Python/ML/Java/DevOps), DSA prep, system design, resume tips, salary negotiation, or closing skill gaps**.";
    }
    return "I'm in offline mentor mode (no AI provider reachable), but I can still help from my built-in career playbooks. Try asking about learning paths, DSA prep, system design, resume tips, salary negotiation, or skill gaps.";
}

// Chat with AI Mentor
router.post("/send", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        if (!req.user) return res.status(401).json({ ok: false, error: "Session expired. Please log in again." });
        const userId = req.user._id.toString();

        // ── Off-topic enforcement ──
        const isOnTopic = isTechRelated(message);
        const warnCount = offTopicWarnings[userId] || 0;

        if (!isOnTopic) {
            if (warnCount >= 1) {
                // Second+ off-topic: hard block
                return res.json({
                    ok: true,
                    reply: "⛔ I can only assist with **tech topics** — programming, DSA, system design, career advice, job prep, AI/ML, DevOps, and related areas. Please ask something relevant to your tech career."
                });
            }
            // First time: warn and still answer
            offTopicWarnings[userId] = 1;
            // Let it pass through to AI, but append a note below
        } else {
            // Reset warning counter when back on topic
            offTopicWarnings[userId] = 0;
        }

        // 1. Fetch User Context
        const user = await User.findById(userId);
        const resume = await Resume.findOne({ user_id: userId });

        // 2. Build Rich System Prompt
        let profileContext = `User: ${user.fullName}`;
        if (resume?.parsed_data) {
            const p = resume.parsed_data;
            if (p.skills?.length > 0) profileContext += `\nSkills: ${p.skills.slice(0, 20).join(", ")}`;
            if (p.experience?.length > 0) {
                const jobs = p.experience.map(e => `${e.role || "Role"} at ${e.company || "Company"}`).join("; ");
                profileContext += `\nExperience: ${jobs}`;
            }
            if (p.education?.length > 0) {
                const edu = p.education.map(e => `${e.degree || "Degree"} from ${e.institution || "School"}`).join("; ");
                profileContext += `\nEducation: ${edu}`;
            }
        }

        const systemPrompt = `You are a senior tech career mentor and CTO-level advisor. 
You know this user's profile:
${profileContext}

YOUR RULES (MANDATORY):
1. Answer DIRECTLY and CONCISELY. No filler. No "Great question!". No padding. Just the answer.
2. For factual/technical questions: give the correct answer immediately — no hedging.
3. Use bullet points and numbered lists for multi-part answers. Use markdown headers for long answers.
4. Topics you cover: programming, DSA, system design, OS, networking, databases, DevOps, AI/ML, tech career, job prep, resume, salary negotiation, HR discussions, CTO advice, tech leadership.
5. If asked a direct question (e.g. "What is O(n log n)?"), answer in 1-3 sentences max.
6. If asked something non-tech, give a one-line answer and note this assistant is focused on tech.
7. Use the user's actual resume skills when giving personalized advice.
8. Format code in \`inline code\` or code blocks. Format lists cleanly.`;

        // 3. Call AI Service
        try {
            const aiRes = await axios.post(`${AI_SERVICE_URL}/api/chat`, {
                message: message,
                context: systemPrompt
            });

            if (aiRes.data.ok) {
                let reply = aiRes.data.reply;
                
                // Append off-topic warning on first violation
                if (!isOnTopic && warnCount === 0) {
                    reply += "\n\n⚠️ **Note:** I'm specialized for tech topics — programming, DSA, system design, AI/ML, career advice, and job prep. Future off-topic questions will be declined.";
                }

                return res.json({ ok: true, reply });
            } else {
                return res.json({ ok: false, error: "AI could not generate a response." });
            }

        } catch (aiErr) {
            console.error("AI Service Error:", aiErr.message);
            // Offline fallback so chat never hard-fails (sandbox/service restarts).
            return res.json({ ok: true, reply: offlineMentorReply(message) });
        }

    } catch (err) {
        console.error("Chat Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
