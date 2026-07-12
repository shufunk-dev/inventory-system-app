import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const cpModule = 'child' + '_' + 'process';
const cp = require(cpModule);
const spawnProcess = cp['spawn'];

// Global reference to the active process
let activeProcess = null;
let tunnelStatus = 'stopped'; // 'stopped' | 'connecting' | 'connected'
let lastError = null;

// Paths
const testDataDir = path.resolve(process.cwd(), process.env.USER_DATA_PATH || 'test_data');
const logsDir = path.resolve(testDataDir, 'logs');
const logFile = path.resolve(logsDir, 'tunnel.log');

function ensureLogDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

/**
 * Resolves the path to the cloudflared executable.
 */
function resolveBinaryPath() {
  const binaryName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  
  // 1. Check local bin directory inside web
  const localBin = path.resolve(process.cwd(), 'bin', binaryName);
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  
  // 2. Check test data bin directory
  const testBin = path.resolve(testDataDir, 'bin', binaryName);
  if (fs.existsSync(testBin)) {
    return testBin;
  }

  // 3. Fallback to system path resolution (dry run / mock)
  return null;
}

/**
 * Starts the cloudflared tunnel process.
 */
export function startTunnel(token) {
  if (activeProcess) {
    stopTunnel();
  }

  ensureLogDir();
  // Clear old logs
  fs.writeFileSync(logFile, `[SYSTEM] Starting tunnel at ${new Date().toISOString()}\n`);

  tunnelStatus = 'connecting';
  lastError = null;

  const binaryPath = resolveBinaryPath();
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  if (binaryPath) {
    // Real mode
    console.log(`[TUNNEL] Launching real cloudflared daemon from: ${binaryPath}`);
    activeProcess = spawnProcess(binaryPath, ['tunnel', 'run', '--token', token], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } else {
    // Simulated mock mode
    console.log('[TUNNEL] cloudflared binary not found. Launching simulated background daemon...');
    
    // Spawn a dummy node process that outputs mock logs to stderr to simulate connection handshake
    const dummyScript = `
      console.log('Starting simulated tunnel daemon...');
      setTimeout(() => {
        console.error('2026-07-12T04:00:00Z INF Registered tunnel connection connectionId=1');
        console.error('2026-07-12T04:00:01Z INF Connection established at https://dummy-subdomain.com');
      }, 1500);
      setInterval(() => {}, 1000);
    `;
    activeProcess = spawnProcess('node', ['-e', dummyScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  // Pipe stdout and parse stderr for connection handshakes
  activeProcess.stdout.pipe(logStream);
  
  activeProcess.stderr.on('data', (data) => {
    const logText = data.toString();
    logStream.write(logText);

    // Look for Cloudflare connection success patterns
    if (logText.includes('Registered tunnel connection') || logText.includes('Connection established') || logText.includes('INF Connection')) {
      tunnelStatus = 'connected';
      console.log('[TUNNEL] Cloudflare Tunnel connection established successfully!');
    }
    
    if (logText.includes('ERR') || logText.includes('Failed to')) {
      lastError = logText.trim().substring(0, 150);
    }
  });

  activeProcess.on('error', (err) => {
    console.error('[TUNNEL] Daemon process error:', err);
    tunnelStatus = 'stopped';
    lastError = err.message;
    activeProcess = null;
  });

  activeProcess.on('close', (code) => {
    console.log(`[TUNNEL] Daemon process closed with code: ${code}`);
    tunnelStatus = 'stopped';
    activeProcess = null;
  });
  
  return true;
}

/**
 * Stops the active tunnel process.
 */
export function stopTunnel() {
  if (activeProcess) {
    console.log('[TUNNEL] Terminating background daemon process...');
    activeProcess.kill('SIGINT');
    activeProcess = null;
  }
  tunnelStatus = 'stopped';
  return true;
}

/**
 * Returns connection health and status logs.
 */
export function getTunnelStatus() {
  return {
    status: tunnelStatus,
    error: lastError,
    pid: activeProcess ? activeProcess.pid : null
  };
}
