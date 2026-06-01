const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

// Find the first registered user
const user = db.prepare('SELECT id FROM users LIMIT 1').get();

if (user) {
  // Assign all orphaned items and categories to this user
  const infoItems = db.prepare('UPDATE items SET userId = ? WHERE userId IS NULL').run(user.id);
  const infoCats = db.prepare('UPDATE categories SET userId = ? WHERE userId IS NULL').run(user.id);
  console.log(`Migrated ${infoItems.changes} items and ${infoCats.changes} categories to user ${user.id}`);
} else {
  console.log('No user found to migrate data to.');
}
