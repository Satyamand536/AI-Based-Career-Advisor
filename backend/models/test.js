const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }], // Array of 4 options
  correct_answer_index: { type: Number, required: true }, // 0-3
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], default: "Medium" },
  tags: [String], // e.g., ["React", "Hooks"]
  explanation: { type: String }
});

const testSchema = new mongoose.Schema({
  domain: { type: String, required: true }, // e.g., "Frontend Development"
  description: { type: String },
  questions: [questionSchema], // Embed questions for simplicity in this architecture
  created_by: { type: String, default: "AI_GENERATOR" },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

const Test = mongoose.model("test", testSchema);
module.exports = Test;
