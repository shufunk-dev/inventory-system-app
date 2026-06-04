import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Database path:', dbPath);

const sessions = db.prepare('SELECT id, countDate FROM physical_counts ORDER BY countDate ASC').all();

for (const session of sessions) {
  console.log(`\n======================================================`);
  console.log(`SESSION DATE: ${session.countDate} | ID: ${session.id}`);
  console.log(`======================================================`);
  
  const items = db.prepare(`
    SELECT pci.qtyRaw, pci.qtyCalculatedOz, lb.name as brandName, lb.category, lv.cost
    FROM physical_count_items pci
    JOIN liquor_brands lb ON pci.brandId = lb.id
    JOIN liquor_variants lv ON pci.variantId = lv.id
    WHERE pci.countId = ?
    ORDER BY lb.name ASC
  `).all(session.id);
  
  let sessionOz = 0;
  let sessionValue = 0;
  
  items.forEach(r => {
    sessionOz += r.qtyCalculatedOz;
    sessionValue += r.qtyRaw * r.cost;
    console.log(`  Brand: "${r.brandName}" | Qty: ${r.qtyRaw} | Oz: ${r.qtyCalculatedOz} | Cost/Unit: $${r.cost} | Total Value: $${(r.qtyRaw * r.cost).toFixed(2)}`);
  });
  
  console.log(`------------------------------------------------------`);
  console.log(`TOTAL OZ FOR SESSION: ${sessionOz.toFixed(2)} oz`);
  console.log(`TOTAL VALUE FOR SESSION: $${sessionValue.toFixed(2)}`);
}

db.close();
