const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const { checkForAuthenticationCookie } = require("../auth");
const Resume = require("../models/resume");
const User = require("../models/user");
const Skill = require("../models/skill");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Python AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5001";

// Upload and Parse Resume
router.post("/upload", checkForAuthenticationCookie("token"), upload.single("resume"), async (req, res) => {
  console.log(`[ResumeRoute] Incoming upload request. User found in req: ${req.user ? req.user._id : 'NO'}`);
  
  try {
    if (!req.user) {
      console.error("[ResumeRoute] Unauthorized upload attempt: No user found in request.");
      return res.status(401).json({ ok: false, message: "Session expired. Please log in again." });
    }

    if (!req.file) {
      console.error("[ResumeRoute] Upload failed: No file provided in request.");
      return res.status(400).json({ ok: false, message: "No file uploaded. Please select a resume file." });
    }

    const userId = req.user._id;
    console.log(`[ResumeRoute] Processing upload for user: ${userId}, file: ${req.file.originalname}`);
    const filePath = req.file.path;
    const fileUrl = `/uploads/${userId}/${req.file.filename}`;

    // -------------------------------------------------------------------------
    // 1. FAULT-TOLERANT SAVE: Save metadata immediately to prevent data loss
    // -------------------------------------------------------------------------
    let resume = await Resume.findOne({ user_id: userId });
    
    if (resume) {
        resume.file_url = fileUrl;
        resume.uploaded_at = Date.now();
        await resume.save();
    } else {
        resume = await Resume.create({
            user_id: userId,
            file_url: fileUrl,
            parsed_data: { skills: [], education: [], experience: [], raw_text: "" }
        });
    }

    // Update User immediately so Dashboard detects the resume
    await User.findByIdAndUpdate(userId, {
        resume_url: fileUrl,
        "profile.headline": req.file.originalname, // Placeholder until AI parses
    });

    // -------------------------------------------------------------------------
    // 2. AI PARSING: Try to enhance the data
    // -------------------------------------------------------------------------
    console.log(`[ResumeUpload] Calling AI Service to parse: ${filePath}`);
    let parsedData = { skills: [], education: [], experience: [], raw_text: "" };
    let embeddings = [];
    let parsingSuccess = false;

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/parse-resume`, {
        filePath: filePath
      }, { timeout: 60000 }); // Increased to 60s for cold-start model loads
      
      if (response.data.ok) {
        parsedData = response.data.profile;
        embeddings = response.data.embedding || [];
        parsingSuccess = true;
        console.log(`[ResumeUpload] AI Parsing Success for: ${parsedData.name}`);
      }
    } catch (aiError) {
      console.error("[ResumeUpload] AI Parsing Failed (Non-Critical for persistence):", aiError.message);
      // We don't return 500 here anymore, because the file is saved and the user is updated.
    }

    // -------------------------------------------------------------------------
    // 3. UPDATE WITH AI DATA (If successful)
    // -------------------------------------------------------------------------
    if (parsingSuccess) {
        // Update Resume Document
        resume.parsed_data = parsedData;
        resume.embeddings = embeddings;
        await resume.save();

        // Classify User Stage
        let userStage = "UNCLASSIFIED";
        try {
            const stageRes = await axios.post(`${AI_SERVICE_URL}/api/classify-stage`, {
                profile: {
                    skills: parsedData.skills || [],
                    experience_years: parsedData.experience_years || 0
                }
            }, { timeout: 15000 });
            if (stageRes.data.ok) userStage = stageRes.data.stage;
        } catch (stageErr) {
            console.warn("[ResumeUpload] Stage Classification Failed:", stageErr.message);
        }

        // Update User Profile Summary & Stage
        await User.findByIdAndUpdate(userId, {
            "profile.headline": parsedData.name || "User", 
            "profile.contact": parsedData.email || "",
            current_stage: userStage,
            readiness_score: (embeddings && embeddings.length > 0) ? 50 : 20
        });

        // Update Skills Collection
        if (parsedData.skills && Array.isArray(parsedData.skills)) {
            for (const skillName of parsedData.skills) {
                await Skill.findOneAndUpdate(
                    { name: skillName.toLowerCase() },
                    { $inc: { popularity_score: 1 }, $setOnInsert: { category: "Uncategorized" } },
                    { upsert: true }
                );
            }
        }
    }

    return res.json({
        ok: true,
        message: parsingSuccess ? "Resume uploaded and parsed successfully" : "Resume uploaded. Analysis in progress...",
        parsing_pending: !parsingSuccess,
        data: {
            resumeId: resume._id,
            parsedProfile: parsingSuccess ? parsedData : null
        }
    });

  } catch (err) {
    console.error("Upload Route Error:", err);
    return res.status(500).json({ error: "Server error during upload" });
  }
});

// Get User Resume Data
router.get("/me", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        const resume = await Resume.findOne({ user_id: req.user._id });
        if (!resume) return res.status(404).json({ error: "Resume not found" });
        return res.json({ ok: true, resume });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});

// Check if user has uploaded a resume
router.get("/status", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ ok: false, hasResume: false });
        const resume = await Resume.findOne({ user_id: req.user._id });
        return res.json({ 
            ok: true, 
            hasResume: !!resume,
            lastUploaded: resume ? resume.uploaded_at : null
        });
    } catch (err) {
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

// Get User Resume Skills
router.get("/skills", checkForAuthenticationCookie("token"), async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
        const resume = await Resume.findOne({ user_id: req.user._id });
        if (!resume || !resume.parsed_data) return res.status(404).json({ ok: false, message: "Resume not found" });
        return res.json({ ok: true, skills: resume.parsed_data.skills || [] });
    } catch (err) {
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

module.exports = router;
