const fs = require('fs');
require('dotenv').config({ path: '../.env.local' });

async function testSerpApi() {
  const query = encodeURIComponent("The Matrix movie");
  const url = `https://serpapi.com/search.json?q=${query}&api_key=${process.env.SERPAPI_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  const kg = data.knowledge_graph;
  console.log("Knowledge Graph:", JSON.stringify(kg, null, 2));
}

testSerpApi();
