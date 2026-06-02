const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const devDbPath = 'inventory.db';
const appDataDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-system-app', 'inventory.db');

const fixChanges = JSON.stringify([
  { type: 'web', text: 'Successfully converted the web application into a fully standalone native Windows Desktop App with an integrated OTA (Over-The-Air) automatic updater!' },
  { type: 'web', text: 'Store owners no longer need to install Node.js or run command prompts. The new System Update Panel inside the Admin Dashboard allows seamless background updates with zero downtime.' },
  { type: 'web', text: 'Integrated Numista API for hyper-accurate numismatic coin identification.' },
  { type: 'web', text: 'Integrated SerpApi Google Lens for highly accurate premium visual matches.' },
  { type: 'mobile', text: 'Added Coin Mode and Toy Mode for specialized capture logic.' },
  { type: 'web', text: 'Added a global sticky navigation header with version tracking.' }
]);

try {
  const dbDev = new Database(devDbPath);
  dbDev.prepare('UPDATE changelogs SET changes = ? WHERE version = ?').run(fixChanges, '1.4.0');
  console.log("Fixed dev DB");
} catch(e) {}

try {
  const dbProd = new Database(appDataDbPath);
  dbProd.prepare('UPDATE changelogs SET changes = ? WHERE version = ?').run(fixChanges, '1.4.0');
  console.log("Fixed prod DB");
} catch(e) {}
