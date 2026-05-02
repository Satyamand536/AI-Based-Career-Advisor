const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, set: (v) => v.toLowerCase() },
  category: { type: String }, // e.g., "Frontend", "Backend", "DevOps"
  
  related_skills: [String], // e.g., ["React", "Redux"] for "React.js"
  
  popularity_score: { type: Number, default: 0 } // Track how often this skill appears in jobs
});

const Skill = mongoose.model("skill", skillSchema);
module.exports = Skill;
