const express = require("express");
const router = express.Router();
const { checkForAuthenticationCookie } = require("../auth");
const TrainingRoadmap = require("../models/trainingRoadmap");
const User = require("../models/user");
const Resume = require("../models/resume");
const Result = require("../models/result");
const axios = require("axios");

// Python AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

/**
 * POST /api/roadmap/generate
 * Generate a personalized learning roadmap based on:
 * - User's actual parsed resume skills
 * - Latest test results (skill gaps)
 * - Target job goal
 *
 * FIX v2: Now passes real profile data (not empty {}), uses experience_years heuristic,
 * saves the full AI roadmap object, and returns it directly for frontend rendering.
 */
router.post("/generate", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ ok: false, error: "Session expired. Please log in again." });
        const { goal, hours_per_week } = req.body;
        const userId = req.user._id;

        // 1. Fetch User Profile + Resume
        const user = await User.findById(userId).lean();
        const resume = await Resume.findOne({ user_id: userId }).lean();

        if (!resume || !resume.parsed_data) {
            return res.status(400).json({
                ok: false,
                error: "No resume found. Please upload your resume first to generate a personalized roadmap."
            });
        }

        // 2. Extract skill gaps from latest test result
        let skillGaps = [];
        try {
            const latestResult = await Result.findOne({ user_id: userId })
                .sort({ createdAt: -1 })
                .lean();
            if (latestResult && latestResult.skill_gaps) {
                skillGaps = latestResult.skill_gaps;
            }
        } catch (err) {
            console.warn("[Roadmap] Could not fetch test results:", err.message);
        }

        // 3. Build rich profile for AI
        const skillsArray = Array.isArray(resume.parsed_data.skills)
            ? resume.parsed_data.skills
            : (typeof resume.parsed_data.skills === "string"
                ? resume.parsed_data.skills.split(",").map(s => s.trim()).filter(Boolean)
                : []);

        // Estimate experience years from experience array
        let experienceYears = 0;
        if (resume.parsed_data.experience_years != null) {
            experienceYears = Number(resume.parsed_data.experience_years) || 0;
        } else if (Array.isArray(resume.parsed_data.experience)) {
            experienceYears = Math.min(resume.parsed_data.experience.length * 1.5, 20);
        }

        const profileData = {
            name: user.fullName || "Developer",
            skills: skillsArray,
            experience_years: experienceYears,
            skill_gaps: skillGaps,
            summary: resume.parsed_data.summary || "",
            education: resume.parsed_data.education || []
        };

        // 4. Auto-detect goal from skills if not provided by frontend
        const targetGoal = goal || inferGoalFromSkills(skillsArray, resume.parsed_data.summary || "");

        // 5. Call AI Service
        let aiRoadmap = null;
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/generate-roadmap`, {
                profile: profileData,
                goal: targetGoal,
                hours_per_week: hours_per_week || 10
            }, { timeout: 90000 }); // 90s timeout for LLM generation

            if (response.data.ok && response.data.roadmap) {
                aiRoadmap = response.data.roadmap;
            } else {
                throw new Error(response.data.error || "AI returned no roadmap data");
            }
        } catch (aiErr) {
            console.error("[Roadmap] AI Service Error:", aiErr.message);
            return res.status(503).json({
                ok: false,
                error: "AI roadmap service is busy. Please try again in a moment."
            });
        }

        // 6. Save to MongoDB (store entire AI roadmap object for future retrieval)
        // Build modules for schema compatibility
        const modules = [];
        const aiPhases = aiRoadmap.phases || [];
        aiPhases.forEach(phase => {
            const weeks = phase.weeks || [];
            weeks.forEach(week => {
                modules.push({
                    title: `${phase.name} - Week ${week.week_number || ""}: ${week.topic}`,
                    description: (week.daily_tasks || week.tasks || []).join(" | "),
                    resources: (week.resources || []).map(r => ({
                        title: r.title || "Resource",
                        url: r.url || "#",
                        type: r.type || "Article"
                    })),
                    status: "Pending"
                });
            });
        });

        // Upsert roadmap for user (delete old, create new)
        await TrainingRoadmap.deleteMany({ user_id: userId });
        const savedRoadmap = await TrainingRoadmap.create({
            user_id: userId,
            goal: aiRoadmap.goal || targetGoal || `${skillsArray.slice(0, 3).join(", ")} Career Path`,
            modules: modules,
            progress: 0,
            raw_ai_roadmap: JSON.stringify(aiRoadmap) // Store full AI response
        });

        // 7. Return the full AI roadmap object (not DB schema) for frontend rendering
        return res.json({
            ok: true,
            roadmap: aiRoadmap,  // Full AI structure: phases, weeks, milestone_project etc
            roadmapId: savedRoadmap._id
        });

    } catch (err) {
        console.error("[Roadmap] Generation Error:", err);
        return res.status(500).json({ ok: false, error: "Server error generating roadmap" });
    }
});

/**
 * GET /api/roadmap/me
 * Get the user's latest saved roadmap.
 * Returns both the flat modules and the raw AI roadmap (if saved).
 */
router.get("/me", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ ok: false, error: "Session expired. Please log in again." });
        const roadmap = await TrainingRoadmap.findOne({ user_id: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        if (!roadmap) {
            return res.status(404).json({ ok: false, error: "No roadmap found" });
        }

        // Try to return parsed AI roadmap if stored
        let aiRoadmap = null;
        if (roadmap.raw_ai_roadmap) {
            try {
                aiRoadmap = JSON.parse(roadmap.raw_ai_roadmap);
            } catch (e) {
                // Fallback to modules format
            }
        }

        return res.json({
            ok: true,
            roadmap: aiRoadmap || {
                goal: roadmap.goal,
                phases: [],
                modules: roadmap.modules  // Flat modules fallback
            },
            roadmapId: roadmap._id,
            progress: roadmap.progress
        });

    } catch (err) {
        console.error("[Roadmap] Fetch Error:", err);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

/**
 * PATCH /api/roadmap/:id/progress
 * Update module progress status.
 */
router.patch("/:id/progress", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const { module_index, status } = req.body;
        const roadmap = await TrainingRoadmap.findOne({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!roadmap) return res.status(404).json({ ok: false, error: "Roadmap not found" });

        if (roadmap.modules[module_index]) {
            roadmap.modules[module_index].status = status;
        }

        // Compute overall progress
        const completed = roadmap.modules.filter(m => m.status === "Completed").length;
        roadmap.progress = roadmap.modules.length
            ? Math.round((completed / roadmap.modules.length) * 100)
            : 0;

        await roadmap.save();

        return res.json({ ok: true, progress: roadmap.progress });
    } catch (err) {
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

module.exports = router;

/**
 * Infers the target career goal from resume skills + summary text.
 * Uses a scored keyword matching system to pick the best-fit role.
 */
function inferGoalFromSkills(skills = [], summary = "") {
    const combinedText = [...skills, summary].join(" ").toLowerCase();

    const CAREER_PROFILES = [
        {
            goal: "Machine Learning Engineer",
            keywords: ["python", "tensorflow", "pytorch", "scikit-learn", "keras", "ml", "machine learning", "deep learning", "neural network", "xgboost", "nlp", "bert", "transformers", "huggingface", "computer vision", "opencv"]
        },
        {
            goal: "Data Scientist",
            keywords: ["python", "r", "pandas", "numpy", "matplotlib", "seaborn", "data analysis", "data science", "jupyter", "statistical", "regression", "classification", "clustering", "data visualization", "scipy", "data mining"]
        },
        {
            goal: "AI Engineer",
            keywords: ["ai", "llm", "langchain", "openai", "gpt", "gemini", "claude", "prompt engineering", "vector database", "rag", "embeddings", "fine-tuning", "llama", "mistral", "anthropic", "artificial intelligence"]
        },
        {
            goal: "DevOps / Cloud Engineer",
            keywords: ["docker", "kubernetes", "ci/cd", "jenkins", "github actions", "terraform", "ansible", "aws", "azure", "gcp", "helm", "prometheus", "grafana", "linux", "bash", "devops", "cloud", "infrastructure", "nginx", "docker-compose"]
        },
        {
            goal: "Cybersecurity Engineer",
            keywords: ["penetration testing", "ethical hacking", "kali linux", "burp suite", "metasploit", "nmap", "wireshark", "owasp", "vulnerability", "siem", "soc", "ctf", "network security", "cryptography", "cybersecurity", "infosec"]
        },
        {
            goal: "Mobile Developer",
            keywords: ["android", "ios", "kotlin", "java", "swift", "flutter", "react native", "dart", "jetpack compose", "swiftui", "core data", "room database", "mobile app", "xcode", "android studio"]
        },
        {
            goal: "Backend Developer",
            keywords: ["python", "java", "c\\+\\+", "c#", "node\\.js", "express", "django", "flask", "fastapi", "spring boot", "rest api", "graphql", "postgresql", "mongodb", "redis", "microservices", "backend", "sql", "go", "golang", "rust", "php", "laravel", "ruby on rails"]
        },
        {
            goal: "Frontend Developer",
            keywords: ["react", "vue", "angular", "html", "css", "javascript", "typescript", "next\\.js", "tailwind", "sass", "webpack", "vite", "ui", "ux", "frontend", "redux", "responsive design", "bootstrap"]
        },
        {
            goal: "Full Stack Developer",
            keywords: ["mern", "mean", "full stack", "fullstack", "full-stack"]
        }
    ];

    let best = { goal: "Software Engineer", score: 0 };
    
    // Check for exact Full Stack title matches first
    if (combinedText.includes("full stack") || combinedText.includes("fullstack") || combinedText.includes("mern")) {
        // Boost full stack if explicitly mentioned
        best = { goal: "Full Stack Developer", score: 5 };
    }

    for (const profile of CAREER_PROFILES) {
        let score = 0;
        for (const kw of profile.keywords) {
            // Use strict word boundary to prevent "ml" matching "html" or "go" matching "good"
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(combinedText)) {
                score++;
            }
        }
        
        // If it's a tie, we prefer the one with the higher percentage of matched keywords, 
        // to prevent generic roles with massive keyword lists from automatically winning.
        if (score > best.score) {
            best = { goal: profile.goal, score };
        } else if (score === best.score && score > 0) {
            // Tie breaker logic: which profile has a higher density of hits?
            const currentRatio = score / profile.keywords.length;
            const bestProfile = CAREER_PROFILES.find(p => p.goal === best.goal);
            const bestRatio = bestProfile ? score / bestProfile.keywords.length : 0;
            
            if (currentRatio > bestRatio) {
                best = { goal: profile.goal, score };
            }
        }
    }
    
    return best.goal;
}

