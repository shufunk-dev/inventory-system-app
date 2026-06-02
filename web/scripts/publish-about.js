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
const aboutPath = path.resolve(__dirname, '../about_the_app.md');

async function publishAboutPage() {
  if (!fs.existsSync(aboutPath)) {
    console.error(`About markdown file not found at: ${aboutPath}`);
    process.exit(1);
  }

  console.log("Reading about_the_app.md...");
  let markdownContent = fs.readFileSync(aboutPath, 'utf-8');

  // Strip metadata lines if any exist
  markdownContent = markdownContent.split('\n')
    .filter(line => !line.startsWith('Created At:') && !line.startsWith('Completed At:') && !line.startsWith('File Path:'))
    .join('\n');

  const htmlContent = marked.parse(markdownContent);
  const title = "About";

  try {
    // 1. Search for existing page with slug 'about'
    console.log("Checking if 'about' page already exists on WordPress...");
    const checkRes = await fetch(`${WP_URL}/wp-json/wp/v2/pages?slug=about`, {
      headers: { 'Authorization': authHeader }
    });

    if (!checkRes.ok) {
      const err = await checkRes.json();
      throw new Error(`WordPress search failed: ${err.message}`);
    }

    const pages = await checkRes.json();
    let response;

    if (pages.length > 0) {
      const pageId = pages[0].id;
      console.log(`Page found with ID ${pageId}. Updating about page...`);
      
      // 2a. Update the existing page
      response = await fetch(`${WP_URL}/wp-json/wp/v2/pages/${pageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          title: title,
          content: htmlContent,
          status: 'publish'
        })
      });
    } else {
      console.log("No existing about page found. Creating a new page...");
      
      // 2b. Create a new page
      response = await fetch(`${WP_URL}/wp-json/wp/v2/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          title: title,
          content: htmlContent,
          slug: 'about',
          status: 'publish'
        })
      });
    }

    if (response.ok) {
      const data = await response.json();
      console.log(`\n✅ Success! The About page is live at: ${data.link}`);
    } else {
      const errorData = await response.json();
      console.error(`\n❌ Failed to publish: ${errorData.message}`);
    }
  } catch (e) {
    console.error(`\n❌ Error: ${e.message}`);
  }
}

publishAboutPage();
