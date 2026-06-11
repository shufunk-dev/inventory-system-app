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

    console.log("3. Formatting custom dark theme CSS (matching app styling)...");
    const customCss = `/* 
   Shufelt Designs LLC Wiki Skin Customization
   Matches the Inventory & POS System dark-theme aesthetics.
*/

/* Core background and typography */
body, html, #mw-page-base, #mw-head-base {
    background-color: #0a0a0a !important;
    background-image: none !important;
    color: #ededed !important;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}

/* Content Panel Wrapper */
#content, .mw-body, #mw-content-text {
    background-color: #0f0f11 !important;
    color: #ededed !important;
    border-color: #1f2937 !important;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
    color: #ffffff !important;
    border-bottom: 1px solid #1f2937 !important;
}

/* Page main header accent */
h1.firstHeading, #firstHeading {
    color: #ffffff !important;
    font-weight: 800 !important;
    border-bottom: 1px solid #1f2937 !important;
}

/* Navigation sidebar & headers */
#mw-navigation, #mw-panel, #mw-head, .vector-sidebar-container, .vector-header-container {
    background-color: #0a0a0a !important;
    border-color: #1f2937 !important;
}

.vector-menu-portal .vector-menu-heading, .vector-menu-heading {
    color: #3b82f6 !important; /* Blue header titles */
    font-weight: bold !important;
    text-transform: uppercase !important;
    font-size: 0.8rem !important;
}

/* Sidebar navigation links */
.vector-menu-content-list li a, #mw-panel a, #p-navigation a, .vector-menu-list a {
    color: #9ca3af !important;
    transition: color 0.15s ease !important;
}

.vector-menu-content-list li a:hover, #mw-panel a:hover, #p-navigation a:hover, .vector-menu-list a:hover {
    color: #60a5fa !important;
    text-decoration: none !important;
}

/* Hyperlinks */
a, a:visited, .mw-body a.external {
    color: #60a5fa !important;
    transition: color 0.15s ease !important;
}

a:hover, .mw-body a.external:hover {
    color: #93c5fd !important;
    text-decoration: underline !important;
}

/* Red links for non-existent pages */
a.new, a.new:visited {
    color: #ef4444 !important;
}

/* Vector Search bar box */
#searchInput, .vector-search-box-input, .mw-ui-input {
    background-color: #111827 !important;
    color: #ffffff !important;
    border: 1px solid #1f2937 !important;
    border-radius: 8px !important;
}

#searchInput:focus, .vector-search-box-input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
}

/* Tabs & Page Actions (Read, Edit, View History) */
.vector-menu-tabs, .vector-menu-tabs-legacy, #p-views, #p-namespaces {
    background: transparent !important;
}

.vector-menu-tabs li, .vector-menu-tabs-legacy li {
    background-color: #111827 !important;
    border: 1px solid #1f2937 !important;
    border-radius: 6px 6px 0 0 !important;
    margin-right: 2px !important;
}

.vector-menu-tabs li a, .vector-menu-tabs-legacy li a {
    color: #9ca3af !important;
    background: transparent !important;
}

.vector-menu-tabs li.selected, .vector-menu-tabs-legacy li.selected {
    background-color: #0f0f11 !important;
    border-bottom-color: #0f0f11 !important;
}

.vector-menu-tabs li.selected a, .vector-menu-tabs-legacy li.selected a {
    color: #60a5fa !important;
    font-weight: bold !important;
}

/* Wikitables styling */
table.wikitable {
    background-color: #111827 !important;
    color: #ededed !important;
    border: 1px solid #1f2937 !important;
    border-collapse: collapse !important;
}

table.wikitable th {
    background-color: #1f2937 !important;
    color: #ffffff !important;
    border: 1px solid #374151 !important;
    padding: 8px !important;
}

table.wikitable td {
    border: 1px solid #1f2937 !important;
    padding: 8px !important;
}

/* Code snippets and pre-formatted text blocks */
pre, code, .mw-code {
    background-color: #111827 !important;
    color: #60a5fa !important;
    border: 1px solid #1f2937 !important;
    border-radius: 6px !important;
    padding: 4px 6px !important;
}

/* Footer configuration */
#footer, #footer-info {
    background-color: #0a0a0a !important;
    color: #4b5563 !important;
    border-top: 1px solid #1f2937 !important;
    padding: 20px 0 !important;
}

/* Category list bar at bottom */
.catlinks {
    background-color: #111827 !important;
    border: 1px solid #1f2937 !important;
    border-radius: 8px !important;
    color: #9ca3af !important;
    padding: 10px !important;
}
`;

    console.log("4. Uploading skin stylesheet to MediaWiki:Common.css...");
    const editRes = await wikiRequest({ action: 'edit' }, {
      title: 'MediaWiki:Common.css',
      text: customCss,
      summary: 'Upload Shufelt Designs dark theme skin stylesheet',
      token: csrftoken
    });

    if (editRes.edit?.result === 'Success') {
      console.log("✅ Custom skin CSS applied successfully!");
    } else {
      console.log("❌ Failed to apply skin CSS:", JSON.stringify(editRes));
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
