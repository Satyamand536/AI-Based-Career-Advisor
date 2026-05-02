// backend/routes/jobRoute.js
const express = require('express');
const router = express.Router();
const path = require('path');
const axios = require('axios');
const Job = require('../models/job');
const Resume = require('../models/resume');
const { checkForAuthenticationCookie } = require('../auth');

// Backend URL for AI service
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

// --- GET /jobs/jobs ---
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, jobs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Failed to fetch jobs" });
  }
});

// --- GET /jobs/recommendations ---
// Comprehensive recommendations using AI + Embeddings
router.get('/recommendations', checkForAuthenticationCookie('token'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const userId = req.user._id.toString();
    
    // 1. Fetch User's Resume (New Model)
    const resume = await Resume.findOne({ user_id: req.user._id });

    if (!resume || !resume.parsed_data) {
      return res.status(404).json({ 
        ok: false, 
        message: 'No resume found in your profile. Please upload your resume to see personalized recommendations.' 
      });
    }

    const top_k = Number(req.query.top_k) || 10;
    
    // 2. Fetch Jobs (Active only? For now all)
    // We only fetch minimal fields needed for AI if dataset is huge, 
    // but typically we send everything or just ID + Text.
    // AI expects list of dicts.
    const jobs = await Job.find({}).lean();

    if (jobs.length === 0) {
        return res.json({ ok: true, recommendations: [], message: "No jobs available to recommend." });
    }

    console.log(`[Rec] Fetching recommendations using MPNet embeddings (LLM ranking disabled)...`);

    // 3. Call AI Service (/api/recommend) - LLM RANKING TEMPORARILY DISABLED
    // Using pure semantic similarity from MPNet embeddings
    try {
      const payload = {
        profile: {
          skills: Array.isArray(resume.parsed_data.skills) ? resume.parsed_data.skills : 
                   (typeof resume.parsed_data.skills === 'string' ? resume.parsed_data.skills.split(',').map(s => s.trim()) : []),
          experience: resume.parsed_data.experience || [],
          education_level: resume.parsed_data.education?.[0]?.degree || 'Bachelor',
          desired_role: resume.parsed_data.summary || 'Open to opportunities'
        },
        jobs: jobs,
        top_k: Math.min(top_k, 50),
        use_llm_ranking: false // DISABLED: Enforce pure MPNet matching for job cards
      };
      
      // Use parsed experience_years or fallback to length-based heuristic
      const expYears = (resume.parsed_data.experience_years !== undefined && resume.parsed_data.experience_years !== null) 
          ? resume.parsed_data.experience_years 
          : (resume.parsed_data.experience ? resume.parsed_data.experience.length * 1.5 : 0);
          
      payload.profile.experience_years = expYears;

      const aiRes = await axios.post(`${AI_SERVICE_URL}/api/recommend`, payload, { timeout: 30000 });

      if (aiRes.data && aiRes.data.ok && aiRes.data.data) {
        const result = aiRes.data.data;
        console.log(`[Rec] MPNet success! Recommendations: ${result.recommendations.length}`);
        
        return res.json({ 
            ok: true, 
            data: result 
        });
      } else {
        throw new Error('AI service returned invalid data');
      }

    } catch (aiErr) {
      console.error('[Rec] AI Service failed:', aiErr.message);
      if (aiErr.response) {
          console.error('[Rec] AI Response:', aiErr.response.data);
      }
      return res.status(503).json({ 
        ok: false, 
        message: 'AI Service Temporarily Busy: The recommender is calculating optimal paths for many users. Please try again in a few moments.' 
      });
    }

  } catch (err) {
    console.error('recommendations error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// Legacy upload support (redirects or informs?)
// If frontend calls /jobs/upload-resume, we should probably support it or 
// ensure frontend calls /api/resume/upload.
// For now, let's keep it clean and assume we update frontend or use /api/resume.

module.exports = router;
