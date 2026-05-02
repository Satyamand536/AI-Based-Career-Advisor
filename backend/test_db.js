const mongoose = require('mongoose');
const MONGO_URL = "mongodb://127.0.0.1:27018/career_advisor_db";

console.log("Connecting to:", MONGO_URL);
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log("SUCCESS: Connected to MongoDB on 27018");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILURE: Could not connect to MongoDB:", err.message);
    process.exit(1);
  });

setTimeout(() => {
  console.error("TIMEOUT: Connection attempt took too long (>10s)");
  process.exit(1);
}, 10000);
