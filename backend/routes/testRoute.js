const express = require("express");
const router = express.Router();
const { checkForAuthenticationCookie } = require("../auth");
const Test = require("../models/test");
const Result = require("../models/result");
const User = require("../models/user");
const axios = require("axios");

// Python AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

// Generate New Test
router.post("/generate", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const { domain, difficulty } = req.body;
        if (!domain) return res.status(400).json({ error: "Domain is required" });

        // 1. Call AI Service
        let testData = {};
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/generate-test`, {
                domain: domain,
                difficulty: difficulty || "Medium",
                num_questions: 10
            }, { timeout: 60000 });
            
            if (response.data.ok) {
                testData = response.data.test;
            } else {
                 throw new Error(response.data.error || "AI service returned error");
            }
        } catch (aiErr) {
            console.error("Test Generation Error:", aiErr.message);
            const status = aiErr.code === 'ECONNABORTED' ? 504 : 502;
            return res.status(status).json({ error: "AI test generator is currently busy. Please try again in a moment." });
        }
        
        if (!testData.questions || testData.questions.length === 0) {
             return res.status(500).json({ error: "AI failed to generate questions" });
        }

        // 2. Save to MongoDB
        const test = await Test.create({
            domain: domain,
            description: testData.title,
            questions: testData.questions.map(q => ({
                text: q.text,
                options: q.options,
                correct_answer_index: q.correct_answer_index,
                explanation: q.explanation,
                tags: q.tags,
                difficulty: difficulty || "Medium"
            })),
            created_by: "AI_GENERATOR"
        });

        return res.json({
            ok: true,
            testId: test._id,
            totalQuestions: test.questions.length
        });

    } catch (err) {
        console.error("Test Generation Route Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

// Get Latest Test Result for Dashboard
router.get("/latest", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const latestResult = await Result.findOne({ user_id: req.user._id })
            .sort({ createdAt: -1 })
            .populate('test_id', 'domain');

        if (!latestResult) {
            return res.status(404).json({ error: "No test results found" });
        }

        return res.json({
            ok: true,
            result: {
                score: latestResult.score,
                domain: latestResult.test_id ? latestResult.test_id.domain : "General"
            }
        });
    } catch (err) {
        console.error("Latest Test Result Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

// Get Test (Without Answers)
router.get("/:id", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ error: "Test not found" });
        
        // Strip correct answers for frontend
        const safeQuestions = test.questions.map(q => ({
            _id: q._id,
            text: q.text,
            options: q.options,
            difficulty: q.difficulty,
            tags: q.tags
        }));

        return res.json({ 
            ok: true, 
            test: {
                _id: test._id,
                domain: test.domain,
                description: test.description,
                questions: safeQuestions,
                duration_minutes: 15 // Hardcoded for now, or calc based on length
            }
        });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});

// Submit Test
router.post("/:id/submit", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const { answers } = req.body; // Array of { question_id, selected_option }
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: "Answers array required" });
        }

        const test = await Test.findById(req.params.id);
        if (!test) return res.status(404).json({ error: "Test not found" });

        let score = 0;
        let results = [];
        let skillGaps = new Set();

        // Calculate Score
        test.questions.forEach(q => {
            const userAnswer = answers.find(a => a.question_id === q._id.toString());
            const isCorrect = userAnswer && userAnswer.selected_option === q.correct_answer_index;
            
            if (isCorrect) score++;
            else {
                // If wrong, add tags to skill gaps
                if (q.tags && q.tags.length > 0) {
                    q.tags.forEach(tag => skillGaps.add(tag));
                }
            }

            results.push({
                question_id: q._id,
                selected_option: userAnswer ? userAnswer.selected_option : -1,
                is_correct: isCorrect
            });
        });

        const finalScore = Math.round((score / test.questions.length) * 100);

        // Save Result
        const result = await Result.create({
            user_id: req.user._id,
            test_id: test._id,
            score: finalScore,
            total_questions: test.questions.length,
            answers: results,
            skill_gaps: Array.from(skillGaps),
            improvement_plan: finalScore > 70 ? "Great job! Move to the next level." : "Review the identified skill gaps."
        });
        
        // Update User Readiness Score if needed? 
        // We can do that in a separate step or here.

        const detailedResults = test.questions.map(q => {
            const userAnswer = answers.find(a => a.question_id === q._id.toString());
            const selectedIdx = userAnswer ? userAnswer.selected_option : -1;
            const isCorrect = selectedIdx === q.correct_answer_index;
            
            return {
                question_id: q._id,
                text: q.text,
                options: q.options,
                selected_option: selectedIdx,
                correct_option: q.correct_answer_index,
                is_correct: isCorrect,
                explanation: q.explanation,
                user_answer_text: selectedIdx !== -1 ? q.options[selectedIdx] : "Skipped",
                correct_answer_text: q.options[q.correct_answer_index]
            };
        });

        return res.json({
            ok: true,
            result: {
                score: finalScore,
                domain: test.domain, // Add domain for instant frontend cache updates
                total: test.questions.length,
                correct: score,
                skill_gaps: Array.from(skillGaps),
                resultId: result._id,
                details: detailedResults // Added detailed results
            }
        });

    } catch (err) {
        console.error("Test Submit Error:", err);
        return res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
