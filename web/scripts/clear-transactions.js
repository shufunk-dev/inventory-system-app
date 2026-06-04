const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function run() {
  const dataPath = process.env.USER_DATA_PATH || path.resolve(__dirname, '../');
  const dbPath = path.resolve(dataPath, 'inventory.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    return;
  }

  console.log(`Opening database to clear transactions: ${dbPath}`);
  const db = new Database(dbPath);

  try {
    db.transaction(() => {
      // 1. Delete physical count items
      const pciResult = db.prepare('DELETE FROM physical_count_items').run();
      console.log(`Cleared ${pciResult.changes} physical count items.`);

      // 2. Delete physical count sessions
      const pcResult = db.prepare('DELETE FROM physical_counts').run();
      console.log(`Cleared ${pcResult.changes} physical count sessions.`);

      // 3. Delete POS items (sales logs)
      const posResult = db.prepare('DELETE FROM pos_items').run();
      console.log(`Cleared ${posResult.changes} POS sales log items.`);

      // 4. Delete recipes and recipe ingredients
      const riResult = db.prepare('DELETE FROM recipe_ingredients').run();
      const rResult = db.prepare('DELETE FROM recipes').run();
      console.log(`Cleared ${riResult.changes} recipe ingredients and ${rResult.changes} recipe mappings.`);
    })();
    console.log('✅ Database transaction and recipe tables cleared successfully!');
  } catch (err) {
    console.error('Error clearing transaction tables:', err);
  } finally {
    db.close();
  }
}

run();
