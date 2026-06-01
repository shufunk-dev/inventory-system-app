const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

try {
  // Try adding the column if it doesn't exist
  db.prepare('ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0').run();
  console.log('Added isAdmin column to users table.');
} catch (err) {
  // Ignore if column already exists
  if (err.message.includes('duplicate column name')) {
    console.log('isAdmin column already exists.');
  } else {
    console.error('Error adding column:', err.message);
  }
}

// Make the first user an admin
const user = db.prepare('SELECT id FROM users ORDER BY rowid ASC LIMIT 1').get();
if (user) {
  const info = db.prepare('UPDATE users SET isAdmin = 1 WHERE id = ?').run(user.id);
  console.log(`Granted Admin rights to user ${user.id} (${info.changes} rows updated)`);
} else {
  console.log('No users found.');
}
