require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/job');

// Sample jobs data using the Job schema field names.
const sampleJobs = [
  {
    title: "Senior Full Stack Developer",
    company: "Tech Corp India",
    description: "We are looking for experienced full stack developers...",
    location: "Bangalore",
    type: "Full-time",
    required_skills: ["React", "Node.js", "MongoDB", "AWS"],
    experience_required: 5,
    salary_min: 800000,
    salary_max: 1500000,
    category: "IT",
    source: "seed",
  },
  {
    title: "Data Scientist",
    company: "AI Solutions",
    description: "Join our data science team...",
    location: "Mumbai",
    type: "Full-time",
    required_skills: ["Python", "Machine Learning", "TensorFlow", "SQL"],
    experience_required: 3,
    salary_min: 600000,
    salary_max: 1200000,
    category: "Data Science",
    source: "seed",
  },
  // Add more jobs...
];

async function loadJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('MongoDB connected');

    // Delete existing jobs
    await Job.deleteMany({});
    console.log('Cleared existing jobs');

    // Insert new jobs
    const inserted = await Job.insertMany(sampleJobs);
    console.log(`${inserted.length} jobs loaded successfully!`);

    mongoose.connection.close();
  } catch (err) {
    console.error('Error loading jobs:', err);
  }
}

loadJobs();
