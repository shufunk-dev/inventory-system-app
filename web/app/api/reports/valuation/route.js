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
        SUM(CASE WHEN purchasePrice IS NOT NULL THEN 1 ELSE 0 END) as purchasedCount,
        COALESCE(SUM(valueLow), 0) as totalLow,
        COALESCE(SUM(valueAvg), 0) as totalAvg,
        COALESCE(SUM(valueHigh), 0) as totalHigh,
        COALESCE(SUM(purchasePrice), 0) as totalPurchasePrice,
        COALESCE(SUM(CASE WHEN purchasePrice IS NOT NULL AND valueAvg IS NOT NULL THEN valueAvg ELSE 0 END), 0) as purchasedItemsValue,
        COALESCE(SUM(CASE WHEN purchasePrice IS NULL AND valueAvg IS NOT NULL THEN valueAvg ELSE 0 END), 0) as unpricedItemsValue
      FROM items
    `).get();

    // 2. Get breakdown by itemType
    const breakdown = db.prepare(`
      SELECT 
        itemType,
        COUNT(*) as totalCount,
        SUM(CASE WHEN valueAvg IS NOT NULL THEN 1 ELSE 0 END) as valuedCount,
        SUM(CASE WHEN purchasePrice IS NOT NULL THEN 1 ELSE 0 END) as purchasedCount,
        COALESCE(SUM(valueLow), 0) as totalLow,
        COALESCE(SUM(valueAvg), 0) as totalAvg,
        COALESCE(SUM(valueHigh), 0) as totalHigh,
        COALESCE(SUM(purchasePrice), 0) as totalPurchasePrice,
        COALESCE(SUM(CASE WHEN purchasePrice IS NOT NULL AND valueAvg IS NOT NULL THEN valueAvg ELSE 0 END), 0) as purchasedItemsValue,
        COALESCE(SUM(CASE WHEN purchasePrice IS NULL AND valueAvg IS NOT NULL THEN valueAvg ELSE 0 END), 0) as unpricedItemsValue
      FROM items
      GROUP BY itemType
      ORDER BY totalAvg DESC
    `).all();

    // 3. Get list of all items (with or without market value)
    const items = db.prepare(`
      SELECT 
        id, 
        name, 
        itemType, 
        imagePath, 
        syncStatus,
        purchasePrice,
        COALESCE(valueLow, 0) as valueLow,
        COALESCE(valueAvg, 0) as valueAvg,
        COALESCE(valueHigh, 0) as valueHigh
      FROM items
      ORDER BY COALESCE(valueAvg, 0) DESC, COALESCE(purchasePrice, 0) DESC
    `).all();

    return NextResponse.json({
      summary: {
        totalCount: summary.totalCount,
        valuedCount: summary.valuedCount,
        purchasedCount: summary.purchasedCount,
        totalLow: parseFloat(summary.totalLow.toFixed(2)),
        totalAvg: parseFloat(summary.totalAvg.toFixed(2)),
        totalHigh: parseFloat(summary.totalHigh.toFixed(2)),
        totalPurchasePrice: parseFloat(summary.totalPurchasePrice.toFixed(2)),
        purchasedItemsValue: parseFloat(summary.purchasedItemsValue.toFixed(2)),
        unpricedItemsValue: parseFloat(summary.unpricedItemsValue.toFixed(2))
      },
      breakdown: breakdown.map(b => ({
        itemType: b.itemType || 'standard',
        totalCount: b.totalCount,
        valuedCount: b.valuedCount,
        purchasedCount: b.purchasedCount,
        totalLow: parseFloat(b.totalLow.toFixed(2)),
        totalAvg: parseFloat(b.totalAvg.toFixed(2)),
        totalHigh: parseFloat(b.totalHigh.toFixed(2)),
        totalPurchasePrice: parseFloat(b.totalPurchasePrice.toFixed(2)),
        purchasedItemsValue: parseFloat(b.purchasedItemsValue.toFixed(2)),
        unpricedItemsValue: parseFloat(b.unpricedItemsValue.toFixed(2))
      })),
      items: items.map(item => ({
        id: item.id,
        name: item.name || 'Unnamed Item',
        itemType: item.itemType || 'standard',
        imagePath: item.imagePath,
        syncStatus: item.syncStatus,
        purchasePrice: item.purchasePrice !== null ? parseFloat(item.purchasePrice.toFixed(2)) : null,
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
