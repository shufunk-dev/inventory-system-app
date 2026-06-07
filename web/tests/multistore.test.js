import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getDb, getGlobalDb, getStoreDb, closeDb } from '../lib/db.js';
import crypto from 'crypto';

process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data_multistore');

function cleanupTestData() {
  closeDb();
  const testDir = path.resolve(process.cwd(), 'test_data_multistore');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

test.describe('Local-First Multi-Store Aggregator', () => {
  
  test.beforeEach(() => {
    cleanupTestData();
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Shared global tables and isolated store schemas', async () => {
    process.env.SAAS_MODE = 'false';

    // 1. Initialize master/global database and create a user
    const globalDb = await getGlobalDb();
    const userId = crypto.randomUUID();
    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'storeowner@test.com', 'hashedpassword', 'premium', 'premium', 1, 1, Date.now());

    // Verify user exists globally
    const userRow = globalDb.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    assert.strictEqual(userRow.email, 'storeowner@test.com');

    // 2. Create custom store profiles
    const storeIdA = 'store-branch-a';
    const storeIdB = 'store-branch-b';
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdA, 'Northside Branch', Date.now());
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdB, 'Southside Branch', Date.now());

    // 3. Switch to Store A and create an item
    global.mockActiveStoreId = storeIdA;
    const dbA = await getDb();
    
    // Add item in Store A
    const itemIdA = 'item-in-a';
    dbA.prepare(`
      INSERT INTO items (id, userId, name, barcode, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemIdA, userId, 'Northside Whiskey', '123456', Date.now());

    // Verify item exists in Store A context
    const itemInA = dbA.prepare('SELECT name FROM items WHERE id = ?').get(itemIdA);
    assert.strictEqual(itemInA.name, 'Northside Whiskey');

    // 4. Switch to Store B and verify it is empty, then create a different item
    global.mockActiveStoreId = storeIdB;
    const dbB = await getDb();

    // Verify item from Store A does NOT exist in Store B
    const itemInBEmpty = dbB.prepare('SELECT name FROM items WHERE id = ?').get(itemIdA);
    assert.strictEqual(itemInBEmpty, undefined, 'Store B should not contain Store A items');

    // Add item in Store B
    const itemIdB = 'item-in-b';
    dbB.prepare(`
      INSERT INTO items (id, userId, name, barcode, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemIdB, userId, 'Southside Rum', '789012', Date.now());

    // Verify item exists in Store B context
    const itemInB = dbB.prepare('SELECT name FROM items WHERE id = ?').get(itemIdB);
    assert.strictEqual(itemInB.name, 'Southside Rum');

    // 5. Verify physical SQLite database files are generated separately
    const storeAFile = path.resolve(process.env.USER_DATA_PATH, `store_${storeIdA}.sqlite`);
    const storeBFile = path.resolve(process.env.USER_DATA_PATH, `store_${storeIdB}.sqlite`);
    assert.ok(fs.existsSync(storeAFile), 'SQLite file for Store A should exist');
    assert.ok(fs.existsSync(storeBFile), 'SQLite file for Store B should exist');

    // 6. Verify user/session queries still resolve successfully when store context is shifted
    // Switching to Store A should still find the global user via getGlobalDb()
    global.mockActiveStoreId = storeIdA;
    const checkDb = await getGlobalDb();
    const checkUser = checkDb.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    assert.strictEqual(checkUser.email, 'storeowner@test.com', 'User session should remain valid after switching store context');
  });

  test('Session-based auto-routing for store-assigned users', async () => {
    process.env.SAAS_MODE = 'false';

    const globalDb = await getGlobalDb();
    const userId = crypto.randomUUID();
    const storeId = 'store-branch-a';
    
    // Seed store profile
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeId, 'Northside Branch', Date.now());

    // Seed user with storeId A
    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt, storeId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'tenant-james@test.com', 'hashedpassword', 'basic', 'basic', 0, 0, Date.now(), storeId);

    // Mock next/headers for node require cache
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    // Encrypt a session cookie for the user
    const { encrypt } = await import('../lib/jwt.js');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionCookie = await encrypt({ userId, expiresAt });
    global.mockSessionCookie = sessionCookie;

    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: sessionCookie };
              return null;
            }
          })
        }
      };
    } catch (e) {
      // If next/headers fails to resolve in pure node tests, our catch fallback in db.js handles mockActiveStoreId
      // Let's also set mockActiveStoreId to storeId to be safe
      global.mockActiveStoreId = storeId;
    }

    // Call getDb() and verify it automatically returns Store A context
    const db = await getDb();
    
    // Create an item in the returned db context
    const itemId = 'item-in-auto-a';
    db.prepare(`
      INSERT INTO items (id, userId, name, barcode, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, userId, 'James Red Wagon', '11223344', Date.now());

    // Verify it was saved inside Store A database file
    const storeAFile = path.resolve(process.env.USER_DATA_PATH, `store_${storeId}.sqlite`);
    assert.ok(fs.existsSync(storeAFile), 'SQLite file for Store A should exist');
    
    // Double check from Store A direct database connection
    const directDbA = getStoreDb(storeId);
    const row = directDbA.prepare('SELECT name FROM items WHERE id = ?').get(itemId);
    assert.strictEqual(row.name, 'James Red Wagon', 'Item should be written to the auto-routed store database');

    // Clean up
    try {
      delete require.cache[require.resolve('next/headers')];
    } catch (e) {}
    global.mockSessionCookie = null;
    global.mockActiveStoreId = null;
  });

  test('Central sales barcode cross-referencing and sales report APIs', async () => {
    process.env.SAAS_MODE = 'false';

    const globalDb = await getGlobalDb();
    const adminId = 'super-admin-root';
    const tenantIdA = crypto.randomUUID();
    const tenantIdB = crypto.randomUUID();
    const storeIdA = 'store-james-toys';
    const storeIdB = 'store-janets-clothes';

    // 1. Seed store profiles
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdA, 'James Toys', Date.now());
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdB, 'Janets Clothes', Date.now());

    // 2. Create store-locked users
    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt, storeId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tenantIdA, 'james@toys.com', 'pwd', 'basic', 'basic', 0, 0, Date.now(), storeIdA);

    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt, storeId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tenantIdB, 'janet@clothes.com', 'pwd', 'basic', 'basic', 0, 0, Date.now(), storeIdB);

    // 3. Seed items in each store catalog
    const dbA = getStoreDb(storeIdA);
    dbA.prepare('INSERT INTO items (id, userId, name, barcode, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run('wagon-id', tenantIdA, 'Red Wagon', '11223344', Date.now());

    const dbB = getStoreDb(storeIdB);
    dbB.prepare('INSERT INTO items (id, userId, name, barcode, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run('dress-id', tenantIdB, 'Blue Dress', '55667788', Date.now());

    // 4. Seed pos_items in master DB
    globalDb.prepare('INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId) VALUES (?, ?, ?, ?, ?, ?)')
      .run('11223344', 'POS Red Wagon', 25.0, 125.0, 5.0, adminId);
    globalDb.prepare('INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId) VALUES (?, ?, ?, ?, ?, ?)')
      .run('55667788', 'POS Blue Dress', 40.0, 80.0, 2.0, adminId);
    globalDb.prepare('INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId) VALUES (?, ?, ?, ?, ?, ?)')
      .run('99999999', 'POS Mystery Item', 10.0, 10.0, 1.0, adminId);

    // Seed sales period in system_settings
    globalDb.prepare("INSERT INTO system_settings (key, value) VALUES ('pos_start_date', '04/01/2026')").run();
    globalDb.prepare("INSERT INTO system_settings (key, value) VALUES ('pos_end_date', '04/30/2026')").run();

    // 5. Invoke global sales report API (GET handler)
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { encrypt } = await import('../lib/jwt.js');

    // Setup admin session mock
    const adminSession = await encrypt({ userId: adminId, expiresAt: new Date(Date.now() + 100000) });
    global.mockSessionCookie = adminSession;

    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: adminSession };
              return null;
            }
          })
        }
      };
    } catch(e) {}

    const { GET: getGlobalReport } = await import('../app/api/admin/sales-report/route.js');
    const adminRes = await getGlobalReport();
    assert.strictEqual(adminRes.status, 200);

    const adminReport = await adminRes.json();
    assert.strictEqual(adminReport.summary.totalRevenue, 215.0);
    assert.strictEqual(adminReport.summary.totalItemsSold, 8.0);
    assert.strictEqual(adminReport.summary.periodStart, '04/01/2026');
    assert.strictEqual(adminReport.summary.periodEnd, '04/30/2026');

    // Verify James Toys sales
    const jamesToysReport = adminReport.stores.find(s => s.storeId === storeIdA);
    assert.ok(jamesToysReport);
    assert.strictEqual(jamesToysReport.totalRevenue, 125.0);
    assert.strictEqual(jamesToysReport.totalItemsSold, 5.0);
    assert.strictEqual(jamesToysReport.sales[0].catalogName, 'Red Wagon');

    // Verify Janets Clothes sales
    const janetReport = adminReport.stores.find(s => s.storeId === storeIdB);
    assert.ok(janetReport);
    assert.strictEqual(janetReport.totalRevenue, 80.0);
    assert.strictEqual(janetReport.totalItemsSold, 2.0);

    // Verify unattributed sales
    assert.strictEqual(adminReport.unattributed.totalRevenue, 10.0);
    assert.strictEqual(adminReport.unattributed.totalItemsSold, 1.0);
    assert.strictEqual(adminReport.unattributed.sales[0].name, 'POS Mystery Item');

    // 6. Invoke private sales report API (GET handler) for James
    const jamesSession = await encrypt({ userId: tenantIdA, expiresAt: new Date(Date.now() + 100000) });
    global.mockSessionCookie = jamesSession;

    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: jamesSession };
              return null;
            }
          })
        }
      };
    } catch(e) {}

    const { GET: getPrivateReport } = await import('../app/api/user/sales-report/route.js');
    const privateRes = await getPrivateReport();
    assert.strictEqual(privateRes.status, 200);

    const privateReport = await privateRes.json();
    assert.strictEqual(privateReport.storeId, storeIdA);
    assert.strictEqual(privateReport.storeName, 'James Toys');
    assert.strictEqual(privateReport.totalRevenue, 125.0);
    assert.strictEqual(privateReport.totalItemsSold, 5.0);
    assert.strictEqual(privateReport.sales.length, 1);
    assert.strictEqual(privateReport.sales[0].catalogName, 'Red Wagon');

    // Clean up
    try {
      delete require.cache[require.resolve('next/headers')];
    } catch (e) {}
    global.mockSessionCookie = null;
  });

  test('Session-based auto-routing for multi-store assigned users', async () => {
    process.env.SAAS_MODE = 'false';

    const globalDb = await getGlobalDb();
    const userId = crypto.randomUUID();
    const storeIdA = 'store-branch-a';
    const storeIdB = 'store-branch-b';
    
    // Seed store profiles
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdA, 'Northside Branch', Date.now());
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdB, 'Southside Branch', Date.now());

    // Seed user with storeId 'store-branch-a,store-branch-b'
    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt, storeId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'tenant-multi@test.com', 'hashedpassword', 'basic', 'basic', 0, 0, Date.now(), `${storeIdA},${storeIdB}`);

    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { encrypt } = await import('../lib/jwt.js');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionCookie = await encrypt({ userId, expiresAt });
    global.mockSessionCookie = sessionCookie;

    // Test case 1: Active store is empty (should route to storeIdA, the first allowed)
    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: sessionCookie };
              return null;
            }
          })
        }
      };
    } catch (e) {}

    const dbDefault = await getDb();
    // Verify it auto-routes to Store A (Northside Branch)
    const itemIdA = 'item-in-a-multi';
    dbDefault.prepare(`
      INSERT INTO items (id, userId, name, barcode, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemIdA, userId, 'Multi Item A', '101010', Date.now());

    const directDbA = getStoreDb(storeIdA);
    const rowA = directDbA.prepare('SELECT name FROM items WHERE id = ?').get(itemIdA);
    assert.strictEqual(rowA.name, 'Multi Item A');

    // Test case 2: Active store cookie is storeIdB (should route to storeIdB)
    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: sessionCookie };
              if (key === 'active_store_id') return { value: storeIdB };
              return null;
            }
          })
        }
      };
    } catch (e) {}

    const dbB = await getDb();
    const itemIdB = 'item-in-b-multi';
    dbB.prepare(`
      INSERT INTO items (id, userId, name, barcode, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemIdB, userId, 'Multi Item B', '202020', Date.now());

    const directDbB = getStoreDb(storeIdB);
    const rowB = directDbB.prepare('SELECT name FROM items WHERE id = ?').get(itemIdB);
    assert.strictEqual(rowB.name, 'Multi Item B');

    // Clean up
    try {
      delete require.cache[require.resolve('next/headers')];
    } catch (e) {}
    global.mockSessionCookie = null;
  });

  test('UUID sales matching and leading zero preservation', async () => {
    process.env.SAAS_MODE = 'false';

    const globalDb = await getGlobalDb();
    const adminId = 'super-admin-root';
    const storeIdA = 'store-uuid-a';
    const storeIdB = 'store-uuid-b';
    
    // Seed store profiles
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdA, 'Booth A', Date.now());
    globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt) VALUES (?, ?, ?)')
      .run(storeIdB, 'Booth B', Date.now());

    // Create items with same original UPC but unique IDs
    const itemIdA = 'uuid-item-1111';
    const itemIdB = 'uuid-item-2222';
    
    const dbA = getStoreDb(storeIdA);
    dbA.prepare('INSERT INTO items (id, userId, name, barcode, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(itemIdA, 'user-1', 'Universal Soldier DVD (Copy A)', '0123456789', Date.now());

    const dbB = getStoreDb(storeIdB);
    dbB.prepare('INSERT INTO items (id, userId, name, barcode, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(itemIdB, 'user-2', 'Universal Soldier DVD (Copy B)', '0123456789', Date.now());

    // Seed pos_items with:
    // 1. One sale of Booth A's book using its unique ID string 'uuid-item-1111'
    // 2. One sale of a book using a numeric UPC with leading zeros '0007671400'
    globalDb.prepare('INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId) VALUES (?, ?, ?, ?, ?, ?)')
      .run(itemIdA, 'Universal Soldier', 10.0, 10.0, 1.0, adminId);
    
    globalDb.prepare('INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId) VALUES (?, ?, ?, ?, ?, ?)')
      .run('0007671400', 'Book with Zeros', 15.0, 15.0, 1.0, adminId);

    // Also register '0007671400' in Booth B's catalog
    dbB.prepare('INSERT INTO items (id, userId, name, barcode, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run('book-zeros-id', 'user-2', 'Book with Zeros', '0007671400', Date.now());

    // Setup admin session mock
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { encrypt } = await import('../lib/jwt.js');
    const adminSession = await encrypt({ userId: adminId, expiresAt: new Date(Date.now() + 100000) });
    global.mockSessionCookie = adminSession;

    try {
      const nextHeadersPath = require.resolve('next/headers');
      require.cache[nextHeadersPath] = {
        id: nextHeadersPath,
        filename: nextHeadersPath,
        loaded: true,
        exports: {
          cookies: async () => ({
            get: (key) => {
              if (key === 'session') return { value: adminSession };
              return null;
            }
          })
        }
      };
    } catch(e) {}

    const { GET: getGlobalReport } = await import('../app/api/admin/sales-report/route.js');
    const res = await getGlobalReport();
    assert.strictEqual(res.status, 200);

    const report = await res.json();
    
    // Verify that Booth A received the sale for the unique item UUID
    const boothAReport = report.stores.find(s => s.storeId === storeIdA);
    assert.strictEqual(boothAReport.totalItemsSold, 1);
    assert.strictEqual(boothAReport.totalRevenue, 10.0);
    assert.strictEqual(boothAReport.sales[0].itemId, itemIdA);

    // Verify that Booth B received the sale for the leading zero UPC
    const boothBReport = report.stores.find(s => s.storeId === storeIdB);
    assert.ok(boothBReport.sales.some(s => s.barcode === '0007671400'));
    
    // Clean up globalDb pos_items
    globalDb.prepare('DELETE FROM pos_items').run();
  });

  test('Booth Number auto-assignment migration and sequential generation on POST', async () => {
    try {
      process.env.SAAS_MODE = 'false';

      const globalDb = await getGlobalDb();

      // 1. Clear store profiles
      globalDb.prepare('DELETE FROM store_profiles').run();

      // 2. Insert some store profiles with boothNumber = null
      const timeBase = Date.now();
      globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt, boothNumber) VALUES (?, ?, ?, ?)')
        .run('store-a', 'Mother Booth', timeBase - 10000, null);
      globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt, boothNumber) VALUES (?, ?, ?, ?)')
        .run('store-b', 'Second Booth', timeBase - 5000, null);
      globalDb.prepare('INSERT INTO store_profiles (id, name, createdAt, boothNumber) VALUES (?, ?, ?, ?)')
        .run('store-c', 'Third Booth', timeBase, '005'); // Pre-existing number

      // 3. Trigger close and reopen database to trigger the initializeMasterSchema migration
      closeDb();
      const reopenedDb = await getGlobalDb();

      // Verify migration assigned numbers:
      // Third Booth was '005', so maxNum was 5.
      // Unassigned booths should start incrementing from 5 -> 6, 7.
      const boothA = reopenedDb.prepare('SELECT boothNumber FROM store_profiles WHERE id = ?').get('store-a');
      const boothB = reopenedDb.prepare('SELECT boothNumber FROM store_profiles WHERE id = ?').get('store-b');
      const boothC = reopenedDb.prepare('SELECT boothNumber FROM store_profiles WHERE id = ?').get('store-c');

      assert.strictEqual(boothC.boothNumber, '005');
      assert.strictEqual(boothA.boothNumber, '006'); // Mother Booth is older, so it got numbered first
      assert.strictEqual(boothB.boothNumber, '007');

      // 4. Test the POST route auto-numbering
      // Mock user root session
      const rootId = 'root-admin';
      reopenedDb.prepare(`
        INSERT OR IGNORE INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(rootId, 'root@test.com', 'pwd', 'premium', 'premium', 1, 1, Date.now());

      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const { encrypt } = await import('../lib/jwt.js');
      const rootSession = await encrypt({ userId: rootId, expiresAt: new Date(Date.now() + 100000) });
      global.mockSessionCookie = rootSession;

      try {
        const nextHeadersPath = require.resolve('next/headers');
        require.cache[nextHeadersPath] = {
          id: nextHeadersPath,
          filename: nextHeadersPath,
          loaded: true,
          exports: {
            cookies: async () => ({
              get: (key) => {
                if (key === 'session') return { value: rootSession };
                return null;
              }
            })
          }
        };
      } catch(e) {}

      const { POST: createStore } = await import('../app/api/admin/stores/route.js');
      
      // Call POST API
      const requestMock = {
        json: async () => ({ name: 'New Fourth Booth' })
      };
      
      const response = await createStore(requestMock);
      assert.strictEqual(response.status, 200);
      const resJson = await response.json();
      
      assert.strictEqual(resJson.success, true);
      // Since highest was 7, next should be 8 -> '008'
      assert.strictEqual(resJson.store.boothNumber, '008');

      const boothD = reopenedDb.prepare('SELECT boothNumber FROM store_profiles WHERE name = ?').get('New Fourth Booth');
      assert.strictEqual(boothD.boothNumber, '008');

      // Clean up
      try {
        delete require.cache[require.resolve('next/headers')];
      } catch (e) {}
      global.mockSessionCookie = null;
    } catch (err) {
      console.error('TEST ERROR STACK:', err);
      throw err;
    }
  });
});
