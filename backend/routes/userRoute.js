const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { validateToken } = require("../services/authentication");

// ----------------------------
// VALIDATION REGEX
// ----------------------------
const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ----------------------------
// EMAIL CHECK
// ----------------------------
router.get("/check-email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) return res.status(400).json({ error: "Email required" });

    if (!emailRegex.test(email))
      return res.status(400).json({ error: "Invalid email format" });

    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch (err) {
    console.error("Email check error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------
// SIGNUP ROUTE
// ----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    if (fullName.trim().length < 3)
      return res
        .status(400)
        .json({ error: "Full name must be at least 3 characters" });

    if (!emailRegex.test(email))
      return res.status(400).json({ error: "Invalid email format" });

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be 8+ chars, include uppercase, lowercase, number & special char",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedPassword = password.toLowerCase();

    // ⛔ BLOCKED PATTERNS (per user request)
    if (normalizedEmail.includes("testuser") || fullName.toLowerCase().includes("testuser")) {
      return res.status(400).json({ error: "Registration with 'testuser' patterns is not allowed." });
    }
    if (normalizedPassword === "password@123") {
      return res.status(400).json({ error: "This password is too common and not allowed." });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser)
      return res.status(409).json({ error: "User already exists" });

    const newUser = new User({
      fullName,
      email: normalizedEmail,
      password,
    });

    await newUser.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------
// SIGNIN
// ----------------------------
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = await User.matchPasswordAndGenerateToken(
      email.toLowerCase(),
      password
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.json({
      message: "Signin successful",
      user: { 
        _id: user._id, 
        fullName: user.fullName, 
        email: user.email,
        role: user.role,
        current_stage: user.current_stage,
        readiness_score: user.readiness_score,
        profile: user.profile,
        resume_url: user.resume_url
      },
    });
  } catch (err) {
    if (err.message === "User not found!" || err.message === "User not found") {
      return res.status(404).json({ error: "User not found" });
    }

    if (err.message === "Incorrect password") {
      // No need to log known password errors as full server errors
      return res.status(401).json({ error: "Incorrect password" });
    }

    console.error("Signin unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------------------
// CHECK LOGIN
// ----------------------------
router.get("/check-login", async (req, res) => {
  // Prevent aggressive browser caching of user session
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  try {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    const decoded = validateToken(token);
    const user = await User.findById(decoded._id).select("fullName email role current_stage readiness_score profile resume_url");

    if (!user) return res.json({ loggedIn: false });

    return res.json({
      loggedIn: true,
      user: { 
        _id: user._id,
        fullName: user.fullName, 
        email: user.email,
        role: user.role,
        current_stage: user.current_stage,
        readiness_score: user.readiness_score,
        profile: user.profile,
        resume_url: user.resume_url
      },
    });
  } catch (err) {
    console.error("Check login error:", err);
    return res.status(401).json({ loggedIn: false });
  }
});

// ----------------------------
// LOGOUT
// ----------------------------
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.json({ message: "Logged out successfully" });
});

module.exports = router;
