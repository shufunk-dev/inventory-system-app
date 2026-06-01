const db = require('better-sqlite3')('./inventory.db');
['toyBrand', 'toyYear', 'toyCondition'].forEach(c => { try { db.exec(`ALTER TABLE items ADD COLUMN ${c} TEXT`) } catch(e){} });
['valueLow', 'valueAvg', 'valueHigh'].forEach(c => { try { db.exec(`ALTER TABLE items ADD COLUMN ${c} REAL`) } catch(e){} });
console.log('Done');
