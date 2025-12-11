const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { checkForAuthenticationCookie } = require("../middlewares/auth");

// Create uploads directory
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files allowed"));
    }
  },
});

// ===== UPLOAD RESUME =====
router.post(
  "/upload-resume",
  checkForAuthenticationCookie("token"),
  upload.single("resume"),
  async (req, res) => {
    try {
      console.log("📤 Resume upload request received");
      console.log("👤 User:", req.user);
      console.log("📁 File:", req.file);

      // Check if user is logged in
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: "Please login first" 
        });
      }

      // Check if file exists
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: "No file uploaded" 
        });
      }

      console.log("✅ File saved:", req.file.filename);

      // Return success
      const response = {
        success: true,
        message: "Resume uploaded successfully!",
        profile: {
          userId: req.user._id,
          resume: {
            filePath: req.file.path,
            filename: req.file.filename,
            uploadedAt: new Date(),
          },
          skills: ["Java", "Python", "React"], // Dummy for now
          education: "B.Tech",
          experience: 2,
        },
      };

      console.log("📤 Sending response:", response);
      return res.status(200).json(response);

    } catch (err) {
      console.error("❌ Resume upload error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message || "Resume upload failed" 
      });
    }
  }
);

// ===== GET RECOMMENDATIONS =====
router.get(
  "/recommendations",
  checkForAuthenticationCookie("token"),
  async (req, res) => {
    try {
      console.log("📥 Recommendations request from:", req.user?.email);

      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: "Please login first" 
        });
      }

      // Dummy recommendations
      const recommendations = [
        {
          job: {
            id: "1",
            title: "Full Stack Developer",
            company: "Tech Corp",
            location: "Bangalore",
            jobType: "Full-Time",
            requiredSkills: ["React", "Node", "MongoDB"],
          },
          matchScore: 92,
          reason: "Perfect skill match for this role",
        },
        {
          job: {
            id: "2",
            title: "Senior Developer",
            company: "StartUp XYZ",
            location: "Mumbai",
            jobType: "Remote",
            requiredSkills: ["React", "TypeScript", "AWS"],
          },
          matchScore: 85,
          reason: "Great opportunity for career growth",
        },
      ];

      return res.status(200).json({
        success: true,
        recommendations: recommendations,
      });

    } catch (err) {
      console.error("❌ Recommendations error:", err);
      return res.status(500).json({ 
        success: false,
        error: err.message 
      });
    }
  }
);

// ===== GET JOBS =====
router.get("/jobs", async (req, res) => {
  try {
    const jobs = [
      {
        _id: "1",
        jobTitle: "Full Stack Developer",
        company: "Tech Corp",
        location: "Bangalore",
        jobType: "Full-Time",
        requiredSkills: ["React", "Node", "MongoDB"],
      },
      {
        _id: "2",
        jobTitle: "Frontend Developer",
        company: "WebSoft",
        location: "Delhi",
        jobType: "Remote",
        requiredSkills: ["React", "JavaScript", "CSS"],
      },
    ];

    return res.status(200).json({
      success: true,
      jobs: jobs,
      total: jobs.length,
    });

  } catch (err) {
    console.error("❌ Jobs error:", err);
    return res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;
