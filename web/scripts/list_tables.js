import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.resolve(process.cwd(), 'inventory.db'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

for (const table of tables) {
  try {
    const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`\nTable: ${table.name}`);
    info.forEach(col => {
      console.log(`  Col: ${col.name} (${col.type})`);
    });
  } catch (e) {
    console.log(`Error reading table info for ${table.name}:`, e.message);
  }
}
db.close();
