import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

const session = db.prepare("SELECT id FROM physical_counts WHERE countDate = '2019-01-01'").get();
if (!session) {
  console.log('Session not found');
  process.exit(1);
}

const items = db.prepare(`
  SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lb.category, lv.cost
  FROM physical_count_items pci
  JOIN liquor_brands lb ON pci.brandId = lb.id
  JOIN liquor_variants lv ON pci.variantId = lv.id
  WHERE pci.countId = ?
  ORDER BY lb.name ASC
`).all(session.id);

fs.writeFileSync('session_2019_01_01_items.json', JSON.stringify(items, null, 2));
console.log(`Saved ${items.length} items to session_2019_01_01_items.json`);
db.close();
