import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
console.log('Connecting to database at:', dbPath);

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

    // 4. Delete recipe ingredients and recipe mappings
    const riResult = db.prepare('DELETE FROM recipe_ingredients').run();
    const rResult = db.prepare('DELETE FROM recipes').run();
    console.log(`Cleared ${riResult.changes} recipe ingredients and ${rResult.changes} recipe mappings.`);

    // 5. Delete variants and brands
    const lvResult = db.prepare('DELETE FROM liquor_variants').run();
    const lbResult = db.prepare('DELETE FROM liquor_brands').run();
    console.log(`Cleared ${lvResult.changes} liquor variants and ${lbResult.changes} liquor brands.`);
  })();
  console.log('✅ Database fully reset for a fresh simulation test!');
} catch (err) {
  console.error('Error resetting database:', err);
} finally {
  db.close();
}
