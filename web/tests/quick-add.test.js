import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Setup in-memory / temporary SQLite test db
const testDbPath = path.resolve(process.cwd(), 'test_quick_add.sqlite');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new Database(testDbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parentId TEXT,
    userId TEXT,
    createdAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    categoryId TEXT,
    name TEXT,
    description TEXT,
    barcode TEXT,
    itemType TEXT DEFAULT 'standard',
    imagePath TEXT,
    imagePathBack TEXT,
    syncStatus TEXT DEFAULT 'pending', 
    lastSyncAttempt INTEGER,
    createdAt INTEGER,
    retailPrice REAL,
    purchasePrice REAL,
    valueLow REAL,
    valueAvg REAL,
    valueHigh REAL,
    tag TEXT,
    colorTag TEXT
  );
`);

test('Quick Add Items - Logic and DB Insertion', async (t) => {
  const insertStmt = db.prepare(`
    INSERT INTO items (
      id, userId, categoryId, name, itemType, retailPrice, valueAvg, valueLow, valueHigh, syncStatus, createdAt
    ) VALUES (
      @id, @userId, @categoryId, @name, @itemType, @retailPrice, @valueAvg, @valueLow, @valueHigh, @syncStatus, @createdAt
    )
  `);

  const mockUser = { id: 'test-user-123' };
  const mockPayload = {
    defaultCategoryId: 'cat-books',
    defaultItemType: 'standard',
    items: [
      { name: '1984 by George Orwell', marketPrice: '14.50', retailPrice: '12.00' },
      { name: 'Dune 1st Edition', marketPrice: '120.00', retailPrice: '95.00' },
      { name: 'Unpriced Book', marketPrice: '', retailPrice: '' },
      { name: '   ', marketPrice: '10.00', retailPrice: '5.00' } // Should be filtered out
    ]
  };

  const validItems = mockPayload.items.filter(item => item && typeof item.name === 'string' && item.name.trim().length > 0);
  assert.equal(validItems.length, 3, 'Filters out whitespace-only row');

  const now = Date.now();
  const createdIds = [];

  const insertMany = db.transaction((itemList) => {
    for (const item of itemList) {
      const id = crypto.randomUUID();
      const trimmedName = item.name.trim();

      let retailPrice = null;
      if (item.retailPrice !== undefined && item.retailPrice !== null && item.retailPrice !== '') {
        const parsedRetail = parseFloat(item.retailPrice);
        if (!isNaN(parsedRetail) && parsedRetail >= 0) {
          retailPrice = parseFloat(parsedRetail.toFixed(2));
        }
      }

      let valueAvg = null;
      let valueLow = null;
      let valueHigh = null;
      if (item.marketPrice !== undefined && item.marketPrice !== null && item.marketPrice !== '') {
        const parsedMarket = parseFloat(item.marketPrice);
        if (!isNaN(parsedMarket) && parsedMarket >= 0) {
          valueAvg = parseFloat(parsedMarket.toFixed(2));
          valueLow = parseFloat((valueAvg * 0.8).toFixed(2));
          valueHigh = parseFloat((valueAvg * 1.2).toFixed(2));
        }
      }

      insertStmt.run({
        id,
        userId: mockUser.id,
        categoryId: mockPayload.defaultCategoryId,
        name: trimmedName,
        itemType: mockPayload.defaultItemType,
        retailPrice,
        valueAvg,
        valueLow,
        valueHigh,
        syncStatus: 'synced',
        createdAt: now
      });

      createdIds.push(id);
    }
  });

  insertMany(validItems);

  assert.equal(createdIds.length, 3);

  // Verify rows in DB
  const rows = db.prepare('SELECT * FROM items ORDER BY createdAt ASC').all();
  assert.equal(rows.length, 3);

  const orwell = rows.find(r => r.name === '1984 by George Orwell');
  assert.ok(orwell);
  assert.equal(orwell.retailPrice, 12.00);
  assert.equal(orwell.valueAvg, 14.50);
  assert.equal(orwell.valueLow, 11.60);
  assert.equal(orwell.valueHigh, 17.40);
  assert.equal(orwell.syncStatus, 'synced');
  assert.equal(orwell.categoryId, 'cat-books');

  const unpriced = rows.find(r => r.name === 'Unpriced Book');
  assert.ok(unpriced);
  assert.equal(unpriced.retailPrice, null);
  assert.equal(unpriced.valueAvg, null);
  assert.equal(unpriced.valueLow, null);
});

// Clean up test file
test.after(() => {
  db.close();
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
