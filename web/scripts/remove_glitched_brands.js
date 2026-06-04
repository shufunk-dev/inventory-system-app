import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Opening database for cleanup at:', dbPath);

try {
  db.transaction(() => {
    // Fetch all brands
    const brands = db.prepare('SELECT id, name FROM liquor_brands').all();
    
    // Filter to find glitched names (purely numeric or currency values)
    const glitchedBrands = brands.filter(b => /^\$?\d+(\.\d+)?$/.test(b.name));
    
    if (glitchedBrands.length === 0) {
      console.log('No glitched brand names found in the database.');
      return;
    }
    
    console.log(`Found ${glitchedBrands.length} glitched brand names to remove:`);
    glitchedBrands.forEach(b => console.log(`  - "${b.name}"`));
    
    const deleteCountItems = db.prepare('DELETE FROM physical_count_items WHERE brandId = ?');
    const deleteVariants = db.prepare('DELETE FROM liquor_variants WHERE brandId = ?');
    const deleteBrand = db.prepare('DELETE FROM liquor_brands WHERE id = ?');
    
    let totalItemsDeleted = 0;
    let totalVariantsDeleted = 0;
    
    glitchedBrands.forEach(b => {
      const pciRes = deleteCountItems.run(b.id);
      const lvRes = deleteVariants.run(b.id);
      const lbRes = deleteBrand.run(b.id);
      
      totalItemsDeleted += pciRes.changes;
      totalVariantsDeleted += lvRes.changes;
    });
    
    console.log(`\nCleanup complete:`);
    console.log(`  - Removed ${glitchedBrands.length} glitched brand catalog entries.`);
    console.log(`  - Removed ${totalVariantsDeleted} corresponding variant definitions.`);
    console.log(`  - Removed ${totalItemsDeleted} corresponding stock count records.`);
  })();
  
  console.log('✅ Glitch cleanup successful!');
} catch (e) {
  console.error('Error cleaning glitched data:', e);
} finally {
  db.close();
}
