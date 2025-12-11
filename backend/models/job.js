const { Schema, model } = require("mongoose");

const jobSchema = new Schema({
  jobTitle: {
    type: String,
    required: true,
    index: true,
  },
  company: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: "INR" },
  },
  jobType: {
    type: String,
    enum: ["Full-Time", "Part-Time", "Contract", "Internship", "Remote"],
    required: true,
  },
  requiredSkills: [String],
  experience: Number, // years
  qualifications: [String], // BA, BCA, etc
  category: String, // IT, Finance, HR, etc
  source: String, // LinkedIn, Naukri, etc
  sourceUrl: String,
  postedDate: {
    type: Date,
    default: Date.now,
  },
  // AI ke liye
  embedding: [Number], // FAISS ke liye vector store hoga
  keywords: [String],
}, { timestamps: true });

const Job = model("job", jobSchema);
module.exports = Job;
