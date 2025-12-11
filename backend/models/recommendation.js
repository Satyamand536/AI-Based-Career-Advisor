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
  matchScore: Number, // 0-100
  matchReason: String,
  skillMatch: {
    matched: [String],
    missing: [String],
  },
  recommendedAt: {
    type: Date,
    default: Date.now,
  },
  clicked: { type: Boolean, default: false },
  applied: { type: Boolean, default: false },
}, { timestamps: true });

const recommendation = model("recommendation", recommendationSchema);
module.exports = recommendation;
