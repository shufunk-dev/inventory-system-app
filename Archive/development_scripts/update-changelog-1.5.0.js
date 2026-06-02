const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const devDbPath = 'inventory.db';
const appDataDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-system-app', 'inventory.db');

const newItem = {
  version: '1.5.0', 
  date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 
  title: 'Single Instance Optimization',
  changes: JSON.stringify([
    { type: 'web', text: 'Implemented a Single Instance Lock to prevent multiple copies of the desktop app from running simultaneously in the background.' },
    { type: 'web', text: 'Clicking the app shortcut while the server is already running in the system tray will now instantly focus and restore the existing window instead of launching a duplicate server process.' }
  ])
};

function upsert(dbPath) {
  try {
    const db = new Database(dbPath);
    const existing = db.prepare('SELECT id FROM changelogs WHERE version = ?').get(newItem.version);
    if (!existing) {
      db.prepare('INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(), newItem.version, newItem.date, newItem.title, newItem.changes, Date.now()
      );
    } else {
      db.prepare('UPDATE changelogs SET date = ?, title = ?, changes = ? WHERE version = ?').run(
        newItem.date, newItem.title, newItem.changes, newItem.version
      );
    }
    console.log("Updated DB:", dbPath);
  } catch(e) {
    console.error("Error on", dbPath, e.message);
  }
}

upsert(devDbPath);
upsert(appDataDbPath);
