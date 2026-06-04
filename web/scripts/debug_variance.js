import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

const countSessions = db.prepare('SELECT id, countDate FROM physical_counts ORDER BY countDate ASC').all();
if (countSessions.length < 2) {
  console.log('Not enough sessions');
  process.exit(1);
}

const startCountId = countSessions[0].id;
const endCountId = countSessions[countSessions.length - 1].id;

console.log(`Auditing from Starting Count (${countSessions[0].countDate}) to Ending Count (${countSessions[countSessions.length - 1].countDate})`);

// Load items for starting count
const startingItems = db.prepare(`
  SELECT pci.brandId, b.name as brandName, b.category as brandCategory, pci.qtyCalculatedOz, pci.qtyRaw
  FROM physical_count_items pci
  JOIN liquor_brands b ON pci.brandId = b.id
  WHERE pci.countId = ?
`).all(startCountId);

// Load items for ending count
const endingItems = db.prepare(`
  SELECT pci.brandId, pci.qtyCalculatedOz, pci.qtyRaw
  FROM physical_count_items pci
  WHERE pci.countId = ?
`).all(endCountId);

const startingMap = new Map();
startingItems.forEach(item => {
  startingMap.set(item.brandId, {
    qtyOz: item.qtyCalculatedOz,
    qtyRaw: item.qtyRaw,
    brandName: item.brandName,
    brandCategory: item.brandCategory
  });
});

const endingMap = new Map();
endingItems.forEach(item => {
  endingMap.set(item.brandId, {
    qtyOz: item.qtyCalculatedOz,
    qtyRaw: item.qtyRaw
  });
});

const costMap = new Map();
const variants = db.prepare(`
  SELECT lv.brandId, lv.sizeMl, lv.cost
  FROM liquor_variants lv
  JOIN liquor_brands lb ON lv.brandId = lb.id
`).all();

variants.forEach(v => {
  if (v.cost > 0 && v.sizeMl > 0) {
    const oz = v.sizeMl / 29.5735;
    const costPerOz = v.cost / oz;
    costMap.set(v.brandId, costPerOz);
  }
});

const allBrandIds = new Set([...startingMap.keys(), ...endingMap.keys()]);

const auditList = [];
let totalLoss = 0;
let totalOz = 0;

allBrandIds.forEach(brandId => {
  const start = startingMap.get(brandId) || { qtyOz: 0, qtyRaw: 0 };
  const end = endingMap.get(brandId) || { qtyOz: 0, qtyRaw: 0 };
  
  let brandName = start.brandName;
  let brandCategory = start.brandCategory;
  if (!brandName) {
    const bRow = db.prepare('SELECT name, category FROM liquor_brands WHERE id = ?').get(brandId);
    if (bRow) {
      brandName = bRow.name;
      brandCategory = bRow.category;
    }
  }

  const physicalDepletionOz = Math.max(0, start.qtyOz - end.qtyOz);
  const costPerOz = costMap.get(brandId) || 0;
  const varianceCost = physicalDepletionOz * costPerOz;
  
  totalLoss += varianceCost;
  totalOz += physicalDepletionOz;

  if (physicalDepletionOz > 0 || varianceCost > 0) {
    auditList.push({
      brandName,
      startingOz: start.qtyOz,
      endingOz: end.qtyOz,
      depletionOz: physicalDepletionOz,
      costPerOz,
      varianceCost
    });
  }
});

auditList.sort((a, b) => b.varianceCost - a.varianceCost);

console.log('\n--- Brands sorted by variance cost (financial loss) ---');
auditList.slice(0, 15).forEach(item => {
  console.log(`Brand: "${item.brandName}" | Depletion: ${item.depletionOz.toFixed(2)} oz | Cost/Oz: $${item.costPerOz.toFixed(2)} | Variance Cost: $${item.varianceCost.toFixed(2)}`);
});

console.log(`\nGrand Total Depletion: ${totalOz.toFixed(2)} oz`);
console.log(`Grand Total Variance Cost: $${totalLoss.toFixed(2)}`);

db.close();
