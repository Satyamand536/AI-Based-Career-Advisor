const { Schema, model } = require("mongoose");

const userProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
    unique: true,
  },
  resume: {
    filePath: String,
    parsedText: String,
    uploadedAt: Date,
  },
  education: {
    degree: String,
    branch: String,
    university: String,
    gpa: Number,
    passingYear: Number,
  },
  skills: [String],
  experience: {
    totalYears: Number,
    companies: [
      {
        name: String,
        role: String,
        years: Number,
      },
    ],
  },
  preferredLocations: [String],
  preferredJobTypes: [String],
  salaryExpectation: {
    min: Number,
    max: Number,
  },
  careerGoals: String,
  // AI ke liye
  profileEmbedding: [Number],
  skills_vector: [Number],
  
}, { timestamps: true });

const userProfile = model("userProfile", userProfileSchema);
module.exports = userProfile;
