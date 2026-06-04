import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Calculating Asset Value per Session...\n');

const sessions = db.prepare('SELECT id, countDate FROM physical_counts ORDER BY countDate ASC').all();

sessions.forEach(s => {
  const items = db.prepare(`
    SELECT pci.qtyRaw, lv.cost, lb.name as brandName
    FROM physical_count_items pci
    JOIN liquor_brands lb ON pci.brandId = lb.id
    JOIN liquor_variants lv ON pci.variantId = lv.id
    WHERE pci.countId = ?
  `).all(s.id);
  
  let totalValue = 0;
  let totalItemsCounted = items.length;
  
  items.forEach(item => {
    totalValue += (item.qtyRaw * item.cost);
  });
  
  console.log(`Session Date: ${s.countDate}`);
  console.log(`  Items Counted: ${totalItemsCounted}`);
  console.log(`  Total Asset Value (On-Hand): $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`--------------------------------------------------`);
});

db.close();
