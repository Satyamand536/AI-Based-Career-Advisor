// backend/models/UserProfile.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserProfileSchema = new Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "user", 
    required: true, 
    unique: true,
    index: true
  },
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  skills: { type: [String], default: [] },
  experience_years: { type: Number, default: 0 },
  education: { type: [String], default: [] },
  resumePath: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
