require("dotenv").config();
const mongoose = require("mongoose");
const Job = require("./backend/models/job");

async function checkJobs() {
    const mongoUrl = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ai_app";
    await mongoose.connect(mongoUrl);
    const job = await Job.findOne().lean();
    console.log("SAMPLE JOB FROM DB:", JSON.stringify(job, null, 2));
    process.exit(0);
}

checkJobs();
