/**
 * Seed script to populate MongoDB with DIVERSE tech jobs
 * Run with: node scripts/seedJobs.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("../models/job");
const fs = require('fs');
const path = require('path');

// Read dataset from JSON file
const datasetPath = path.join(__dirname, '..', 'data', 'jobs_dataset.json');
let jobDefinitions = [];

try {
  const rawData = fs.readFileSync(datasetPath);
  jobDefinitions = JSON.parse(rawData);
} catch (err) {
  console.error("❌ Failed to read jobs_dataset.json:", err.message);
  process.exit(1);
}

async function seedJobs() {
  try {
    console.log("🌱 Starting job seeding process (Dataset Mode)...\n");

    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ai_app";
    if (!mongoUrl) {
      throw new Error("MONGO_URL not configured");
    }

    await mongoose.connect(mongoUrl);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing jobs
    const deleteResult = await Job.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing jobs\n`);

    // Insert jobs
    console.log(`💾 Inserting ${jobDefinitions.length} jobs into database...\n`);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < jobDefinitions.length; i++) {
      const job = jobDefinitions[i];
      try {
        await Job.create({
          ...job,
          postedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        console.log(`   ❌ Failed to insert ${job.title}: ${error.message}`);
        failCount++;
      }
    }

    console.log("═".repeat(60));
    console.log(`✅ Seeding complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log("═".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seedJobs();
