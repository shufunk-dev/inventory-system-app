const axios = require('axios');
const fs = require('fs');

async function testVision() {
  try {
    const fileBuffer = fs.readFileSync('public/uploads/test.jpg'); // need a test image
  } catch(e) {
  }
}
