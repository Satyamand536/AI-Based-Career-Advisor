
const mongoose = require("mongoose");
const Resume = require("./models/resume");
require("dotenv").config();

async function checkResumes() {
    try {
        await mongoose.connect(process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ai-career-advisor");
        console.log("Connected to MongoDB");
        
        const resumes = await Resume.find({}).limit(5).lean();
        console.log(`Total resumes found: ${resumes.length}`);
        
        resumes.forEach((r, i) => {
            console.log(`\n--- Resume ${i+1} ---`);
            console.log(`User ID: ${r.user_id}`);
            console.log(`File URL: ${r.file_url}`);
            console.log(`Parsed Data Keys: ${Object.keys(r.parsed_data || {})}`);
            console.log(`Skills: ${r.parsed_data?.skills?.length || 0}`);
            console.log(`Experience: ${r.parsed_data?.experience?.length || 0}`);
            console.log(`Embeddings Length: ${r.embeddings?.length || 0}`);
        });
        
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkResumes();
