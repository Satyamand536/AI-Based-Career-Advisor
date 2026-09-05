require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8000;
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');

// ===== ROUTES =====
const userRoute = require('./routes/userRoute');
const jobRoute = require('./routes/jobRoute');  // IMPORTANT

// ===== CRON =====
const { startJobCron } = require('./cron/jobCron');

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Auth middleware (try to require safely) =====
let checkForAuthenticationCookie;
try {
  // preferred location
  checkForAuthenticationCookie = require('./middlewares/auth').checkForAuthenticationCookie;
} catch (err1) {
  try {
    // alternate location if your project structure differs
    checkForAuthenticationCookie = require('./auth').checkForAuthenticationCookie;
  } catch (err2) {
    // fallback: noop middleware factory (development / debug)
    console.warn('[WARN] Auth middleware not found. Using NO-OP auth for development.');
    checkForAuthenticationCookie = (name) => (req, res, next) => { next(); };
  }
}

// Apply auth middleware globally if it's a factory function
if (typeof checkForAuthenticationCookie === 'function') {
  try {
    app.use(checkForAuthenticationCookie("token"));
  } catch (e) {
    // If middleware expects different invocation, skip and continue
    console.warn('[WARN] Could not apply auth middleware globally:', e.message || e);
  }
}

// Make req.user available as res.locals.user for templates/handlers
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(express.static(path.resolve('./public')));

// ===== DB CONNECTION =====
if (process.env.MONGO_URL) {
  // Fail fast instead of buffering 10s per query when Mongo restarts, and
  // reconnect automatically so the backend recovers on its own after the
  // keeper brings Mongo back.
  mongoose.set("bufferCommands", false);
  let dbConnecting = false;
  const connectDB = () => {
    if (dbConnecting) return;
    if (mongoose.connection.readyState === 1) return; // already connected
    dbConnecting = true;
    mongoose
      .connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => {
        dbConnecting = false;
        console.log("MongoDB connected!");
        // Start job ingestion CRON after DB connects
        try { startJobCron(); } catch(e) { console.warn('[CRON] Failed to start:', e.message); }
      })
      .catch(err => { dbConnecting = false; console.error("MongoDB error:", err.message); });
  };
  connectDB();
  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] Disconnected — reconnecting in 2s");
    setTimeout(connectDB, 2000);
  });
  mongoose.connection.on("error", err => console.error("[DB] Connection error:", err.message));
} else {
  console.warn('[WARN] MONGO_URL not set. DB features will fail until you configure it.');
}

// ===== ROUTES =====
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});


const roadmapRoute = require("./routes/roadmapRoute");
const testRoute = require("./routes/testRoute");
const chatRoute = require("./routes/chatRoute");

app.use("/api/recommendations", (req, res, next) => {
    // Legacy redirect or handle
    next();
});

// Mounting Routes (Standard API Prefix for Frontend Compatibility)
app.use("/api/user", userRoute);
app.use("/api/jobs", jobRoute);
app.use("/api/resume", require('./routes/resumeRoute'));
app.use("/api/roadmap", roadmapRoute);
app.use("/api/test", testRoute);
app.use("/api/chat", chatRoute);

// Legacy/Alternative Mounts (Ensuring no 404s for older calls)
app.use("/user", userRoute);
app.use("/jobs", jobRoute);
app.use("/resume", require('./routes/resumeRoute'));

// ===== Protected static route: serve uploaded resumes (owner or admin) =====
app.get('/uploads/:userId/:filename', checkForAuthenticationCookie("token"), (req, res) => {
  try {
    const { userId, filename } = req.params;
    // require auth; if req.user present, allow only owner or admin
    if (!req.user || (req.user._id && req.user._id.toString() !== userId && req.user.role !== 'admin')) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    // safe path resolve
    const filePath = path.resolve(__dirname, 'uploads', userId.toString(), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, message: 'File not found' });
    }
    return res.sendFile(filePath);
  } catch (err) {
    console.error('send resume error', err);
    return res.status(500).json({ ok: false, message: 'Failed to send file', error: String(err) });
  }
});

// ===== DEBUG ROUTES (development helpers) =====
// These are intentionally permissive to let you inspect DB state during debugging.
// Remove or protect them in production.
let UserProfile, Job;
try {
  UserProfile = require('./models/userProfile');
  Job = require('./models/job');
} catch (e) {
  console.warn('[WARN] Debug models not found:', e.message);
  // Keep them undefined — debug routes will return a clear message
}

app.get('/debug/profile/:userId', checkForAuthenticationCookie("token"), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    if (!UserProfile) return res.status(500).json({ ok: false, message: 'UserProfile model missing on server' });
    const p = await UserProfile.findOne({ userId: req.params.userId }).lean();
    return res.json({ ok: true, profile: p });
  } catch (err) {
    console.error('debug/profile err', err);
    return res.status(500).json({ ok: false, err: String(err) });
  }
});

app.get('/debug/recommendations/:userId', checkForAuthenticationCookie("token"), async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    if (!UserProfile || !Job) return res.status(500).json({ ok: false, message: 'Models missing on server' });
    const profile = await UserProfile.findOne({ userId: req.params.userId }).lean();
    if (!profile) return res.status(404).json({ ok: false, message: 'Profile not found' });
    const jobs = await Job.find({}).lean();

    // Simple scoring: skill overlap + experience ratio
    const scored = jobs.map(job => {
      const pSkills = (profile.skills || []).map(s => s.toLowerCase());
      const rSkills = (job.required_skills || []).map(s => s.toLowerCase());
      const skillMatch = rSkills.length ? rSkills.filter(s => pSkills.includes(s)).length / rSkills.length : 0;
      const expReq = job.experience_required || 0;
      const expScore = expReq === 0 ? 1 : Math.min(1, (profile.experience_years || 0) / expReq);
      const score = 0.7 * skillMatch + 0.3 * expScore;
      return {
        jobId: job._id,
        job,
        matchScore: Math.round(score * 100),
        explainability: { skillMatch, expScore }
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ ok: true, recommendations: scored.slice(0, Number(req.query.top_k || 20)) });
  } catch (err) {
    console.error('debug/recommendations err', err);
    return res.status(500).json({ ok: false, err: String(err) });
  }
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || String(err) });
});

//  START SERVER 
app.listen(PORT, () => {
  console.log(`Server started at PORT: ${PORT}`);
});
