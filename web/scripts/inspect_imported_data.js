import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
console.log('Connecting to database at:', dbPath);

const db = new Database(dbPath);

console.log('\n--- Count Sessions ---');
try {
  const sessions = db.prepare('SELECT id, countDate, status FROM physical_counts ORDER BY countDate ASC').all();
  sessions.forEach(s => {
    console.log(`Session ID: ${s.id}, Date: ${s.countDate}, Status: ${s.status}`);
  });
} catch (e) {
  console.log('Error reading physical_counts:', e.message);
}

console.log('\n--- Brands and Variants Sample ---');
try {
  const brands = db.prepare(`
    SELECT lb.id as brandId, lb.name, lb.category, lv.sizeMl, lv.cost, lv.emptyWeightGrams, lv.fullWeightGrams
    FROM liquor_brands lb
    LEFT JOIN liquor_variants lv ON lb.id = lv.brandId
    LIMIT 20
  `).all();
  
  brands.forEach(b => {
    console.log(`Brand: "${b.name}" (${b.category}), Size: ${b.sizeMl}ml, Cost: $${b.cost}, emptyG: ${b.emptyWeightGrams}, fullG: ${b.fullWeightGrams}`);
  });
} catch (e) {
  console.log('Error reading brands/variants:', e.message);
}

console.log('\n--- Top 10 Most Expensive Variants (by calculated cost per oz) ---');
try {
  const variants = db.prepare(`
    SELECT lb.name, lv.sizeMl, lv.cost
    FROM liquor_variants lv
    JOIN liquor_brands lb ON lv.brandId = lb.id
    ORDER BY (lv.cost / (lv.sizeMl / 29.5735)) DESC
    LIMIT 10
  `).all();
  variants.forEach(v => {
    const oz = v.sizeMl / 29.5735;
    const costPerOz = v.cost / oz;
    console.log(`Brand: "${v.name}", Size: ${v.sizeMl}ml, Cost: $${v.cost} (approx $${costPerOz.toFixed(2)}/oz)`);
  });
} catch (e) {
  console.log('Error sorting variants:', e.message);
}

console.log('\n--- Count Items Summary (c_start vs c_end) ---');
try {
  const countItems = db.prepare(`
    SELECT countId, COUNT(*) as count, SUM(qtyRaw) as totalQty, SUM(qtyCalculatedOz) as totalOz
    FROM physical_count_items
    GROUP BY countId
  `).all();
  countItems.forEach(ci => {
    console.log(`Session ID: ${ci.countId}, Items counted: ${ci.count}, Raw Qty: ${ci.totalQty}, Total Oz: ${ci.totalOz}`);
  });
} catch (e) {
  console.log('Error reading count items:', e.message);
}

db.close();
