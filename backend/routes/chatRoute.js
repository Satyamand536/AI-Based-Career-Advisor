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
            return res.status(500).json({ error: "Failed to reach AI capabilities." });
        }

    } catch (err) {
        console.error("Chat Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
