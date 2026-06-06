import { getDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  // Mock NextResponse for standalone Node.js testing runner
  NextResponse = {
    json: (body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body
      };
    }
  };
}

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();

    // 1. Get overall summaries
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN valueAvg IS NOT NULL THEN 1 ELSE 0 END) as valuedCount,
        COALESCE(SUM(valueLow), 0) as totalLow,
        COALESCE(SUM(valueAvg), 0) as totalAvg,
        COALESCE(SUM(valueHigh), 0) as totalHigh
      FROM items
    `).get();

    // 2. Get breakdown by itemType
    const breakdown = db.prepare(`
      SELECT 
        itemType,
        COUNT(*) as totalCount,
        SUM(CASE WHEN valueAvg IS NOT NULL THEN 1 ELSE 0 END) as valuedCount,
        COALESCE(SUM(valueLow), 0) as totalLow,
        COALESCE(SUM(valueAvg), 0) as totalAvg,
        COALESCE(SUM(valueHigh), 0) as totalHigh
      FROM items
      GROUP BY itemType
      ORDER BY totalAvg DESC
    `).all();

    // 3. Get list of all items that have a market value
    const items = db.prepare(`
      SELECT 
        id, 
        name, 
        itemType, 
        imagePath, 
        syncStatus,
        COALESCE(valueLow, 0) as valueLow,
        COALESCE(valueAvg, 0) as valueAvg,
        COALESCE(valueHigh, 0) as valueHigh
      FROM items
      WHERE valueAvg IS NOT NULL
      ORDER BY valueAvg DESC
    `).all();

    return NextResponse.json({
      summary: {
        totalCount: summary.totalCount,
        valuedCount: summary.valuedCount,
        totalLow: parseFloat(summary.totalLow.toFixed(2)),
        totalAvg: parseFloat(summary.totalAvg.toFixed(2)),
        totalHigh: parseFloat(summary.totalHigh.toFixed(2))
      },
      breakdown: breakdown.map(b => ({
        itemType: b.itemType || 'standard',
        totalCount: b.totalCount,
        valuedCount: b.valuedCount,
        totalLow: parseFloat(b.totalLow.toFixed(2)),
        totalAvg: parseFloat(b.totalAvg.toFixed(2)),
        totalHigh: parseFloat(b.totalHigh.toFixed(2))
      })),
      items: items.map(item => ({
        id: item.id,
        name: item.name || 'Unnamed Item',
        itemType: item.itemType || 'standard',
        imagePath: item.imagePath,
        syncStatus: item.syncStatus,
        valueLow: parseFloat(item.valueLow.toFixed(2)),
        valueAvg: parseFloat(item.valueAvg.toFixed(2)),
        valueHigh: parseFloat(item.valueHigh.toFixed(2))
      }))
    });
  } catch (error) {
    console.error('Valuation Report API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch valuation stats: ' + error.message }, { status: 500 });
  }
}
