const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ["Video", "Article", "Course", "Documentation", "Book", "GitHub Repo", "Website", "Tool", "Interactive"], default: "Article" },
    is_free: { type: Boolean, default: true }
});

const moduleSchema = new mongoose.Schema({
    title: { type: String, required: true }, // e.g., "Master React Hooks"
    description: { type: String },
    status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    resources: [resourceSchema],
    estimated_time: { type: String } // "2 hours"
});

const trainingRoadmapSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
  goal: { type: String, required: false }, // e.g., "Become a Senior Frontend Dev"
  
  modules: [moduleSchema],
  
  progress: { type: Number, default: 0 }, // 0 to 100
  raw_ai_roadmap: { type: String },       // Full AI roadmap JSON for rich frontend rendering
  generated_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

const TrainingRoadmap = mongoose.model("trainingRoadmap", trainingRoadmapSchema);
module.exports = TrainingRoadmap;
