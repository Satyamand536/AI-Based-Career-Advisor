
const mongoose = require("mongoose");
const Job = require("./models/job");
require("dotenv").config();

async function checkJobs() {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ai-career-advisor");
        console.log("Connected to MongoDB");
        
        const count = await Job.countDocuments();
        console.log(`Total jobs in database: ${count}`);
        
        if (count > 0) {
            const samples = await Job.find({}).limit(3).select("title category");
            console.log("Sample Jobs:");
            samples.forEach(j => console.log(`- ${j.title} (${j.category})`));
        }
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkJobs();
