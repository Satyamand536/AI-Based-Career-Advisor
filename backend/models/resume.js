const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "user", 
    required: true,
    index: true 
  },
  file_url: { type: String, required: true },
  
  // AI Parsed Data (JSON Storage for flexibility)
  parsed_data: {
    skills: [String],
    education: [
        {
            degree: String,
            institution: String,
            year: String
        }
    ],
    experience: [
        {
            title: String,
            company: String,
            duration: String,
            description: String
        }
    ],
    raw_text: String
  },
  
  // Vector Embeddings for Similarity Search
  // Vector Embeddings for Similarity Search
  embeddings: { type: [Number] }, // Indexed via Atlas Vector Search in production
  // Note: Standard MongoDB doesn't index arrays as vectors natively without Atlas Vector Search. 
  // We will store it for Python to read.
  
  parsed_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Resume = mongoose.model("resume", resumeSchema);
module.exports = Resume;
