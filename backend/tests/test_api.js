// Test script for API endpoints
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8000';

async function testAPIs() {
  console.log('🧪 Testing API Endpoints\n');
  console.log('═'.repeat(60));
  
  let authCookie = null;
  
  // Test 1: Signup
  console.log('\n📝 Test 1: User Signup');
  try {
    const signupRes = await axios.post(`${BASE_URL}/user/signup`, {
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      password: 'Test@1234'
    });
    console.log('✅ Signup successful:', signupRes.data);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists (expected if running multiple times)');
    } else {
      console.error('❌ Signup failed:', error.response?.data || error.message);
    }
  }
  
  // Test 2: Signin  
  console.log('\n🔐 Test 2: User Signin');
  try {
    const signinRes = await axios.post(`${BASE_URL}/user/signin`, {
      email: 'john.doe@test.com',
      password: 'Test@1234'
    });
    console.log('✅ Signin successful:', signinRes.data);
    
    // Extract cookie
    const cookies = signinRes.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      authCookie = cookies[0].split(';')[0];
      console.log('🍪 Got auth cookie:', authCookie);
    }
  } catch (error) {
    console.error('❌ Signin failed:', error.response?.data || error.message);
    process.exit(1);
  }
  
  // Test 3: Get Jobs
  console.log('\n📋 Test 3: Get Jobs');
  try {
    const jobsRes = await axios.get(`${BASE_URL}/jobs/jobs`);
    console.log(`✅ Found ${jobsRes.data.jobs.length} jobs`);
    console.log('Sample jobs:', jobsRes.data.jobs.slice(0, 3).map(j => ({
      title: j.title,
      company: j.company,
      skills: j.requiredSkills
    })));
  } catch (error) {
    console.error('❌ Get jobs failed:', error.response?.data || error.message);
  }
  
  // Test 4: Upload Resume
  console.log('\n📄 Test 4: Upload Resume');
  try {
    const form = new FormData();
    const resumePath = path.join(__dirname, 'fixtures', 'sample_resume.pdf');
    form.append('resume', fs.createReadStream(resumePath));
    
    const uploadRes = await axios.post(
      `${BASE_URL}/jobs/upload-resume`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Cookie': authCookie
        }
      }
    );
    
    console.log('✅ Resume uploaded successfully');
    console.log('Profile created:', {
      id: uploadRes.data.profileId,
      email: uploadRes.data.profile.email,
      skills: uploadRes.data.profile.skills,
      experience: uploadRes.data.profile.experience_years
    });
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
  }
  
  // Test 5: Get Recommendations
  console.log('\n🎯 Test 5: Get Recommendations');
  try {
    const recsRes = await axios.get(
      `${BASE_URL}/jobs/recommendations?top_k=5`,
      {
        headers: {
          'Cookie': authCookie
        }
      }
    );
    
    console.log(`✅ Got ${recsRes.data.recommendations.length} recommendations`);
    console.log('\nTop Recommendations:');
    recsRes.data.recommendations.slice(0, 5).forEach((rec, idx) => {
      console.log(`\n${idx + 1}. ${rec.job.title} at ${rec.job.company}`);
      console.log(`   Match Score: ${rec.matchScore}%`);
      console.log(`   Reason: ${rec.reason}`);
    });
  } catch (error) {
    console.error('❌ Get recommendations failed:', error.response?.data || error.message);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ All tests completed!');
}

testAPIs().catch(console.error);
