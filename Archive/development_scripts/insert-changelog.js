const Database = require('better-sqlite3');
const db = new Database('web/inventory.db');

db.prepare(`
  INSERT INTO changelogs (version, title, content, type, status, publishedAt) 
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`).run(
  '1.4.0', 
  'Desktop Autoupdater Integration', 
  'Successfully converted the web application into a fully standalone native Windows Desktop App with an integrated OTA (Over-The-Air) automatic updater! Store owners no longer need to install Node.js or run command prompts. The new System Update Panel inside the Admin Dashboard allows seamless background updates with zero downtime.', 
  'feature', 
  'published'
);

console.log("Changelog inserted.");
