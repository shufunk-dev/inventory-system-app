import { getUser } from '../../../../lib/auth.js';
import { getMasterDb, getStoreDb } from '../../../../lib/db.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const masterDb = getMasterDb();
    
    // Load pos_items
    const posItems = masterDb.prepare('SELECT * FROM pos_items').all();
    
    // Load store profiles
    const stores = masterDb.prepare('SELECT id, name FROM store_profiles ORDER BY name ASC').all();
    
    // Get sales period
    const startRow = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'pos_start_date'").get();
    const endRow = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'pos_end_date'").get();
    const periodStart = startRow ? startRow.value : null;
    const periodEnd = endRow ? endRow.value : null;

    // Map: barcode -> array of { storeId, storeName, item }
    const barcodeToStoreMap = new Map();

    // Load items from default catalog
    const defaultItems = masterDb.prepare("SELECT id, name, barcode, retailPrice FROM items").all();
    for (const item of defaultItems) {
      // 1. Map by internal unique ID (UUID)
      const itemId = item.id.trim();
      if (!barcodeToStoreMap.has(itemId)) {
        barcodeToStoreMap.set(itemId, []);
      }
      barcodeToStoreMap.get(itemId).push({
        storeId: 'default',
        storeName: 'Default Catalog',
        item
      });

      // 2. Map by original manufacturer barcode
      if (item.barcode) {
        const cleanBarcode = item.barcode.trim();
        if (cleanBarcode) {
          if (!barcodeToStoreMap.has(cleanBarcode)) {
            barcodeToStoreMap.set(cleanBarcode, []);
          }
          // Only push if not already mapped by ID to prevent duplicates
          const list = barcodeToStoreMap.get(cleanBarcode);
          if (!list.some(entry => entry.item.id === item.id)) {
            list.push({
              storeId: 'default',
              storeName: 'Default Catalog',
              item
            });
          }
        }
      }
    }

    // Load items from each store database
    for (const store of stores) {
      try {
        const storeDb = getStoreDb(store.id);
        const storeItems = storeDb.prepare("SELECT id, name, barcode, retailPrice FROM items").all();
        for (const item of storeItems) {
          // 1. Map by internal unique ID (UUID)
          const itemId = item.id.trim();
          if (!barcodeToStoreMap.has(itemId)) {
            barcodeToStoreMap.set(itemId, []);
          }
          barcodeToStoreMap.get(itemId).push({
            storeId: store.id,
            storeName: store.name,
            item
          });

          // 2. Map by original manufacturer barcode
          if (item.barcode) {
            const cleanBarcode = item.barcode.trim();
            if (cleanBarcode) {
              if (!barcodeToStoreMap.has(cleanBarcode)) {
                barcodeToStoreMap.set(cleanBarcode, []);
              }
              const list = barcodeToStoreMap.get(cleanBarcode);
              if (!list.some(entry => entry.item.id === item.id)) {
                list.push({
                  storeId: store.id,
                  storeName: store.name,
                  item
                });
              }
            }
          }
        }
      } catch (err) {
        console.error(`Failed to load items from store DB ${store.name} (${store.id}):`, err);
      }
    }

    // Initialize sales reports structures
    const storeSales = {};
    storeSales['default'] = {
      storeId: 'default',
      storeName: 'Default Catalog',
      totalRevenue: 0,
      totalItemsSold: 0,
      sales: []
    };

    for (const store of stores) {
      storeSales[store.id] = {
        storeId: store.id,
        storeName: store.name,
        totalRevenue: 0,
        totalItemsSold: 0,
        sales: []
      };
    }

    let unattributedRevenue = 0;
    let unattributedCount = 0;
    const unattributedSales = [];

    let overallRevenue = 0;
    let overallCount = 0;

    for (const posItem of posItems) {
      const posBarcodeStr = String(posItem.itemNum).trim();
      const matchingStoreItems = barcodeToStoreMap.get(posBarcodeStr);

      const revenue = posItem.amount || 0;
      const count = posItem.numSold || 0;

      overallRevenue += revenue;
      overallCount += count;

      if (matchingStoreItems && matchingStoreItems.length > 0) {
        // Attribute to the first matching store database
        const match = matchingStoreItems[0];
        const target = storeSales[match.storeId];
        if (target) {
          target.totalRevenue += revenue;
          target.totalItemsSold += count;
          target.sales.push({
            barcode: posBarcodeStr,
            name: posItem.name,
            catalogName: match.item.name,
            price: posItem.price,
            numSold: count,
            amount: revenue,
            itemId: match.item.id
          });
        }
      } else {
        // Unattributed sales
        unattributedRevenue += revenue;
        unattributedCount += count;
        unattributedSales.push({
          barcode: posBarcodeStr,
          name: posItem.name,
          price: posItem.price,
          numSold: count,
          amount: revenue
        });
      }
    }

    const reportStores = Object.values(storeSales).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      summary: {
        totalRevenue: overallRevenue,
        totalItemsSold: overallCount,
        periodStart,
        periodEnd
      },
      stores: reportStores,
      unattributed: {
        totalRevenue: unattributedRevenue,
        totalItemsSold: unattributedCount,
        sales: unattributedSales
      }
    });

  } catch (error) {
    console.error('Global sales report error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
