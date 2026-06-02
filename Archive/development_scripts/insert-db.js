const Database = require('better-sqlite3');
const db = new Database('inventory.db');

// Insert Changelog
db.prepare(`
  INSERT INTO changelogs (id, version, date, title, changes, createdAt) 
  VALUES (?, ?, ?, ?, ?, strftime('%s','now') * 1000)
`).run(
  require('crypto').randomUUID(),
  '1.4.0', 
  new Date().toISOString().split('T')[0],
  'Desktop Autoupdater Integration', 
  JSON.stringify([
    "Successfully converted the web application into a fully standalone native Windows Desktop App with an integrated OTA (Over-The-Air) automatic updater!",
    "Store owners no longer need to install Node.js or run command prompts. The new System Update Panel inside the Admin Dashboard allows seamless background updates with zero downtime."
  ])
);
console.log("Changelog inserted.");
