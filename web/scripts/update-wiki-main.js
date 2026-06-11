const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const WIKI_API_URL = process.env.WIKI_API_URL;
const WIKI_USER = process.env.WIKI_USER;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

if (!WIKI_USER || !WIKI_PASSWORD) {
  console.error("Missing MediaWiki credentials in .env.local");
  process.exit(1);
}

const cookieJar = {};

function updateCookies(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  cookies.forEach(cookieStr => {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      cookieJar[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

function getCookieHeader() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function wikiRequest(params, postData = null) {
  const headers = {};
  const cookies = getCookieHeader();
  if (cookies) headers['Cookie'] = cookies;
  if (postData) headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const res = await axios({
    method: postData ? 'POST' : 'GET',
    url: WIKI_API_URL,
    params: { ...params, format: 'json' },
    data: postData ? new URLSearchParams(postData).toString() : null,
    headers
  });
  updateCookies(res.headers);
  return res.data;
}

async function run() {
  try {
    console.log("1. Authenticating...");
    const tokRes = await wikiRequest({ action: 'query', meta: 'tokens', type: 'login' });
    const logintoken = tokRes.query.tokens.logintoken;
    
    const loginRes = await wikiRequest({ action: 'login' }, {
      lgname: WIKI_USER,
      lgpassword: WIKI_PASSWORD,
      lgtoken: logintoken
    });
    if (loginRes.login.result !== 'Success') {
      throw new Error("Login failed: " + JSON.stringify(loginRes.login));
    }
    console.log("   Logged in successfully.");

    console.log("2. Fetching CSRF token...");
    const csrfRes = await wikiRequest({ action: 'query', meta: 'tokens', type: 'csrf' });
    const csrftoken = csrfRes.query.tokens.csrftoken;

    console.log("3. Overwriting Main Page with clean product catalog index...");
    const newContent = `__NOTOC__
Welcome to the official '''Shufelt Designs LLC Product Manuals & Documentation Wiki'''. Here you will find guides, setup instructions, and reference manuals for the product suites created by Shufelt Designs.

== Shufelt Designs Products ==

=== Inventory & POS System ===
A local-first, multi-store offline inventory cataloging and Point-of-Sale management system.
* [[Inventory POS: Introduction And Modes|Introduction and Operating Modes]]
* [[Inventory POS: Scanning And Ai Pipeline|Scanning & AI Identification Pipeline]]
* [[Inventory POS: Multistore Booths|Multi-Store & Booth Configurations]]
* [[Inventory POS: Pos And Qr Checkouts|Point of Sale (POS) & QR Checkouts]]
* [[Inventory POS: Valuation And Depletions|Valuation, Audits, and Depletions]]
* Browse all pages in [[:Category:Inventory and POS System]]

=== Elite Dangerous WordPress Plugins ===
Custom WordPress plugins designed for Elite Dangerous players, commanders, and squadrons.
* ''Documentation pages are currently being prepared.''

=== Photo Album Organizer ===
An automated, local-first image tagging, indexing, and organizer suite.
* ''Documentation pages are currently being prepared.''

[[Category:Product Documentation]]`;

    console.log("4. Updating Main Page...");
    const editRes = await wikiRequest({ action: 'edit' }, {
      title: 'Main Page',
      text: newContent,
      summary: 'Clean Main Page: Remove default boilerplate and establish Shufelt Designs product directory index',
      token: csrftoken
    });

    if (editRes.edit?.result === 'Success') {
      console.log("✅ Main Page successfully cleaned and updated!");
    } else {
      console.log("❌ Failed to update Main Page:", JSON.stringify(editRes));
    }

    console.log("5. Creating/Updating Category:Inventory and POS System page...");
    const catContent = `This category contains all documentation pages, setup guides, and technical reference manuals for the '''Shufelt Designs Inventory & POS System'''.

[[Category:Product Documentation]]`;
    const catRes = await wikiRequest({ action: 'edit' }, {
      title: 'Category:Inventory and POS System',
      text: catContent,
      summary: 'Establish Category:Inventory and POS System page with description',
      token: csrftoken
    });

    if (catRes.edit?.result === 'Success') {
      console.log("✅ Category page successfully created/updated!");
    } else {
      console.log("❌ Failed to update Category page:", JSON.stringify(catRes));
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
