const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function run() {
  const dataPath = process.env.USER_DATA_PATH || path.resolve(__dirname, '../');
  const dbPath = path.resolve(dataPath, 'inventory.db');
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}`);
    return;
  }

  console.log(`Opening database: ${dbPath}`);
  const db = new Database(dbPath);

  // 1. Fetch user ID (get the first user, which is the admin)
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!user) {
    console.error('No admin user found. Please run setup first.');
    db.close();
    return;
  }
  const userId = user.id;

  // 2. Fetch count sessions
  const countSessions = db.prepare('SELECT * FROM physical_counts WHERE userId = ? ORDER BY countDate ASC').all(userId);
  if (countSessions.length === 0) {
    console.error('No physical count sessions found. Please upload an inventory report first.');
    db.close();
    return;
  }

  // Determine starting and ending count sessions
  let startSession = countSessions[0];
  let endSession = null;

  if (countSessions.length === 1) {
    console.log('Only 1 count session found. Cloning it to create a second (Ending) count session...');
    // Create ending session 1 day later
    const startDate = new Date(startSession.countDate);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    const endDateStr = endDate.toISOString().split('T')[0];

    endSession = {
      id: crypto.randomUUID(),
      countDate: endDateStr,
      status: 'completed',
      userId
    };

    db.prepare('INSERT INTO physical_counts (id, countDate, status, userId) VALUES (?, ?, ?, ?)').run(
      endSession.id, endSession.countDate, endSession.status, endSession.userId
    );

    // Duplicate all items from starting count into ending count
    const startingItems = db.prepare('SELECT * FROM physical_count_items WHERE countId = ?').all(startSession.id);
    const insertItemStmt = db.prepare(`
      INSERT INTO physical_count_items (id, countId, brandId, variantId, qtyRaw, isWeighted, qtyCalculatedOz)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of startingItems) {
      insertItemStmt.run(
        crypto.randomUUID(),
        endSession.id,
        item.brandId,
        item.variantId,
        item.qtyRaw,
        item.isWeighted,
        item.qtyCalculatedOz
      );
    }
    console.log(`Cloned session ${startSession.id} to new ending session ${endSession.id} dated ${endDateStr}`);
  } else {
    endSession = countSessions[countSessions.length - 1];
    console.log(`Using existing ending session ${endSession.id} dated ${endSession.countDate}`);
  }

  // 3. Alter the quantities of items in the ending session
  // We'll decrease the wine items by a random percentage (e.g. 10% to 50%) to simulate depletion
  const endingItems = db.prepare(`
    SELECT pci.*, b.category, b.name
    FROM physical_count_items pci
    JOIN liquor_brands b ON pci.brandId = b.id
    WHERE pci.countId = ?
  `).all(endSession.id);

  const updateItemStmt = db.prepare(`
    UPDATE physical_count_items
    SET qtyRaw = ?, qtyCalculatedOz = ?
    WHERE id = ?
  `);

  let alteredCount = 0;
  db.transaction(() => {
    for (const item of endingItems) {
      const isWine = item.category.toUpperCase().includes('WINE');
      const isBeer = item.category.toUpperCase().includes('BEER');
      
      if (isWine || isBeer) {
        // Decrease by a random percentage between 10% and 40%
        // E.g., multiplier is between 0.6 and 0.9
        const reductionPct = 10 + Math.random() * 30; // 10% to 40%
        const multiplier = (100 - reductionPct) / 100;
        
        const newQtyRaw = parseFloat((item.qtyRaw * multiplier).toFixed(2));
        const newQtyOz = parseFloat((item.qtyCalculatedOz * multiplier).toFixed(2));
        
        updateItemStmt.run(newQtyRaw, newQtyOz, item.id);
        alteredCount++;
      }
    }
  })();

  console.log(`✅ Successfully simulated consumption by decreasing ${alteredCount} wine/beer items in the ending inventory session.`);
  db.close();
}

run();
