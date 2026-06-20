import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { getDb, getGlobalDb, closeDb } from '../lib/db.js';
import { closeAllConnections } from '../lib/dbManager.js';

process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data_valuation');

function cleanupTestData() {
  closeDb();
  closeAllConnections();
  const testDir = path.resolve(process.cwd(), 'test_data_valuation');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

test.describe('Inventory Valuation Report API', () => {

  test.beforeEach(() => {
    cleanupTestData();
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Computes overall valuation, aggregates purchasePrice, and segment values correctly', async () => {
    process.env.SAAS_MODE = 'false';

    // 1. Initialize master/global database and seed a user
    const globalDb = await getGlobalDb();
    const userId = crypto.randomUUID();
    globalDb.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, 'collector@test.com', 'hashedpassword', 'premium', 'premium', 1, 1, Date.now());

    // 2. Insert items into database
    const db = await getDb();
    
    // Seed items with purchasePrice, marketValue, or neither
    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, purchasePrice, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('coin-1', userId, '1921 Morgan Dollar', 'coin', 30.0, 45.0, 60.0, 40.0, Date.now());

    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, purchasePrice, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('coin-2', userId, '1922 Peace Dollar', 'coin', 20.0, 30.0, 45.0, 35.0, Date.now() + 100);

    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, purchasePrice, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('toy-1', userId, 'Vintage Optimus Prime', 'toy', 100.0, 150.0, 200.0, null, Date.now() + 200);

    // Item with purchase price but no market value estimate
    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, purchasePrice, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('comic-1', userId, 'Spawn Issue 1', 'comic', null, null, null, 10.0, Date.now() + 300);

    // 3. Mock Authentication session cookie
    const { encrypt } = await import('../lib/jwt.js');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionCookie = await encrypt({ userId, expiresAt });
    global.mockSessionCookie = sessionCookie;

    // 4. Trigger GET request of the valuation report API
    const { GET } = await import('../app/api/reports/valuation/route.js');
    const response = await GET({});
    assert.strictEqual(response.status, 200);

    const report = await response.json();

    // 5. Verify overall summaries
    // Total items = 4
    // Valued count = 3 (coin-1, coin-2, toy-1)
    // Purchased count = 3 (coin-1, coin-2, comic-1)
    assert.strictEqual(report.summary.totalCount, 4);
    assert.strictEqual(report.summary.valuedCount, 3);
    assert.strictEqual(report.summary.purchasedCount, 3);
    
    // Sums: 
    // Avg = 45 + 30 + 150 = 225
    // Low = 30 + 20 + 100 = 150
    // High = 60 + 45 + 200 = 305
    // totalPurchasePrice = 40 + 35 + 10 = 85
    // purchasedItemsValue (items with both purchasePrice and valueAvg) = 45 (coin-1) + 30 (coin-2) = 75
    // unpricedItemsValue (valueAvg but no purchasePrice) = 150 (toy-1) = 150
    assert.strictEqual(report.summary.totalAvg, 225.0);
    assert.strictEqual(report.summary.totalLow, 150.0);
    assert.strictEqual(report.summary.totalHigh, 305.0);
    assert.strictEqual(report.summary.totalPurchasePrice, 85.0);
    assert.strictEqual(report.summary.purchasedItemsValue, 75.0);
    assert.strictEqual(report.summary.unpricedItemsValue, 150.0);

    // 6. Verify category breakdowns
    const coinBreakdown = report.breakdown.find(b => b.itemType === 'coin');
    assert.ok(coinBreakdown);
    assert.strictEqual(coinBreakdown.totalCount, 2);
    assert.strictEqual(coinBreakdown.valuedCount, 2);
    assert.strictEqual(coinBreakdown.purchasedCount, 2);
    assert.strictEqual(coinBreakdown.totalAvg, 75.0); // 45 + 30
    assert.strictEqual(coinBreakdown.totalPurchasePrice, 75.0); // 40 + 35
    assert.strictEqual(coinBreakdown.purchasedItemsValue, 75.0);

    const toyBreakdown = report.breakdown.find(b => b.itemType === 'toy');
    assert.ok(toyBreakdown);
    assert.strictEqual(toyBreakdown.totalCount, 1);
    assert.strictEqual(toyBreakdown.valuedCount, 1);
    assert.strictEqual(toyBreakdown.purchasedCount, 0);
    assert.strictEqual(toyBreakdown.totalAvg, 150.0);
    assert.strictEqual(toyBreakdown.totalPurchasePrice, 0.0);
    assert.strictEqual(toyBreakdown.purchasedItemsValue, 0.0);
    assert.strictEqual(toyBreakdown.unpricedItemsValue, 150.0);

    // 7. Verify items list
    assert.strictEqual(report.items.length, 4);
    
    // Sort order: valueAvg DESC (150, 45, 30, 0)
    assert.strictEqual(report.items[0].id, 'toy-1'); 
    assert.strictEqual(report.items[0].valueAvg, 150.0);
    assert.strictEqual(report.items[0].purchasePrice, null);

    assert.strictEqual(report.items[1].id, 'coin-1');
    assert.strictEqual(report.items[1].valueAvg, 45.0);
    assert.strictEqual(report.items[1].purchasePrice, 40.0);

    assert.strictEqual(report.items[2].id, 'coin-2');
    assert.strictEqual(report.items[2].valueAvg, 30.0);
    assert.strictEqual(report.items[2].purchasePrice, 35.0);

    assert.strictEqual(report.items[3].id, 'comic-1');
    assert.strictEqual(report.items[3].valueAvg, 0.0);
    assert.strictEqual(report.items[3].purchasePrice, 10.0);

    // Clean up mock
    global.mockSessionCookie = null;
  });

});
