const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  company: { type: String, required: true },
  description: { type: String, required: true },
  
  location: { type: String },
  type: { type: String, enum: ["Full-time", "Part-time", "Contract", "Internship", "Remote"], default: "Full-time" },
  
  required_skills: { type: [String], index: true },
  category: { type: String, index: true }, // ADDED for AI Matching
  experience_required: { type: Number, default: 0 }, // ADDED for AI Matching
  
  // Link to external source if scraped
  source_link: { type: String },
  apply_url: { type: String },
  source: { type: String, enum: ["adzuna","themuse","jooble","manual","seed"], default: "manual" },
  salary_min: { type: Number },
  salary_max: { type: Number },
  
  // Vector Embeddings for AI Matching
  embeddings: { type: [Number] },
  
  posted_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Job = mongoose.model("job", jobSchema);
module.exports = Job;
