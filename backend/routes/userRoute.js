const express = require("express");
const router = express.Router();
const User = require("../models/User");
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

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser)
      return res.status(409).json({ error: "User already exists" });

    const newUser = new User({
      fullName,
      email: email.toLowerCase(),
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
      user: { fullName: user.fullName, email: user.email },
    });
  } catch (err) {
    console.error("Signin error:", err);

    if (err.message?.toLowerCase().includes("incorrect")) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    return res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------------------
// CHECK LOGIN
// ----------------------------
router.get("/check-login", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    const decoded = validateToken(token);
    const user = await User.findById(decoded._id).select("fullName email");

    if (!user) return res.json({ loggedIn: false });

    return res.json({
      loggedIn: true,
      user: { fullName: user.fullName, email: user.email },
    });
  } catch (err) {
    console.error("Check login error:", err);
    return res.status(401).json({ loggedIn: false });
  }
});

module.exports = router;
