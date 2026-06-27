import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Mock axios.get to support SerpApi and Google Custom Search
const originalAxiosGet = axios.get;
axios.get = async (url, config) => {
  if (url.includes('serpapi.com/search.json')) {
    return {
      data: {
        shopping_results: [
          { extracted_price: 15.00 },
          { extracted_price: 20.00 },
          { extracted_price: 25.00 }
        ]
      }
    };
  }
  if (url.includes('googleapis.com/customsearch/v1')) {
    return {
      data: {
        items: [
          {
            title: 'Mock Product',
            snippet: 'Estimated value: $15.00, average $20.00, high $25.00'
          }
        ]
      }
    };
  }
  return originalAxiosGet(url, config);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set test environment variable for user data path BEFORE importing db helpers
process.env.USER_DATA_PATH = path.resolve(__dirname, 'test_market_refresh_data');

import { getDb, closeDb } from '../lib/db.js';
import { closeAllConnections } from '../lib/dbManager.js';
import { fetchItemDetails } from '../lib/worker.js';
import { getCategoryAndChildrenIds } from '../lib/categories.js';

describe('Market Value Refresh System Tests', () => {
  let db;

  before(async () => {
    // Delete any old test databases
    const testDir = process.env.USER_DATA_PATH;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    // getDb() will automatically create the test folder and inventory.db
    db = await getDb();
  });

  after(() => {
    axios.get = originalAxiosGet;
    closeDb();
    closeAllConnections();
    const testDir = process.env.USER_DATA_PATH;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('getCategoryAndChildrenIds resolves nested child categories recursively', () => {
    const mockCategories = [
      { id: 'parent', name: 'Parent', parentId: null },
      { id: 'child-1', name: 'Child 1', parentId: 'parent' },
      { id: 'child-2', name: 'Child 2', parentId: 'parent' },
      { id: 'grandchild', name: 'Grandchild', parentId: 'child-1' },
      { id: 'unrelated', name: 'Unrelated', parentId: null }
    ];

    const targetIds = getCategoryAndChildrenIds(mockCategories, 'parent');
    
    assert.ok(targetIds.includes('parent'));
    assert.ok(targetIds.includes('child-1'));
    assert.ok(targetIds.includes('child-2'));
    assert.ok(targetIds.includes('grandchild'));
    assert.strictEqual(targetIds.includes('unrelated'), false);
    assert.strictEqual(targetIds.length, 4);
  });

  test('fetchItemDetails refreshes existing prices when options.refreshPrices is true', async () => {
    process.env.SERPAPI_KEY = 'mock-serpapi-key';
    process.env.GOOGLE_CSE_KEY = 'mock-google-key';
    process.env.GOOGLE_CSE_CX = 'mock-google-cx';

    const itemId = 'test-toy-refresh';
    db.prepare(`
      INSERT INTO items (id, userId, categoryId, name, itemType, valueLow, valueAvg, valueHigh, syncStatus, toyCondition)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, 'user-1', null, 'Star Wars Figure', 'toy', 5.0, 7.5, 10.0, 'success', 'Loose');

    const itemBefore = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    assert.strictEqual(itemBefore.valueAvg, 7.5);

    // Call fetchItemDetails with refreshPrices option
    const result = await fetchItemDetails(itemBefore, db, { refreshPrices: true });

    assert.strictEqual(result.success, true);

    const itemAfter = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    
    // The mocked SerpApi returned prices [15.00, 20.00, 25.00]
    // Low = 15.00, High = 25.00, Avg = (15 + 20 + 25) / 3 = 20.00
    assert.strictEqual(itemAfter.valueLow, 15.00);
    assert.strictEqual(itemAfter.valueAvg, 20.00);
    assert.strictEqual(itemAfter.valueHigh, 25.00);
    assert.strictEqual(itemAfter.syncStatus, 'success');
  });

  test('API Route POST to refresh queues items correctly', async () => {
    // 1. Mock Authentication
    const { encrypt } = await import('../lib/jwt.js');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionCookie = await encrypt({ userId: 'super-admin-root', expiresAt });
    global.mockSessionCookie = sessionCookie;

    // Seed category hierarchy in the db
    db.prepare("INSERT INTO categories (id, name, parentId, userId, createdAt) VALUES ('cat-parent', 'Parent Cat', NULL, 'user-1', ?)").run(Date.now());
    db.prepare("INSERT INTO categories (id, name, parentId, userId, createdAt) VALUES ('cat-child', 'Child Cat', 'cat-parent', 'user-1', ?)").run(Date.now());

    // Seed items
    db.prepare("INSERT INTO items (id, userId, categoryId, name, itemType, syncStatus) VALUES ('item-1', 'user-1', 'cat-child', 'Item 1', 'standard', 'success')").run();
    db.prepare("INSERT INTO items (id, userId, categoryId, name, itemType, syncStatus) VALUES ('item-2', 'user-1', 'cat-parent', 'Item 2', 'standard', 'success')").run();
    db.prepare("INSERT INTO items (id, userId, categoryId, name, itemType, syncStatus) VALUES ('item-unrelated', 'user-1', NULL, 'Item Unrelated', 'standard', 'success')").run();

    // Import POST handler
    const { POST } = await import('../app/api/admin/market-value/refresh/route.js');

    // Call POST with categoryId = 'cat-parent'
    const requestObj = {
      json: async () => ({ categoryId: 'cat-parent' })
    };
    
    const response = await POST(requestObj);
    assert.strictEqual(response.status, 200);
    const resData = await response.json();
    assert.strictEqual(resData.success, true);
    assert.strictEqual(resData.queuedCount, 2); // item-1 and item-2

    // Check status in DB
    const item1 = db.prepare("SELECT syncStatus FROM items WHERE id = 'item-1'").get();
    const item2 = db.prepare("SELECT syncStatus FROM items WHERE id = 'item-2'").get();
    const itemUnrelated = db.prepare("SELECT syncStatus FROM items WHERE id = 'item-unrelated'").get();

    assert.strictEqual(item1.syncStatus, 'pending_price_refresh');
    assert.strictEqual(item2.syncStatus, 'pending_price_refresh');
    assert.strictEqual(itemUnrelated.syncStatus, 'success');

    global.mockSessionCookie = null;
  });

  test('API Route GET status aggregates syncStatus counts correctly', async () => {
    // 1. Mock Authentication
    const { encrypt } = await import('../lib/jwt.js');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionCookie = await encrypt({ userId: 'super-admin-root', expiresAt });
    global.mockSessionCookie = sessionCookie;

    // Clear items to make counts 100% deterministic and avoid background worker races
    db.prepare("DELETE FROM items").run();

    // Seed specific counts
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-p1', 'user-1', 'pending')").run();
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-pr1', 'user-1', 'pending_price_refresh')").run();
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-pr2', 'user-1', 'pending_price_refresh')").run();
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-s1', 'user-1', 'success')").run();
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-f1', 'user-1', 'failed')").run();
    db.prepare("INSERT INTO items (id, userId, syncStatus) VALUES ('item-r1', 'user-1', 'rate_limited')").run();

    // Import GET handler
    const { GET } = await import('../app/api/admin/market-value/status/route.js');

    const response = await GET();
    assert.strictEqual(response.status, 200);
    const statusData = await response.json();

    assert.strictEqual(statusData.pending, 1);
    assert.strictEqual(statusData.pending_price_refresh, 2);
    assert.strictEqual(statusData.success, 1);
    assert.strictEqual(statusData.failed, 1);
    assert.strictEqual(statusData.rate_limited, 1);
    assert.strictEqual(statusData.total, 6);

    global.mockSessionCookie = null;
  });
});
