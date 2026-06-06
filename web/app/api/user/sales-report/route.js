import { getUser } from '../../../../lib/auth.js';
import { getMasterDb, getStoreDb } from '../../../../lib/db.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = user.storeId || 'default';
    const masterDb = getMasterDb();
    
    // Load pos_items
    const posItems = masterDb.prepare('SELECT * FROM pos_items').all();
    
    // Get sales period
    const startRow = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'pos_start_date'").get();
    const endRow = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'pos_end_date'").get();
    const periodStart = startRow ? startRow.value : null;
    const periodEnd = endRow ? endRow.value : null;

    let storeName = 'Default Catalog';
    let storeItems = [];

    if (storeId !== 'default') {
      const storeRow = masterDb.prepare('SELECT name FROM store_profiles WHERE id = ?').get(storeId);
      if (storeRow) {
        storeName = storeRow.name;
      }
      try {
        const storeDb = getStoreDb(storeId);
        storeItems = storeDb.prepare("SELECT id, name, barcode, retailPrice FROM items").all();
      } catch (err) {
        console.error(`Failed to load items for store DB ${storeId}:`, err);
      }
    } else {
      storeItems = masterDb.prepare("SELECT id, name, barcode, retailPrice FROM items").all();
    }

    // Map: barcode/id -> item
    const barcodeToItemMap = new Map();
    for (const item of storeItems) {
      barcodeToItemMap.set(item.id.trim(), item);
      if (item.barcode) {
        barcodeToItemMap.set(item.barcode.trim(), item);
      }
    }

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const sales = [];

    for (const posItem of posItems) {
      const posBarcodeStr = String(posItem.itemNum).trim();
      const match = barcodeToItemMap.get(posBarcodeStr);

      if (match) {
        const revenue = posItem.amount || 0;
        const count = posItem.numSold || 0;

        totalRevenue += revenue;
        totalItemsSold += count;
        sales.push({
          barcode: posBarcodeStr,
          name: posItem.name,
          catalogName: match.name,
          price: posItem.price,
          numSold: count,
          amount: revenue,
          itemId: match.id
        });
      }
    }

    return NextResponse.json({
      storeId,
      storeName,
      totalRevenue,
      totalItemsSold,
      sales,
      periodStart,
      periodEnd
    });

  } catch (error) {
    console.error('Private sales report error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
