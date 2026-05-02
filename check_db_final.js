const mongoose = require("mongoose");
const mongoUrl = "mongodb://127.0.0.1:27017/career_advisor_db";

async function check() {
    await mongoose.connect(mongoUrl);
    const db = mongoose.connection.db;
    const job = await db.collection("jobs").findOne();
    console.log("FINAL DB JOB CHECK:", JSON.stringify(job, null, 2));
    process.exit(0);
}

check();
