require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/job');

// Sample jobs data
const sampleJobs = [
  {
    jobTitle: "Senior Full Stack Developer",
    company: "Tech Corp India",
    description: "We are looking for experienced full stack developers...",
    location: "Bangalore",
    salary: { min: 800000, max: 1500000 },
    jobType: "Full-Time",
    requiredSkills: ["React", "Node.js", "MongoDB", "AWS"],
    experience: 5,
    qualifications: ["B.Tech", "BCA"],
    category: "IT",
    source: "LinkedIn",
  },
  {
    jobTitle: "Data Scientist",
    company: "AI Solutions",
    description: "Join our data science team...",
    location: "Mumbai",
    salary: { min: 600000, max: 1200000 },
    jobType: "Full-Time",
    requiredSkills: ["Python", "Machine Learning", "TensorFlow", "SQL"],
    experience: 3,
    qualifications: ["B.Tech", "MSc"],
    category: "Data Science",
    source: "Naukri",
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
