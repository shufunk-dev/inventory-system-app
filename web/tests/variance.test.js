import { test, describe } from 'node:test';
import assert from 'node:assert';
import { calculateVolumeOz, calculateTheoreticalPourOz } from '../lib/scaleMath.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Scale Ingestion Math & Specific Gravity', () => {
  test('Specific Gravity Volume Calculations', () => {
    // 1. Standard spirits (SG = 0.94)
    // Measured weight: 800g, Empty bottle tare: 450g -> Net weight: 350g
    // Volume ml = 350 / 0.94 = 372.34 ml
    // Volume oz = 372.34 / 29.5735 = 12.59 oz
    const volSpirits = calculateVolumeOz(800, 450, 0.94);
    assert.strictEqual(volSpirits, 12.59);

    // 2. Sugary cordials (SG = 1.15)
    // Measured weight: 800g, Empty bottle tare: 450g -> Net weight: 350g
    // Volume ml = 350 / 1.15 = 304.35 ml
    // Volume oz = 304.35 / 29.5735 = 10.29 oz
    const volCordials = calculateVolumeOz(800, 450, 1.15);
    assert.strictEqual(volCordials, 10.29);

    // 3. Under empty weight threshold
    const volEmpty = calculateVolumeOz(400, 450, 1.0);
    assert.strictEqual(volEmpty, 0);
  });

  test('Theoretical Pour Calculations', () => {
    const theoretical = calculateTheoreticalPourOz(10, 1.5);
    assert.strictEqual(theoretical, 15.0);
  });

  test('POS Date Range Regex Parsing', () => {
    const dateRangeRegex = /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:-|\s+to\s+)\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/;

    const headerLine = "Product Mix Report: 04/01/2026 - 04/30/2026";
    const printLine = "06/03/2026 - 5:45 AM Printed by John Shufelt";
    const wordLine = "04/01/2026 to 04/30/2026";

    // Header matches
    const matchHeader = headerLine.match(dateRangeRegex);
    assert.ok(matchHeader);
    assert.strictEqual(matchHeader[1], "04/01/2026");
    assert.strictEqual(matchHeader[2], "04/30/2026");

    // Word 'to' matches
    const matchWord = wordLine.match(dateRangeRegex);
    assert.ok(matchWord);
    assert.strictEqual(matchWord[1], "04/01/2026");
    assert.strictEqual(matchWord[2], "04/30/2026");

    // Print date with time does not match range
    const matchPrint = printLine.match(dateRangeRegex);
    assert.strictEqual(matchPrint, null);
  });
});

describe('OCR Sales & Physical Inventory Data Integration', () => {
  let db;
  const testDbPath = path.resolve(__dirname, 'test_variance.db');

  test('Database Schema Setup and Seeding Mock Data', () => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new Database(testDbPath);

    // Setup basic mock schemas matching db.js
    db.exec(`
      CREATE TABLE IF NOT EXISTS liquor_brands (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        category TEXT,
        specificGravity REAL DEFAULT 1.0,
        userId TEXT
      );

      CREATE TABLE IF NOT EXISTS liquor_variants (
        id TEXT PRIMARY KEY,
        brandId TEXT,
        sizeMl INTEGER,
        containerType TEXT,
        emptyWeightGrams REAL,
        fullWeightGrams REAL,
        cost REAL
      );

      CREATE TABLE IF NOT EXISTS pos_items (
        itemNum INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        amount REAL,
        numSold REAL,
        userId TEXT
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        posItemNum INTEGER,
        userId TEXT
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        recipeId TEXT,
        brandId TEXT,
        pourSizeOz REAL
      );

      CREATE TABLE IF NOT EXISTS physical_counts (
        id TEXT PRIMARY KEY,
        countDate TEXT,
        status TEXT,
        userId TEXT
      );

      CREATE TABLE IF NOT EXISTS physical_count_items (
        id TEXT PRIMARY KEY,
        countId TEXT,
        brandId TEXT,
        variantId TEXT,
        qtyRaw REAL,
        isWeighted INTEGER DEFAULT 0,
        qtyCalculatedOz REAL
      );
    `);
  });

  test('Mock Sales logs & Physical Count Depletion Variance', () => {
    // 1. Insert mock brands (Titos Vodka, Bud, Hendricks)
    db.prepare("INSERT INTO liquor_brands VALUES ('b1', 'Titos Vodka', 'Spirits', 0.94, 'user1')").run();
    db.prepare("INSERT INTO liquor_brands VALUES ('b2', 'Bud Light', 'Beer', 1.0, 'user1')").run();

    // 2. Insert variants
    db.prepare("INSERT INTO liquor_variants VALUES ('v1', 'b1', 1000, 'glass', 550, 1490, 31.99)").run(); // 1L Titos cost 31.99
    db.prepare("INSERT INTO liquor_variants VALUES ('v2', 'b2', 355, 'glass', 15, 370, 0.69)").run();

    // 3. Create POS Item sales:
    // We sold 10 Titos cocktails (item 100) and 20 Bud Lights (item 200)
    db.prepare("INSERT INTO pos_items VALUES (100, 'Titos Cocktail', 12.00, 120.00, 10.0, 'user1')").run();
    db.prepare("INSERT INTO pos_items VALUES (200, 'Bud Light', 5.00, 100.00, 20.0, 'user1')").run();

    // 4. Set up Recipes: Titos Cocktail recipe has 2.0 oz of Titos Vodka
    db.prepare("INSERT INTO recipes VALUES ('r1', 100, 'user1')").run();
    db.prepare("INSERT INTO recipe_ingredients VALUES ('ri1', 'r1', 'b1', 2.0)").run(); // 2 oz pour size

    // Bud Light recipe has 12 oz of Bud Light
    db.prepare("INSERT INTO recipes VALUES ('r2', 200, 'user1')").run();
    db.prepare("INSERT INTO recipe_ingredients VALUES ('ri2', 'r2', 'b2', 12.0)").run(); // 12 oz pour size

    // 5. Create Starting Count (Start count Date = 6/01)
    db.prepare("INSERT INTO physical_counts VALUES ('c_start', '2026-06-01', 'completed', 'user1')").run();
    // Start Titos: 5 full bottles (5 * 1000ml = 5000ml = 169.07 oz)
    db.prepare("INSERT INTO physical_count_items VALUES ('pci1', 'c_start', 'b1', 'v1', 5.0, 0, 169.07)").run();
    // Start Bud Light: 40 bottles (40 * 12 oz = 480.00 oz)
    db.prepare("INSERT INTO physical_count_items VALUES ('pci2', 'c_start', 'b2', 'v2', 40.0, 0, 480.00)").run();

    // 6. Create Ending Count (End count Date = 6/02)
    db.prepare("INSERT INTO physical_counts VALUES ('c_end', '2026-06-02', 'completed', 'user1')").run();
    // End Titos: 3.8 bottles (approx 128.49 oz) -> Depleted: 169.07 - 128.49 = 40.58 oz.
    db.prepare("INSERT INTO physical_count_items VALUES ('pci3', 'c_end', 'b1', 'v1', 3.8, 0, 128.49)").run();
    // End Bud Light: 15 bottles (15 * 12 = 180.00 oz) -> Depleted: 480.00 - 180.00 = 300.00 oz.
    db.prepare("INSERT INTO physical_count_items VALUES ('pci4', 'c_end', 'b2', 'v2', 15.0, 0, 180.00)").run();

    // 7. Calculate Variance:
    // Brand 1 (Titos Vodka):
    // - Starting stock: 169.07 oz
    // - Ending stock: 128.49 oz
    // - Depleted: 40.58 oz
    // - Theoretical sold (recipes): 10 sold * 2 oz = 20.00 oz
    // - Variance: 40.58 - 20.00 = 20.58 oz (Unaccounted loss!)
    // - Cost per oz: 31.99 / (1000 / 29.5735) = 0.9461 per oz.
    // - Variance cost: 20.58 * 0.9461 = $19.47

    // Brand 2 (Bud Light):
    // - Starting: 480 oz, Ending: 180 oz -> Depleted: 300 oz.
    // - Theoretical sold: 20 sold * 12 oz = 240 oz
    // - Variance: 300 - 240 = 60 oz (5 bottles missing!)
    // - Cost per oz: 0.69 / 12 = 0.0575
    // - Variance cost: 60 * 0.0575 = $3.45

    const startingItems = db.prepare("SELECT brandId, qtyCalculatedOz FROM physical_count_items WHERE countId = 'c_start'").all();
    const endingItems = db.prepare("SELECT brandId, qtyCalculatedOz FROM physical_count_items WHERE countId = 'c_end'").all();

    const theoreticalSales = db.prepare(`
      SELECT ri.brandId, SUM(p.numSold * ri.pourSizeOz) as theoreticalOz
      FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipeId = r.id
      JOIN pos_items p ON r.posItemNum = p.itemNum
      WHERE r.userId = 'user1'
      GROUP BY ri.brandId
    `).all();

    const startingMap = new Map(startingItems.map(i => [i.brandId, i.qtyCalculatedOz]));
    const endingMap = new Map(endingItems.map(i => [i.brandId, i.qtyCalculatedOz]));
    const theoreticalMap = new Map(theoreticalSales.map(i => [i.brandId, i.theoreticalOz]));

    // Assert Titos
    const startTitos = startingMap.get('b1');
    const endTitos = endingMap.get('b1');
    const soldTitos = theoreticalMap.get('b1');
    const depletionTitos = startTitos - endTitos;
    const varianceTitos = depletionTitos - soldTitos;

    assert.strictEqual(startTitos, 169.07);
    assert.strictEqual(endTitos, 128.49);
    assert.strictEqual(soldTitos, 20.00);
    assert.ok(Math.abs(depletionTitos - 40.58) < 0.01);
    assert.ok(Math.abs(varianceTitos - 20.58) < 0.01);

    // Assert Bud Light
    const startBud = startingMap.get('b2');
    const endBud = endingMap.get('b2');
    const soldBud = theoreticalMap.get('b2');
    const depletionBud = startBud - endBud;
    const varianceBud = depletionBud - soldBud;

    assert.strictEqual(startBud, 480.00);
    assert.strictEqual(endBud, 180.00);
    assert.strictEqual(soldBud, 240.00);
    assert.strictEqual(depletionBud, 300.00);
    assert.strictEqual(varianceBud, 60.00);

    // Clean up test DB file handle
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    console.log('✅ Ingestion & Variance logic test passes!');
  });
});
