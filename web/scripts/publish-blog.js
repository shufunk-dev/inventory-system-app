const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const WP_URL = process.env.WP_URL;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD;

if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
  console.error("Missing WordPress credentials in .env.local");
  process.exit(1);
}

const authHeader = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');
const blogDir = path.resolve(__dirname, '../blog');

async function publish() {
  if (!fs.existsSync(blogDir)) {
    console.log("No blog directory found.");
    return;
  }

  const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') && !f.includes('.published'));
  
  if (files.length === 0) {
    console.log("No markdown files found in web/blog/");
    return;
  }

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title (assume first line is an h1)
    let title = file.replace('.md', '').replace(/-/g, ' '); // fallback
    const lines = content.split('\n');
    if (lines[0].startsWith('# ')) {
      title = lines[0].replace('# ', '').trim();
    }

    const htmlContent = marked.parse(content);

    console.log(`Publishing: "${title}"...`);

    try {
      const response = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          title: title,
          content: htmlContent,
          status: 'publish' // Change to 'draft' if we want to review first
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Success! Post available at: ${data.link}`);
        // Optionally rename the file to mark it as published
        fs.renameSync(filePath, filePath.replace('.md', '.published.md'));
      } else {
        const errorData = await response.json();
        console.error(`❌ Failed: ${errorData.message}`);
      }
    } catch (e) {
      console.error(`❌ Network error: ${e.message}`);
    }
  }
}

publish();
