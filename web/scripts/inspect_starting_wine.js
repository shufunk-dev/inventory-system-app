import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Starting count items for Caymus, Opus, Ornellaia, and Silver Oak:');
const rows = db.prepare(`
  SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lv.cost
  FROM physical_count_items pci
  JOIN liquor_brands lb ON pci.brandId = lb.id
  JOIN liquor_variants lv ON pci.variantId = lv.id
  WHERE pci.countId = 'e593980a-aae6-4305-b262-34fcb7d2e63a'
    AND (lb.name LIKE '%Caymus%' OR lb.name LIKE '%Opus%' OR lb.name LIKE '%Ornellaia%' OR lb.name LIKE '%Silver%')
`).all();

rows.forEach(r => {
  console.log(`Brand: "${r.brandName}" | Qty: ${r.qtyRaw} | Oz: ${r.qtyCalculatedOz} | Cost: $${r.cost}`);
});

db.close();
