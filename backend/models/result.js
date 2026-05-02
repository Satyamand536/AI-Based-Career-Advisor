const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  test_id: { type: mongoose.Schema.Types.ObjectId, ref: "test", required: true },
  
  score: { type: Number, required: true },
  total_questions: { type: Number, required: true },
  
  // AI Analysis of the Result
  skill_gaps: [String], // Identified weak areas
  improvement_plan: { type: String }, // Quick tip
  
  answers: [
    {
        question_id: mongoose.Schema.Types.ObjectId,
        selected_option: Number,
        is_correct: Boolean
    }
  ],
  
  completed_at: { type: Date, default: Date.now }
}, { timestamps: true });

const Result = mongoose.model("result", resultSchema);
module.exports = Result;
