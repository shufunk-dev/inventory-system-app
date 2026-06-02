const path = require('path');
const os = require('os');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const appDataDbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-system-app', 'inventory.db');
const db = new Database(appDataDbPath);

const seedData = [
  {
    version: '1.4.0', date: 'June 1, 2026', title: 'Desktop Autoupdater Integration',
    changes: JSON.stringify([
      "Successfully converted the web application into a fully standalone native Windows Desktop App with an integrated OTA (Over-The-Air) automatic updater!",
      "Store owners no longer need to install Node.js or run command prompts. The new System Update Panel inside the Admin Dashboard allows seamless background updates with zero downtime."
    ])
  },
  {
    version: 'Beta 1.3', date: 'May 30, 2026', title: 'Admin Tools & Security Enhancements',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented User Management and Subscription Tier editing in the Admin Dashboard.' },
      { type: 'web', text: 'Secured critical APIs and routes to prevent non-admins from making system changes.' },
      { type: 'web', text: 'Separated active tier from subscription role, allowing Premium users to toggle engines freely.' }
    ])
  },
  {
    version: 'Pre-Beta version 0.017', date: 'May 28, 2026', title: 'Specialized Capture & Premium AI Integrations',
    changes: JSON.stringify([
      { type: 'mobile', text: 'Added Coin Mode and Toy Mode for specialized capture logic.' },
      { type: 'web', text: 'Integrated Numista API for hyper-accurate numismatic coin identification.' },
      { type: 'web', text: 'Integrated SerpApi Google Lens for highly accurate premium visual matches.' }
    ])
  },
  {
    version: 'Pre-Beta version 0.014', date: 'May 27, 2026', title: 'The Beta Polish & Organization',
    changes: JSON.stringify([
      { type: 'mobile', text: 'Added visual scan verification with "Accept" and "Discard" controls.' },
      { type: 'web', text: 'Implemented an infinite-depth Subcategory system.' },
      { type: 'web', text: 'Built Advanced Search capabilities and category filtering.' },
      { type: 'web', text: 'Upgraded the Google Vision integration to scrape text and logos directly from box art.' },
      { type: 'web', text: 'Added a global sticky navigation header with version tracking.' }
    ])
  },
  {
    version: 'Alpha version 0.009', date: 'May 26, 2026', title: 'AI Integrations & Rate Limits',
    changes: JSON.stringify([
      { type: 'web', text: 'Integrated the UPCItemDB API for automated metadata lookups.' },
      { type: 'web', text: 'Built a failover pipeline utilizing Google Cloud Vision API for fallback image analysis.' },
      { type: 'web', text: 'Implemented smart retry queues to handle API rate limiting smoothly.' }
    ])
  },
  {
    version: 'Alpha version 0.006', date: 'May 25, 2026', title: 'Details & Async Processing',
    changes: JSON.stringify([
      { type: 'web', text: 'Built the dedicated Item Details page with barcode generation.' },
      { type: 'web', text: 'Migrated API requests to a background worker script to prevent server timeouts.' },
      { type: 'mobile', text: 'Added the Export Screen with ZIP generation for transferring scans to the dashboard.' }
    ])
  },
  {
    version: 'Alpha version 0.003', date: 'May 24, 2026', title: 'The Foundation',
    changes: JSON.stringify([
      { type: 'mobile', text: 'Created the React Native scanner app with queue functionality.' },
      { type: 'web', text: 'Initialized the Next.js dashboard and SQLite database structure.' },
      { type: 'web', text: 'Implemented the ZIP upload parser for syncing mobile scans to the server.' }
    ])
  }
];

const insertStmt = db.prepare('INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)');

seedData.reverse().forEach((item, index) => {
  // Check if it already exists
  const existing = db.prepare('SELECT id FROM changelogs WHERE version = ?').get(item.version);
  if (!existing) {
    insertStmt.run(crypto.randomUUID(), item.version, item.date, item.title, item.changes, Date.now() + index * 1000);
    console.log("Inserted:", item.version);
  } else {
    // Update it if it exists just in case
    db.prepare('UPDATE changelogs SET date = ?, title = ?, changes = ? WHERE version = ?').run(
      item.date, item.title, item.changes, item.version
    );
    console.log("Updated:", item.version);
  }
});
