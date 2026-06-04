import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Querying numeric brand names:');
const rows = db.prepare(`
  SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lv.cost
  FROM physical_count_items pci
  JOIN liquor_brands lb ON pci.brandId = lb.id
  JOIN liquor_variants lv ON pci.variantId = lv.id
  WHERE lb.name GLOB '[0-9]*'
  ORDER BY lb.name ASC
  LIMIT 50
`).all();

rows.forEach(r => {
  console.log(`Brand: "${r.brandName}" | QtyRaw: ${r.qtyRaw} | Oz: ${r.qtyCalculatedOz} | Cost: $${r.cost}`);
});

db.close();
