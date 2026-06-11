const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables from .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Configuration
const WIKI_API_URL = process.env.WIKI_API_URL || 'https://wiki.shufeltdesigns.com/api.php';
const WIKI_USER = process.env.WIKI_USER;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

// Cookie Jar for session management
const cookieJar = {};

function updateCookies(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return;
  
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  cookies.forEach(cookieStr => {
    const parts = cookieStr.split(';')[0].split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      cookieJar[key] = val;
    }
  });
}

function getCookieHeader() {
  return Object.entries(cookieJar)
    .map(([key, val]) => `${key}=${val}`)
    .join('; ');
}

/**
 * Converts standard Markdown markup to MediaWiki markup.
 */
function markdownToMediaWiki(md) {
  // Strip code block lines if they are leading metadata
  let lines = md.split('\n');
  
  // Remove metadata headers if any
  lines = lines.filter(line => !line.startsWith('Created At:') && !line.startsWith('Completed At:') && !line.startsWith('File Path:'));

  let inTable = false;
  let inCodeBlock = false;
  const mwLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        const lang = line.trim().slice(3).trim();
        mwLines.push(lang ? `<syntaxhighlight lang="${lang}">` : '<pre>');
      } else {
        const lastOpen = mwLines.findLast(l => l.startsWith('<syntaxhighlight') || l === '<pre>');
        mwLines.push(lastOpen && lastOpen.startsWith('<syntaxhighlight') ? '</syntaxhighlight>' : '</pre>');
      }
      continue;
    }

    if (inCodeBlock) {
      mwLines.push(line);
      continue;
    }

    // Markdown tables
    if (line.trim().startsWith('|')) {
      if (!inTable) {
        inTable = true;
        mwLines.push('{| class="wikitable"');
      }

      // Skip table alignment separator rows like: | :--- | :--- |
      if (line.match(/^\|[\s\-\:|]+\|$/)) {
        continue;
      }

      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => {
        if (idx === 0 && c === '') return false;
        if (idx === arr.length - 1 && c === '') return false;
        return true;
      });

      const isHeader = mwLines[mwLines.length - 1] === '{| class="wikitable"';
      if (isHeader) {
        mwLines.push('! ' + cells.join(' !! '));
      } else {
        mwLines.push('|-');
        mwLines.push('| ' + cells.join(' || '));
      }
      continue;
    } else {
      if (inTable) {
        inTable = false;
        mwLines.push('|}');
      }
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      const mwLevel = '='.repeat(level + 1); // # becomes ==, ## becomes ===
      mwLines.push(`${mwLevel} ${title} ${mwLevel}`);
      continue;
    }

    // Horizontal rules
    if (line.trim() === '---' || line.trim() === '***') {
      mwLines.push('----');
      continue;
    }

    // Lists (unordered)
    const uListMatch = line.match(/^(\s*)[\*\-]\s+(.*)$/);
    if (uListMatch) {
      const indent = uListMatch[1].length;
      const depth = Math.floor(indent / 2) + 1;
      const bullet = '*'.repeat(depth);
      mwLines.push(`${bullet} ${uListMatch[2].trim()}`);
      continue;
    }

    // Lists (ordered)
    const oListMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (oListMatch) {
      const indent = oListMatch[1].length;
      const depth = Math.floor(indent / 2) + 1;
      const bullet = '#'.repeat(depth);
      mwLines.push(`${bullet} ${oListMatch[2].trim()}`);
      continue;
    }

    // Inline formatting: bold, italic, code, links
    let processedLine = line;
    // Bold: **text** or __text__ -> '''text'''
    processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, "'''$1'''");
    processedLine = processedLine.replace(/__(.*?)__/g, "'''$1'''");
    // Italic: *text* or _text_ -> ''text''
    processedLine = processedLine.replace(/(?<!\*)\*(?!\*)(.*?)\*/g, "''$1''");
    // Inline code: `code` -> <code>code</code>
    processedLine = processedLine.replace(/`(.*?)`/g, "<code>$1</code>");
    // Links: [text](url) -> [url text]
    processedLine = processedLine.replace(/\[(.*?)\]\((.*?)\)/g, "[$2 $1]");

    mwLines.push(processedLine);
  }

  if (inTable) {
    mwLines.push('|}');
  }

  return mwLines.join('\n');
}

/**
 * Perform a request to the MediaWiki Action API
 */
async function wikiApiRequest(params, postData = null) {
  const headers = {};
  const cookieHeader = getCookieHeader();
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  if (postData) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const response = await axios({
    method: postData ? 'POST' : 'GET',
    url: WIKI_API_URL,
    params: { ...params, format: 'json' },
    data: postData ? new URLSearchParams(postData).toString() : null,
    headers: headers
  });

  updateCookies(response.headers);
  return response.data;
}

/**
 * Main Sync Execution Function
 */
async function runSync() {
  const isDryRun = !WIKI_USER || !WIKI_PASSWORD;
  const docsDir = path.resolve(__dirname, '../docs/manual/inventory-pos');

  console.log('====================================================');
  console.log('MediaWiki Sync Tool - Shufelt Designs Product Manual');
  console.log(`Target: ${WIKI_API_URL}`);
  if (isDryRun) {
    console.log('⚠️  Mode: DRY RUN (No credentials provided in .env.local). Converted markup will be printed locally.');
  } else {
    console.log(`Mode: LIVE SYNC as user [${WIKI_USER}]`);
  }
  console.log('====================================================\n');

  if (!fs.existsSync(docsDir)) {
    console.error(`Error: Local documentation directory not found at: ${docsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();
  if (files.length === 0) {
    console.error('Error: No markdown files found to sync.');
    process.exit(1);
  }

  // Process files first
  const pagesToSync = files.map(file => {
    const id = file.replace('.md', '');
    const cleanTitle = id
      .substring(3)
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const fullTitle = `Inventory POS: ${cleanTitle}`;
    const rawMarkdown = fs.readFileSync(path.join(docsDir, file), 'utf8');
    
    // Convert Markdown to MediaWiki
    let mwContent = markdownToMediaWiki(rawMarkdown);
    
    // Append Category
    mwContent += '\n\n[[Category:Inventory and POS System]]';

    return { title: fullTitle, content: mwContent, filename: file };
  });

  if (isDryRun) {
    // Save dry-run output to temp folder and print summary
    const outputDir = path.resolve(__dirname, '../.temp_wiki_dry_run');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Converting files and saving outputs to .temp_wiki_dry_run/');
    pagesToSync.forEach(page => {
      const outPath = path.join(outputDir, page.filename.replace('.md', '.wiki'));
      fs.writeFileSync(outPath, page.content, 'utf8');
      console.log(`  - Converted [${page.filename}] -> Page title: "${page.title}"`);
    });

    console.log('\n✅ Dry run complete. Converted files successfully.');
    return;
  }

  // Live Sync Procedure
  try {
    console.log('1. Fetching login token...');
    const tokenRes = await wikiApiRequest({
      action: 'query',
      meta: 'tokens',
      type: 'login'
    });

    const loginToken = tokenRes?.query?.tokens?.logintoken;
    if (!loginToken) {
      throw new Error('Could not retrieve login token from MediaWiki API.');
    }
    console.log('   Login token retrieved successfully.');

    console.log(`2. Logging in as ${WIKI_USER}...`);
    const loginRes = await wikiApiRequest({
      action: 'login'
    }, {
      lgname: WIKI_USER,
      lgpassword: WIKI_PASSWORD,
      lgtoken: loginToken
    });

    if (loginRes?.login?.result !== 'Success') {
      throw new Error(`MediaWiki login failed: ${loginRes?.login?.reason || 'Unknown error'}`);
    }
    console.log('   Successfully logged in.');

    console.log('3. Fetching CSRF (edit) token...');
    const csrfRes = await wikiApiRequest({
      action: 'query',
      meta: 'tokens',
      type: 'csrf'
    });

    const csrfToken = csrfRes?.query?.tokens?.csrftoken;
    if (!csrfToken) {
      throw new Error('Could not retrieve CSRF token.');
    }
    console.log('   CSRF token retrieved.');

    console.log('4. Syncing pages...');
    for (const page of pagesToSync) {
      console.log(`   Uploading "${page.title}"...`);
      const editRes = await wikiApiRequest({
        action: 'edit'
      }, {
        title: page.title,
        text: page.content,
        summary: 'Automatic sync of Shufelt Designs Inventory & POS System Manual',
        token: csrfToken,
        bot: true
      });

      if (editRes?.edit?.result === 'Success') {
        console.log(`   ✅ Successfully synced: "${page.title}"`);
      } else {
        console.warn(`   ❌ Failed to sync "${page.title}": ${JSON.stringify(editRes)}`);
      }
    }

    console.log('\n🎉 MediaWiki Sync Complete.');

  } catch (error) {
    console.error('\n❌ Sync failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data));
    }
  }
}

if (require.main === module) {
  runSync();
}

module.exports = { markdownToMediaWiki };
