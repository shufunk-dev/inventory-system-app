const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../inventory.db'));

const sessions = db.prepare('SELECT * FROM physical_counts ORDER BY rowid ASC').all();
if (sessions.length >= 2) {
  db.prepare('UPDATE physical_counts SET countDate = ? WHERE id = ?').run('2026-04-30', sessions[0].id);
  db.prepare('UPDATE physical_counts SET countDate = ? WHERE id = ?').run('2026-05-31', sessions[1].id);
  console.log('✅ Successfully updated count dates:');
  console.log(`Session 1 (${sessions[0].id}) -> 2026-04-30`);
  console.log(`Session 2 (${sessions[1].id}) -> 2026-05-31`);
} else {
  console.log('Not enough sessions found to update.');
}

db.close();
