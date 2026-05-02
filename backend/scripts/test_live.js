const axios = require('axios');

async function check() {
  try {
    console.log('Testing GET /jobs/recommendations...');
    // Request without cookie first
    const res = await axios.get('http://localhost:8000/jobs/recommendations');
    console.log('Status:', res.status);
    console.log('Data OK:', res.data.ok);
    console.log('Recs Count:', res.data.recommendations?.length);
    if (res.data.recommendations?.length > 0) {
        console.log('First Rec:', res.data.recommendations[0]);
    } else {
        console.log('No recs returned.');
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
       console.log('Response data:', e.response.data);
    }
  }
}

check();
