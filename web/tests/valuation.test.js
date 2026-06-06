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

  test('Computes overall valuation and aggregates by category correctly', async () => {
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
    
    // Seed standard items
    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('coin-1', userId, '1921 Morgan Dollar', 'coin', 30.0, 45.0, 60.0, Date.now());

    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('coin-2', userId, '1922 Peace Dollar', 'coin', 20.0, 30.0, 45.0, Date.now());

    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('toy-1', userId, 'Vintage Optimus Prime', 'toy', 100.0, 150.0, 200.0, Date.now());

    // Item without market value (unvalued)
    db.prepare(`
      INSERT INTO items (id, userId, name, itemType, valueLow, valueAvg, valueHigh, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('comic-1', userId, 'Spawn Issue 1', 'comic', null, null, null, Date.now());

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
    // Total items = 4, Valued items = 3 (coin-1, coin-2, toy-1)
    assert.strictEqual(report.summary.totalCount, 4);
    assert.strictEqual(report.summary.valuedCount, 3);
    
    // Sums: 
    // Avg = 45 + 30 + 150 = 225
    // Low = 30 + 20 + 100 = 150
    // High = 60 + 45 + 200 = 305
    assert.strictEqual(report.summary.totalAvg, 225.0);
    assert.strictEqual(report.summary.totalLow, 150.0);
    assert.strictEqual(report.summary.totalHigh, 305.0);

    // 6. Verify category breakdowns
    const coinBreakdown = report.breakdown.find(b => b.itemType === 'coin');
    assert.ok(coinBreakdown);
    assert.strictEqual(coinBreakdown.totalCount, 2);
    assert.strictEqual(coinBreakdown.valuedCount, 2);
    assert.strictEqual(coinBreakdown.totalAvg, 75.0); // 45 + 30

    const toyBreakdown = report.breakdown.find(b => b.itemType === 'toy');
    assert.ok(toyBreakdown);
    assert.strictEqual(toyBreakdown.totalCount, 1);
    assert.strictEqual(toyBreakdown.valuedCount, 1);
    assert.strictEqual(toyBreakdown.totalAvg, 150.0);

    const comicBreakdown = report.breakdown.find(b => b.itemType === 'comic');
    assert.ok(comicBreakdown);
    assert.strictEqual(comicBreakdown.totalCount, 1);
    assert.strictEqual(comicBreakdown.valuedCount, 0);
    assert.strictEqual(comicBreakdown.totalAvg, 0.0);

    // 7. Verify items list
    assert.strictEqual(report.items.length, 3); // Spawns is not in the list because it has no valueAvg
    assert.strictEqual(report.items[0].id, 'toy-1'); // Highest value first
    assert.strictEqual(report.items[0].valueAvg, 150.0);
    assert.strictEqual(report.items[1].id, 'coin-1');
    assert.strictEqual(report.items[2].id, 'coin-2');

    // Clean up mock
    global.mockSessionCookie = null;
  });

});
