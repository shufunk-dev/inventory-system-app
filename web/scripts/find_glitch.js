import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Searching for brands with "$" or numeric values in name:');
const rows = db.prepare(`
  SELECT lb.name as brandName, lb.category, lv.cost, pci.qtyRaw, pci.qtyCalculatedOz, pc.countDate
  FROM physical_count_items pci
  JOIN liquor_brands lb ON pci.brandId = lb.id
  JOIN liquor_variants lv ON pci.variantId = lv.id
  JOIN physical_counts pc ON pci.countId = pc.id
  WHERE lb.name LIKE '%$%' OR lb.name GLOB '*[0-9]*'
  ORDER BY lb.name ASC
`).all();

rows.forEach(r => {
  console.log(`Date: ${r.countDate} | Brand: "${r.brandName}" | Category: ${r.category} | QtyRaw: ${r.qtyRaw} | Calculated Oz: ${r.qtyCalculatedOz} | Unit Cost: $${r.cost}`);
});

db.close();
