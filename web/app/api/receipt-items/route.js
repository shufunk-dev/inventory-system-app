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

    // Map: barcode/id -> { storeId, storeName, catalogName, retailPrice }
    const barcodeMap = new Map();

    // Load default catalog items
    const defaultItems = masterDb.prepare("SELECT id, name, barcode, retailPrice FROM items WHERE retailPrice IS NOT NULL AND retailPrice != ''").all();
    for (const item of defaultItems) {
      const key = (item.barcode && item.barcode.trim()) || item.id;
      barcodeMap.set(key, {
        storeId: 'default',
        storeName: 'Default Catalog',
        catalogName: item.name,
        retailPrice: item.retailPrice
      });
    }

    // Load custom stores catalog items
    for (const store of stores) {
      try {
        const storeDb = getStoreDb(store.id);
        const storeItems = storeDb.prepare("SELECT id, name, barcode, retailPrice FROM items WHERE retailPrice IS NOT NULL AND retailPrice != ''").all();
        for (const item of storeItems) {
          const key = (item.barcode && item.barcode.trim()) || item.id;
          barcodeMap.set(key, {
            storeId: store.id,
            storeName: store.name,
            catalogName: item.name,
            retailPrice: item.retailPrice
          });
        }
      } catch (e) {
        console.error(`Error loading store ${store.name} in receipt-items:`, e);
      }
    }

    // Map of active POS items (keyed by barcode/itemNum)
    const posItemsMap = new Map();

    // 1. Add explicitly configured POS items
    for (const pos of posItems) {
      const barcodeStr = String(pos.itemNum).trim();
      const match = barcodeMap.get(barcodeStr);
      posItemsMap.set(barcodeStr, {
        itemNum: pos.itemNum,
        name: pos.name,
        price: pos.price,
        storeId: match ? match.storeId : 'unattributed',
        storeName: match ? match.storeName : 'Direct Mall Sale',
        catalogName: match ? match.catalogName : pos.name
      });
    }

    // 2. Add main catalog items that have a retail price
    for (const [key, info] of barcodeMap.entries()) {
      if (info.retailPrice !== null && info.retailPrice !== undefined && info.retailPrice !== '') {
        const keyStr = key.trim();
        if (!posItemsMap.has(keyStr)) {
          posItemsMap.set(keyStr, {
            itemNum: keyStr,
            name: info.catalogName,
            price: parseFloat(info.retailPrice),
            storeId: info.storeId,
            storeName: info.storeName,
            catalogName: info.catalogName
          });
        }
      }
    }

    // 3. Calculate next sequential receipt number
    let lastReceiptNo = 'R-100000';
    try {
      const lastReceipt = masterDb.prepare("SELECT receiptNo FROM payment_transactions ORDER BY createdAt DESC LIMIT 1").get();
      if (lastReceipt && lastReceipt.receiptNo) {
        lastReceiptNo = lastReceipt.receiptNo;
      }
    } catch (e) {
      console.error("Error reading last receipt number:", e);
    }

    let nextNo = 100001;
    const match = lastReceiptNo.split('-').pop().match(/\d+/);
    if (match) {
      nextNo = parseInt(match[0]) + 1;
    }
    const nextReceiptNo = `R-${nextNo}`;

    return NextResponse.json({
      items: Array.from(posItemsMap.values()),
      nextReceiptNo
    });
  } catch (error) {
    console.error('Fetch receipt items error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
