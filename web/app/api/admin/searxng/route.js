import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { getGlobalDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import axios from 'axios';

const execPromise = util.promisify(exec);

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const platform = process.platform; // 'win32', 'darwin', 'linux'
  let dockerInstalled = false;
  let containerStatus = 'not_created'; // 'running', 'stopped', 'not_created', 'docker_missing'
  let endpointActive = false;

  // 1. Resolve configured SearXNG URL from database
  let searxngUrl = 'http://localhost:8080';
  try {
    const db = await getGlobalDb();
    const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
    if (existingRow && existingRow.value) {
      const keys = JSON.parse(existingRow.value);
      if (keys.searxngUrl) {
        searxngUrl = keys.searxngUrl;
      }
    }
  } catch (e) {
    // Ignore
  }

  // 2. Check if endpoint is active (anywhere on the network)
  try {
    const testUrl = `${searxngUrl.replace(/\/$/, '')}/search?q=ping&format=json`;
    const res = await axios.get(testUrl, { timeout: 2000 });
    if (res.status === 200) {
      endpointActive = true;
    }
  } catch (e) {
    // Ignore
  }

  // 3. Check if docker is installed locally
  try {
    await execPromise('docker --version');
    dockerInstalled = true;

    // 4. Check local container status
    const { stdout } = await execPromise('docker ps -a --filter name=searxng --format "{{.Status}}"');
    if (stdout.trim()) {
      if (stdout.toLowerCase().includes('up')) {
        containerStatus = 'running';
      } else {
        containerStatus = 'stopped';
      }
    }
  } catch (e) {
    dockerInstalled = false;
    containerStatus = 'docker_missing';
  }

  return NextResponse.json({
    platform,
    dockerInstalled,
    containerStatus,
    endpointActive
  });
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action } = await request.json();
    
    // 1. Check if docker is installed
    try {
      await execPromise('docker --version');
    } catch (e) {
      return NextResponse.json({ error: 'Docker is not installed or not in system PATH.' }, { status: 400 });
    }

    if (action === 'start') {
      // Start existing container
      await execPromise('docker start searxng');
      return NextResponse.json({ success: true, message: 'SearXNG container started.' });
    }

    if (action === 'install') {
      // 1. Check if container already exists
      let exists = false;
      try {
        const { stdout } = await execPromise('docker ps -a --filter name=searxng --format "{{.Names}}"');
        if (stdout.trim().includes('searxng')) {
          exists = true;
        }
      } catch (e) {}

      if (exists) {
        // Just start it
        await execPromise('docker start searxng');
        return NextResponse.json({ success: true, message: 'SearXNG container already exists; started it.' });
      }

      // 2. Create the config directory and write settings.yml
      const webDir = path.resolve(process.cwd());
      const searxngDir = path.join(webDir, 'searxng');
      if (!fs.existsSync(searxngDir)) {
        fs.mkdirSync(searxngDir, { recursive: true });
      }

      const settingsYamlPath = path.join(searxngDir, 'settings.yml');
      const settingsContent = `
# SearXNG settings configuration
use_default_settings: true

server:
  port: 8080
  bind_address: "0.0.0.0"
  secret_key: "inventorysystemsearxngsecretkey"

search:
  safe_search: 0
  request_timeout: 4.0
  formats:
    - html
    - json

outgoing:
  request_timeout: 3.0
  max_request_timeout: 5.0
  pool_connections: 100
  pool_maxsize: 100

engines:
  - name: google
    timeout: 3.0
    disabled: false
  - name: bing
    timeout: 3.0
    disabled: false
  - name: qwant
    timeout: 3.0
    disabled: false
  - name: startpage
    timeout: 3.0
    disabled: false
  - name: duckduckgo
    timeout: 3.0
    disabled: true
  - name: yahoo
    timeout: 3.0
    disabled: true
`;
      fs.writeFileSync(settingsYamlPath, settingsContent.trim());

      // 3. Run the docker container
      const hostConfigPath = searxngDir.replace(/\\/g, '/');
      const cmd = `docker run -d --name searxng -p 8080:8080 -v "${hostConfigPath}:/etc/searxng:ro" -e SEARXNG_SETTINGS_PATH=/etc/searxng/settings.yml --restart always searxng/searxng:latest`;
      
      await execPromise(cmd);

      // 4. Update the searxngUrl in database settings automatically!
      const db = await getGlobalDb();
      const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
      let apiKeys = {};
      if (existingRow && existingRow.value) {
        try {
          apiKeys = JSON.parse(existingRow.value);
        } catch (e) {}
      }
      apiKeys.searxngUrl = 'http://localhost:8080';
      db.prepare("INSERT INTO system_settings (key, value) VALUES ('api_keys', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(apiKeys));

      return NextResponse.json({ success: true, message: 'SearXNG installed and started successfully. Settings updated.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('SearXNG installation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to install SearXNG.' }, { status: 500 });
  }
}
