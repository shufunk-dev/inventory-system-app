import { getDb } from '../../../../../lib/db.js';
import { getUser } from '../../../../../lib/auth.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function GET() {
  try {
    const admin = await getUser();
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    
    // Get counts grouped by syncStatus
    const rows = db.prepare(`
      SELECT syncStatus, COUNT(*) as count 
      FROM items 
      GROUP BY syncStatus
    `).all();

    const counts = {
      pending: 0,
      pending_price_refresh: 0,
      success: 0,
      failed: 0,
      rate_limited: 0
    };

    rows.forEach(row => {
      const status = row.syncStatus || 'pending';
      if (status in counts) {
        counts[status] = row.count;
      }
    });

    // Get total items count
    const totalRow = db.prepare('SELECT COUNT(*) as total FROM items').get();
    counts.total = totalRow ? totalRow.total : 0;

    // Get count of unknown/unidentified items
    const unknownRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE name IS NULL OR name = '' OR name = 'Unknown Item' OR name = 'Unknown Item (Needs Review)' OR syncStatus IN ('failed', 'rate_limited')
    `).get();
    counts.unknownCount = unknownRow ? unknownRow.count : 0;

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Market value status API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
