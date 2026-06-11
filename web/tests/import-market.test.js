import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { fetchItemDetails } from '../lib/worker.js';

// Mock axios.get to support UPC lookup and SerpApi Shopping searches
const originalAxiosGet = axios.get;
axios.get = async (url, config) => {
  if (url.includes('upcitemdb.com')) {
    const upc = url.split('upc=')[1];
    if (upc === '012000000133') {
      return {
        data: {
          items: [{
            title: 'Pepsi Soda 12oz Can',
            images: [],
            description: 'Refreshing carbonated soft drink.',
            category: 'Food & Beverages > Beverages > Soda'
          }]
        }
      };
    }
    return { data: { items: [] } };
  }

  if (url.includes('serpapi.com/search.json') && url.includes('engine=google_shopping')) {
    return {
      data: {
        shopping_results: [
          { extracted_price: 1.50 },
          { extracted_price: 2.00 },
          { extracted_price: 2.50 }
        ]
      }
    };
  }

  if (url.includes('openfoodfacts.org')) {
    return { data: { status: 0, status_verbose: 'product not found' } };
  }

  return originalAxiosGet(url, config);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Automatic Market Data Ingestion on Import', () => {
  let db;
  const testDbPath = path.resolve(__dirname, 'test_import_market.db');

  test('Database Schema Setup', () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

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

  test('Barcode lookup resolves name and triggers generic market fallback', async () => {
    // Inject mock SerpApi key and verify fallback triggers
    process.env.SERPAPI_KEY = 'mock-serpapi-key';

    const itemId = 'test-item-pepsi';
    db.prepare(`
      INSERT INTO items (id, userId, barcode, itemType, syncStatus)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, 'user1', '012000000133', 'standard', 'pending');

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);

    // Run details fetcher
    const result = await fetchItemDetails(item, db);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.details.name, 'Pepsi Soda 12oz Can');

    // Retrieve from DB and verify values were updated
    const updatedItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
    assert.strictEqual(updatedItem.name, 'Pepsi Soda 12oz Can');
    assert.strictEqual(updatedItem.syncStatus, 'success');
    
    // Low = 1.50, High = 2.50, Avg = (1.50 + 2.00 + 2.50) / 3 = 2.00
    assert.strictEqual(updatedItem.valueLow, 1.50);
    assert.strictEqual(updatedItem.valueAvg, 2.00);
    assert.strictEqual(updatedItem.valueHigh, 2.50);
  });

  test('Clean up database', () => {
    axios.get = originalAxiosGet;
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
});
