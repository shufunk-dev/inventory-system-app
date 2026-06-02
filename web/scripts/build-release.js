const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyDirSync(s,d) { fs.cpSync(s, d, {recursive:true, force:true, dereference:true}); }

console.log('1. Building Next.js...');
execSync('npm run build', { stdio: 'inherit' });

console.log('2. Preparing electron/next-server directory...');
const nextServerDir = path.join(__dirname, '..', 'electron', 'next-server');
if (fs.existsSync(nextServerDir)) {
  fs.rmSync(nextServerDir, { recursive: true, force: true });
}
fs.mkdirSync(nextServerDir, { recursive: true });

console.log('3. Copying standalone output...');
copyDirSync(path.join(__dirname, '..', '.next', 'standalone'), nextServerDir);

// Prune unwanted directories traced by Next.js to avoid recursive bloating
const unwantedElectron = path.join(nextServerDir, 'electron');
const unwantedDist = path.join(nextServerDir, 'dist');
if (fs.existsSync(unwantedElectron)) fs.rmSync(unwantedElectron, { recursive: true, force: true });
if (fs.existsSync(unwantedDist)) fs.rmSync(unwantedDist, { recursive: true, force: true });

console.log('4. Copying public and static files...');
copyDirSync(path.join(__dirname, '..', 'public'), path.join(nextServerDir, 'public'));
copyDirSync(path.join(__dirname, '..', '.next', 'static'), path.join(nextServerDir, '.next', 'static'));

console.log('5. Installing and Rebuilding Native Dependencies for Electron...');
process.chdir(path.join(__dirname, '..', 'electron'));
execSync('npm install', { stdio: 'inherit' });
execSync('npx electron-builder install-app-deps', { stdio: 'inherit' });
process.chdir(path.join(__dirname, '..')); // back to web

console.log('6. Fixing Turbopack native module bug with Electron bindings...');
const chunksDir = path.join(nextServerDir, '.next', 'server', 'chunks');
let hashedName = null;

function searchForHash(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      searchForHash(path.join(dir, file.name));
    } else if (file.name.endsWith('.js')) {
      const content = fs.readFileSync(path.join(dir, file.name), 'utf8');
      const match = content.match(/better-sqlite3-[a-f0-9]{16}/);
      if (match) {
        hashedName = match[0];
        return;
      }
    }
  }
}

searchForHash(chunksDir);

if (hashedName) {
  console.log(`Found Turbopack hashed native module requirement: ${hashedName}`);
  const nodeModulesDir = path.join(nextServerDir, 'node_modules');
  const targetModule = path.join(nodeModulesDir, hashedName);
  
  // CRITICAL: We must copy the rebuilt native module from electron's node_modules
  // because that one was rebuilt for Electron's ABI (123) rather than System Node's ABI (137).
  const rebuiltModule = path.join(__dirname, '..', 'electron', 'node_modules', 'better-sqlite3');
  
  if (fs.existsSync(rebuiltModule)) {
    console.log(`Copying REBUILT better-sqlite3 to ${hashedName}...`);
    copyDirSync(rebuiltModule, targetModule);
    copyDirSync(rebuiltModule, path.join(nodeModulesDir, 'better-sqlite3')); // ensure unhashed exists too
  } else {
    throw new Error('Could not find rebuilt better-sqlite3 in electron/node_modules!');
  }
} else {
  console.log('No hashed better-sqlite3 requirement found. Proceeding as normal.');
}

console.log('7. Packaging Electron App and Publishing to GitHub...');
process.chdir(path.join(__dirname, '..', 'electron'));
execSync('npx electron-builder build --win -p always', { stdio: 'inherit' });

console.log('All done! Auto-update release published.');
