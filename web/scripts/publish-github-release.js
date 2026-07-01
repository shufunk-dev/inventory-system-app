const fs = require('fs');
const path = require('path');

const tokenPath = path.resolve(__dirname, '../../github info.txt');
if (!fs.existsSync(tokenPath)) {
  console.error("❌ github info.txt not found in project root.");
  process.exit(1);
}
const token = fs.readFileSync(tokenPath, 'utf8').replace('Token - ', '').trim();
const repoOwner = "shufunk-dev";
const repoName = "inventory-system-app";
const version = "1.8.9";
const tag = `v${version}`;

const exePath = path.resolve(__dirname, '../electron/dist/Inventory System Setup 1.8.9.exe');

async function publish() {
  if (!fs.existsSync(exePath)) {
    console.error(`❌ Executable not found at path: ${exePath}`);
    process.exit(1);
  }

  console.log(`🚀 Starting GitHub Release process for ${tag}...`);

  try {
    // 1. Create a release
    console.log(`Creating release '${tag}'...`);
    const createReleaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Antigravity-Release-Script'
      },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: 'master',
        name: tag,
        body: `### Release v${version}\n\n**TMDB Removal & Commercial-Safe Metadata Resolution**\n\n- Purged TMDB API integration to guarantee compliance for commercial distribution.\n- Transitioned movie metadata fetching to Wikipedia API (CC-BY-SA, free and keyless).\n- Integrated organic YouTube search scraping for video/movie trailer links.\n- Cleaned up global settings routing and React UI configurations.\n- Added dedicated unit testing suite.`,
        draft: false,
        prerelease: false
      })
    });

    if (!createReleaseRes.ok) {
      const errText = await createReleaseRes.text();
      throw new Error(`Failed to create release: ${createReleaseRes.status} ${errText}`);
    }

    const release = await createReleaseRes.json();
    const releaseId = release.id;
    const uploadUrl = release.upload_url.split('{')[0]; // Extract base upload URL
    console.log(`✅ Release created successfully (ID: ${releaseId})`);

    // 2. Upload the EXE asset
    console.log(`Uploading installer asset: 'Inventory System Setup ${version}.exe'...`);
    const fileStats = fs.statSync(exePath);
    const fileStream = fs.readFileSync(exePath);

    const uploadRes = await fetch(`${uploadUrl}?name=Inventory_System_Setup_${version}.exe`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileStats.size,
        'User-Agent': 'Antigravity-Release-Script'
      },
      body: fileStream
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to upload asset: ${uploadRes.status} ${errText}`);
    }

    const asset = await uploadRes.json();
    console.log(`✅ Asset uploaded successfully!`);
    console.log(`🔗 Release URL: ${release.html_url}`);
  } catch (err) {
    console.error(`❌ Error publishing release: ${err.message}`);
    process.exit(1);
  }
}

publish();
