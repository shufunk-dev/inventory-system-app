const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

try {
  db.prepare("ALTER TABLE items ADD COLUMN itemType TEXT DEFAULT 'standard'").run();
  console.log('Added itemType column to items table.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('itemType column already exists.');
  } else {
    console.error('Error adding itemType column:', err.message);
  }
}

try {
  db.prepare("ALTER TABLE items ADD COLUMN imagePathBack TEXT").run();
  console.log('Added imagePathBack column to items table.');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('imagePathBack column already exists.');
  } else {
    console.error('Error adding imagePathBack column:', err.message);
  }
}
