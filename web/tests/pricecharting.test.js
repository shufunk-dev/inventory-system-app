import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { fetchItemDetails } from '../lib/worker.js';

// Mock axios.get to avoid rate limits and make tests offline-friendly
const originalAxiosGet = axios.get;
axios.get = async (url, config) => {
  if (url.includes('upcitemdb.com')) {
    const upc = url.split('upc=')[1];
    if (upc === '045496830021') {
      return {
        data: {
          items: [{
            title: 'Super Mario World',
            images: [],
            description: 'SNES Game',
            category: 'Electronics > Video Game Consoles'
          }]
        }
      };
    }
    return { data: { items: [] } };
  }

  if (url.includes('openfoodfacts.org')) {
    return { data: { status: 0, status_verbose: 'product not found' } };
  }

  return originalAxiosGet(url, config);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PriceCharting Scan Waterfall & Store Barcode Detection', () => {
  let db;
  const testDbPath = path.resolve(__dirname, 'test_pricecharting.db');

  test('Database Schema Setup and Seeding Mock Data', () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

    // Setup basic mock schemas matching db.js items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        categoryId TEXT,
        createdAt INTEGER,
        name TEXT,
        imagePath TEXT,
        imagePathBack TEXT,
        description TEXT,
        barcode TEXT,
        itemType TEXT DEFAULT 'standard',
        syncStatus TEXT DEFAULT 'pending',
        lastSyncAttempt INTEGER,
        valueLow REAL,
        valueAvg REAL,
        valueHigh REAL,
        moviePlot TEXT,
        movieCast TEXT,
        movieTrailer TEXT,
        toyBrand TEXT,
        toyYear TEXT,
        toyCondition TEXT,
        coinCondition TEXT,
        coinCertNumber TEXT,
        coinGradingAgency TEXT,
        cardCondition TEXT,
        cardCertNumber TEXT,
        cardGradingAgency TEXT,
        comicCondition TEXT,
        comicCertNumber TEXT,
        comicGradingAgency TEXT,
        comicPublisher TEXT,
        comicIssue TEXT,
        gradedCondition TEXT,
        gradedCertNumber TEXT,
        gradedAgency TEXT
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  });

  test('Barcode Classification & Auto-Bypass Checks', () => {
    const isStoreBarcode = (barcode) => {
      return barcode && (barcode.startsWith('2') || barcode.length < 10 || barcode.length > 14);
    };

    // Store barcodes
    assert.strictEqual(isStoreBarcode('2019385012'), true); // starts with 2
    assert.strictEqual(isStoreBarcode('123'), true); // too short
    assert.strictEqual(isStoreBarcode('12345678901234567'), true); // too long

    // Manufacturer standard UPCs
    assert.strictEqual(isStoreBarcode('045496830021'), false); // Super Mario World UPC
    assert.strictEqual(isStoreBarcode('010086010077'), false); // Sonic the Hedgehog UPC
  });

  test('PriceCharting Sandbox Mode Fallback Matching', async () => {
    // Inject blank key to trigger sandbox fallback
    process.env.PRICECHARTING_KEY = '';

    // Insert mock item into DB
    const itemId = 'test-item-smw';
    db.prepare(`
      INSERT INTO items (id, userId, barcode, itemType, syncStatus)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, 'user1', '045496830021', 'standard', 'pending');

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    // Execute lookup
    const result = await fetchItemDetails(item, db, { forceTier: 'game' });

    // Verify
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.details.name, 'Super Mario World (Super Nintendo)');
    assert.strictEqual(result.details.valueLow, 20.50);
    assert.strictEqual(result.details.valueAvg, 45.00);
    assert.strictEqual(result.details.valueHigh, 150.00);
    assert.strictEqual(result.details.itemType, 'game');

    // Retrieve from DB and verify promotion
    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    assert.strictEqual(updatedItem.name, 'Super Mario World (Super Nintendo)');
    assert.strictEqual(updatedItem.itemType, 'game');
    assert.strictEqual(updatedItem.valueAvg, 45.00);
    assert.strictEqual(updatedItem.valueLow, 20.50);
    assert.strictEqual(updatedItem.valueHigh, 150.00);
  });

  test('PriceCharting Non-matching UPC handles gracefully', async () => {
    // Insert mock item with non-matching UPC
    const itemId = 'test-item-unknown';
    db.prepare(`
      INSERT INTO items (id, userId, barcode, itemType, syncStatus)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, 'user1', '400000000001', 'standard', 'pending');

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    const result = await fetchItemDetails(item, db);

    // Since it does not match standard catalog lists and has no image, it should fail gracefully
    assert.strictEqual(result.success, false);
  });

  test('Clean up database', () => {
    axios.get = originalAxiosGet;
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
});
