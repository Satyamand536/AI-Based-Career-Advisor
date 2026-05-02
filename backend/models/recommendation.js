const { Schema, model } = require("mongoose");

const recommendationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: "job",
    required: true,
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  reason: String,
  
  // Explainability object for transparent recommendations
  explainability: {
    skill_matches: [
      {
        skill: String,
        weight: Number,
      }
    ],
    embedding_similarity: Number,
    experience_score: Number,
  },
  
  recommendedAt: {
    type: Date,
    default: Date.now,
  },
  clicked: { type: Boolean, default: false },
  applied: { type: Boolean, default: false },
}, { timestamps: true });

// Index for efficient queries
recommendationSchema.index({ userId: 1, recommendedAt: -1 });
recommendationSchema.index({ jobId: 1 });

const Recommendation = model("recommendation", recommendationSchema);
module.exports = Recommendation;
