
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

async function runDiagnostic() {
  console.log('🧪 Starting Surgical Diagnosis...');
  
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to DB');
    
    // 1. Find a test user or create one
    let user = await User.findOne({ email: /test/i });
    if (!user) {
        user = await User.findOne({});
    }
    
    if (!user) {
        console.error('❌ No users found in DB to test with.');
        return;
    }
    
    console.log(`👤 Testing with user: ${user.fullName} (${user._id})`);
    
    // 2. Mock a token (we need a real token to bypass auth)
    // For this diagnostic, we'll temporarily disable auth requirement or use a real token generator helper
    const { createTokenForUser } = require('./services/authentication');
    const token = createTokenForUser(user);
    console.log('🎫 Generated test token');
    
    // 3. Prepare Multi-part form data
    const form = new FormData();
    const dummyPath = path.resolve(__dirname, 'test_resume.pdf');
    if (!fs.existsSync(dummyPath)) {
        fs.writeFileSync(dummyPath, '%PDF-1.4\n%test resume content');
    }
    
    // 4. Test Roadmap Generation
    console.log('🗺️ Testing Roadmap Generation with Blockchain Developer goal...');
    const roadmapRes = await axios.post('http://localhost:5001/generate-roadmap', {
        profile: {
            fullName: user.fullName,
            skills: user.profile?.skills || ['JavaScript', 'Solidity'],
            experience_years: user.profile?.experience_years || 2,
            role: user.profile?.role || 'Developer'
        },
        goal: 'Blockchain Developer',
        hours_per_week: 10
    }, { timeout: 45000 });
    
    console.log('✅ Roadmap Status:', roadmapRes.status);
    const roadmap = roadmapRes.data.roadmap;
    console.log('📄 Roadmap Sample:', {
        goal: roadmap.goal,
        timeline: roadmap.timeline,
        phases_count: roadmap.phases?.length
    });
    
    // 5. Test Non-Technical Profile Filtering
    console.log('⛔ Testing Non-Technical Recommendation Filtering (Sales Manager)...');
    try {
        const nonTechRes = await axios.post('http://localhost:5001/api/recommend', {
            profile: {
                skills: ['Sales', 'Marketing', 'Customer Relationship Management', 'Cold Calling'],
                experience_years: 10,
                role: 'Sales Manager',
                experience: [{ title: 'Sales Manager', description: 'Managed a team of 10 sales reps' }]
            },
            jobs: [{ title: 'Software Engineer', requiredSkills: ['React', 'Node.js'] }],
            top_k: 5
        }, { timeout: 30000 });
        
        const data = nonTechRes.data.data;
        console.log('📄 AI Response for Non-Tech:', {
            recommendations_count: data.recommendations.length,
            is_non_tech: data.meta?.is_non_tech,
            reason: data.meta?.reason
        });
        
        if (data.meta?.is_non_tech === true && data.recommendations.length === 0) {
            console.log('✨ Non-tech Filtering verification PASSED: Correctly identified and blocked.');
        } else {
            console.error('❌ Non-tech Filtering verification FAILED: Unexpected response.');
        }
    } catch (e) {
        console.error('❌ Non-tech Test Error:', e.message);
    }
    
  } catch (err) {
    console.error('❌ Diagnostic Failed:');
    if (err.response) {
        console.error('Status:', err.response.status);
        console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
        console.error(err.message);
    }
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

runDiagnostic();
