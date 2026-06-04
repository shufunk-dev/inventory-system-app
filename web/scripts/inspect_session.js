import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('\n--- Session items for 2019-01-01 ---');
try {
  const rows = db.prepare(`
    SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lb.category, lv.cost
    FROM physical_count_items pci
    JOIN liquor_brands lb ON pci.brandId = lb.id
    JOIN liquor_variants lv ON pci.variantId = lv.id
    WHERE pci.countId = 'e593980a-aae6-4305-b262-34fcb7d2e63a'
  `).all();
  rows.forEach(r => {
    console.log(`Brand: "${r.brandName}" (${r.category}), QtyRaw: ${r.qtyRaw}, Oz: ${r.qtyCalculatedOz}, VariantCost: $${r.cost}`);
  });
} catch (e) {
  console.log('Error:', e.message);
}

db.close();
