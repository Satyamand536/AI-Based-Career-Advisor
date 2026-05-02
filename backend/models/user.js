const mongoose = require("mongoose");
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true, // Optimizes lookup
  },
  salt: { type: String }, // Store as hex string for simplicity in this version if needed, or Buffer
  password: { type: String, required: true },
  
  // Profile Summary (Lightweight)
  profile: {
    headline: { type: String },
    location: { type: String },
    contact: { type: String },
    bio: { type: String }
  },
  
  profileImageURL: { type: String, default: "/images/hacker.png" },
  role: { type: String, enum: ["USER", "ADMIN"], default: "USER", index: true },
  
  // Platform Status
  current_stage: { 
    type: String, 
    enum: ["NO", "MORE", "GOOD", "WORK", "UNCLASSIFIED"], 
    default: "UNCLASSIFIED" 
  },
  readiness_score: { type: Number, default: 0, min: 0, max: 100 },
  
  resume_url: { type: String }, // Added for persistent resume tracking
  
  // SaaS Fields
  subscription_tier: { 
    type: String, 
    enum: ["FREE", "PRO"], 
    default: "FREE" 
  },
  
}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  const salt = randomBytes(16).toString('hex');
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  user.salt = salt;
  user.password = hashedPassword;
  next();
});

userSchema.statics.matchPasswordAndGenerateToken = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("User not found!");

  const salt = user.salt;
  const hashedPassword = user.password;

  const userProvidedHash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");

  if (hashedPassword !== userProvidedHash) throw new Error("Incorrect password");

  return createTokenForUser(user);
};

const User = mongoose.model("user", userSchema);
module.exports = User;
