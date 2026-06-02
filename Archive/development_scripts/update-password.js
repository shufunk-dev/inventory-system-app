const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const devDbPath = 'inventory.db';
const appDataDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-system-app', 'inventory.db');

const rootEmail = Buffer.from('c2h1ZnVua0BnbWFpbC5jb20=', 'base64').toString('utf8');
const rootPass = '$2b$10$HJJky4UEDgkvbjKv/o.mu.7YiWdyHCeYcvyhgnMZMJty2WX5UMAfy';

function updatePassword(dbPath) {
  try {
    const db = new Database(dbPath);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(rootEmail);
    if (existing) {
      db.prepare('UPDATE users SET passwordHash = ? WHERE email = ?').run(rootPass, rootEmail);
      console.log("Updated password in:", dbPath);
    }
  } catch(e) {
    console.error("Error updating", dbPath, e.message);
  }
}

updatePassword(devDbPath);
updatePassword(appDataDbPath);
