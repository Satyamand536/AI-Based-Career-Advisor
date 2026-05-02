const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserProfile = require('../models/userProfile');
const Job = require('../models/job');
const User = require('../models/user');

async function diagnose() {
  try {
    console.log('🔍 Starting Diagnosis...');
    console.log('📂 MongoDB URL:', process.env.MONGO_URL);

    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // 1. Check Jobs
    const jobCount = await Job.countDocuments();
    console.log(`\n📊 Jobs in DB: ${jobCount}`);
    if (jobCount === 0) {
      console.error('❌ CRITICAL: No jobs found! You need to run "node scripts/seedJobs.js"');
    } else {
      const sampleJob = await Job.findOne();
      console.log('   Sample Job Skills:', sampleJob.requiredSkills);
    }

    // 2. Check User Profiles
    const profiles = await UserProfile.find({});
    console.log(`\n👤 User Profiles found: ${profiles.length}`);
    
    if (profiles.length === 0) {
      console.error('❌ CRITICAL: No user profiles found! Resume upload is not saving profiles.');
    }

    for (const p of profiles) {
      console.log(`\n   -----------------------------------------`);
      console.log(`   Profile ID: ${p._id}`);
      console.log(`   User ID: ${p.userId}`);
      console.log(`   Name: ${p.name}`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Skills Extracted: ${p.skills ? p.skills.join(', ') : 'NONE'}`);
      console.log(`   Experience: ${p.experience_years} years`);
      
      // Simulating Recommendations for this profile
      console.log(`\n   ⚡ Simulating Recommendations for this profile:`);
      const jobs = await Job.find({}).lean();
      
      const scored = jobs.map(job => {
        const pSkills = (p.skills || []).map(s => s.toLowerCase());
        const rSkills = (job.requiredSkills || []).map(s => s.toLowerCase());
        
        // Exact match overlap
        const matches = rSkills.filter(s => pSkills.includes(s));
        const skillMatch = rSkills.length ? matches.length / rSkills.length : 0;
        
        return {
          title: job.title,
          skillMatch: skillMatch,
          matchedSkills: matches
        };
      }).filter(r => r.skillMatch > 0).sort((a,b) => b.skillMatch - a.skillMatch).slice(0, 3);

      if (scored.length === 0) {
         console.log('   ⚠️ No job matches found based on skills!');
         console.log('      Possible issue: Resume parser extracted wrong skills or mismatch in skill names.');
      } else {
         console.log('   ✅ Top 3 Potential Matches:');
         scored.forEach(s => console.log(`      - ${s.title} (Match: ${(s.skillMatch*100).toFixed(0)}%, Skills: ${s.matchedSkills.join(', ')})`));
      }
    }

  } catch (err) {
    console.error('❌ Diagnosis Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🏁 Diagnosis Complete.');
  }
}

diagnose();
