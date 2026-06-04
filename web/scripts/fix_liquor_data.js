import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

const beerNames = [
  'Bud', 'Bud Light', 'Mich Ultra', 'Corona', 'Sierra Nevada', 'Coors Light', 
  'Miller Lite', 'Sam Adams', 'Heineken', 'Newcastle', 'RedStripe', 'Red Stripe', 
  'Highland Kashmir IPA', 'Highland Oatmeal Porter', "Beck's N/A", 'Natty Greene Buckshot',
  'Michelob Ultra', 'Hoppyum', 'Wicked Weed Pernicio', 'Bottle Miller Light', 
  'Bottle Bud', 'Bottle Michelob Ultra'
];

try {
  db.transaction(() => {
    // 1. Get all brands currently categorized as BEER
    const beerBrands = db.prepare("SELECT id, name FROM liquor_brands WHERE category = 'BEER'").all();
    
    let brandsUpdated = 0;
    let variantsUpdated = 0;
    let countsUpdated = 0;
    
    const updateBrandStmt = db.prepare("UPDATE liquor_brands SET category = 'LIQUOR', specificGravity = 0.94 WHERE id = ?");
    const updateVariantStmt = db.prepare("UPDATE liquor_variants SET sizeMl = 750, emptyWeightGrams = 450, fullWeightGrams = 1200 WHERE brandId = ?");
    const updateCountItemsStmt = db.prepare(`
      UPDATE physical_count_items 
      SET qtyCalculatedOz = CAST(qtyRaw * (750 / 29.5735) AS REAL)
      WHERE brandId = ?
    `);
    
    beerBrands.forEach(b => {
      // If it's NOT a beer name, it's actually a spirit/liquor
      const isRealBeer = beerNames.some(name => b.name.toLowerCase().includes(name.toLowerCase()));
      if (!isRealBeer) {
        // Update brand category to LIQUOR and gravity to 0.94
        const bRes = updateBrandStmt.run(b.id);
        brandsUpdated += bRes.changes;
        
        // Update variant size to 750ml and tare weights
        const vRes = updateVariantStmt.run(b.id);
        variantsUpdated += vRes.changes;
        
        // Update count items calculated volume
        const cRes = updateCountItemsStmt.run(b.id);
        countsUpdated += cRes.changes;
      }
    });
    
    console.log(`Updated ${brandsUpdated} brands to 'LIQUOR' category.`);
    console.log(`Updated ${variantsUpdated} variants to 750ml specifications.`);
    console.log(`Recalculated ounces for ${countsUpdated} physical count records.`);
  })();
  console.log('✅ Database category and volume correction successful!');
} catch (e) {
  console.error('Error correcting categories:', e);
} finally {
  db.close();
}
