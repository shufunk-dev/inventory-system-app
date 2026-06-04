import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'inventory.db');
const db = new Database(dbPath);

console.log('Querying details for "$21.63":');
const brand = db.prepare("SELECT * FROM liquor_brands WHERE name = '$21.63'").get();
if (brand) {
  console.log('Brand:', brand);
  const variants = db.prepare("SELECT * FROM liquor_variants WHERE brandId = ?").all(brand.id);
  console.log('Variants:', variants);
  const items = db.prepare(`
    SELECT pci.*, pc.countDate 
    FROM physical_count_items pci
    JOIN physical_counts pc ON pci.countId = pc.id
    WHERE pci.brandId = ?
  `).all(brand.id);
  console.log('Items:', items);
} else {
  console.log('Brand "$21.63" not found');
}

db.close();
