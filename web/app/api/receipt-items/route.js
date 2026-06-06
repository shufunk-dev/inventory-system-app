import { getMasterDb, getStoreDb } from '../../../lib/db.js';
import { getUser } from '../../../lib/auth.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterDb = getMasterDb();
    const posItems = masterDb.prepare('SELECT * FROM pos_items').all();
    const stores = masterDb.prepare('SELECT id, name FROM store_profiles').all();

    // Map: barcode -> { storeId, storeName, catalogName }
    const barcodeMap = new Map();

    // Load default catalog items
    const defaultItems = masterDb.prepare("SELECT id, name, barcode FROM items WHERE barcode IS NOT NULL AND barcode != ''").all();
    for (const item of defaultItems) {
      barcodeMap.set(item.barcode.trim(), {
        storeId: 'default',
        storeName: 'Default Catalog',
        catalogName: item.name
      });
    }

    // Load custom stores catalog items
    for (const store of stores) {
      try {
        const storeDb = getStoreDb(store.id);
        const storeItems = storeDb.prepare("SELECT id, name, barcode FROM items WHERE barcode IS NOT NULL AND barcode != ''").all();
        for (const item of storeItems) {
          barcodeMap.set(item.barcode.trim(), {
            storeId: store.id,
            storeName: store.name,
            catalogName: item.name
          });
        }
      } catch (e) {
        console.error(`Error loading store ${store.name} in receipt-items:`, e);
      }
    }

    // Attach store and catalog details to each POS item
    const items = posItems.map(pos => {
      const barcodeStr = String(pos.itemNum).trim();
      const match = barcodeMap.get(barcodeStr);
      return {
        itemNum: pos.itemNum,
        name: pos.name,
        price: pos.price,
        storeId: match ? match.storeId : 'unattributed',
        storeName: match ? match.storeName : 'Direct Mall Sale',
        catalogName: match ? match.catalogName : pos.name
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Fetch receipt items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
