import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('--- ALL BRANDS CURRENTLY IN DB ---');
const brands = db.prepare(`
  SELECT lb.id, lb.name, lb.category, lv.cost, lv.sizeMl
  FROM liquor_brands lb
  LEFT JOIN liquor_variants lv ON lb.id = lv.brandId
`).all();

brands.forEach(b => {
  console.log(`Brand Name: "${b.name}" | Category: ${b.category} | Cost: $${b.cost} | Size: ${b.sizeMl}ml`);
});

console.log('\n--- PHYSICAL COUNT ITEMS WITH DETAIL ---');
const items = db.prepare(`
  SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lb.category, lv.cost, pc.countDate
  FROM physical_count_items pci
  JOIN liquor_brands lb ON pci.brandId = lb.id
  JOIN liquor_variants lv ON pci.variantId = lv.id
  JOIN physical_counts pc ON pci.countId = pc.id
  ORDER BY pc.countDate ASC, lb.name ASC
`).all();

items.forEach(item => {
  console.log(`Date: ${item.countDate} | Brand: "${item.brandName}" | QtyRaw: ${item.qtyRaw} | Calculated Oz: ${item.qtyCalculatedOz} | Cost: $${item.cost}`);
});

db.close();
