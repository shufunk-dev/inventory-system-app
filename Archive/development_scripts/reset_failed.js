const { getDb } = require('./lib/db.js');
const db = getDb();
const info = db.prepare("UPDATE items SET syncStatus = 'pending' WHERE syncStatus = 'failed'").run();
console.log('Reset ' + info.changes + ' items to pending');
