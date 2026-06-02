import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { decryptSync } from './jwt.js';
import { getTenantDb, tenantStorage } from './dbManager.js';

const require = createRequire(import.meta.url);

let db = null;

export function getDb() {
  if (process.env.SAAS_MODE === 'true') {
    // 1. Resolve from AsyncLocalStorage first (useful for background context or overrides)
    const context = tenantStorage.getStore();
    if (context && context.tenantId) {
      return getTenantDb(context.tenantId);
    }

    // 2. Resolve from session cookie next (standard request lifecycle)
    try {
      const { cookies } = require('next/headers');
      const cookieStore = cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        const payload = decryptSync(sessionCookie);
        if (payload && payload.tenantId) {
          return getTenantDb(payload.tenantId);
        }
      }
    } catch (e) {
      // Ignore: cookies() throws when called outside of standard request lifecycles (e.g. at startup or inside tests)
    }

    // 3. Fallback to default tenant (useful for development)
    const fallbackTenantId = process.env.DEFAULT_TENANT_ID;
    if (fallbackTenantId) {
      return getTenantDb(fallbackTenantId);
    }

    throw new Error('[db] getDb() was called in SaaS mode outside of an active tenant context.');
  }

  if (!db) {
    // Determine the database file path
    const dataPath = process.env.USER_DATA_PATH || process.cwd();
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    const dbPath = path.resolve(dataPath, 'inventory.db');
    db = new Database(dbPath);
    
    // Initialize schema if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        userId TEXT,
        itemType TEXT DEFAULT 'standard',
        barcode TEXT,
        name TEXT,
        imagePath TEXT,
        imagePathBack TEXT,
        description TEXT,
        categoryId TEXT,
        createdAt INTEGER,
        syncStatus TEXT DEFAULT 'completed',
        lastSyncAttempt INTEGER,
        comicCondition TEXT,
        comicCertNumber TEXT,
        comicGradingAgency TEXT,
        comicPublisher TEXT,
        comicIssue TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        passwordHash TEXT,
        tier TEXT DEFAULT 'basic',
        activeTier TEXT DEFAULT 'basic',
        isAdmin INTEGER DEFAULT 0,
        isRoot INTEGER DEFAULT 0,
        serpApiKey TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        userId TEXT REFERENCES users(id) ON DELETE CASCADE,
        createdAt INTEGER,
        FOREIGN KEY (parentId) REFERENCES categories (id)
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
        syncStatus TEXT DEFAULT 'pending', 
        lastSyncAttempt INTEGER,
        createdAt INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories (id),
        FOREIGN KEY (userId) REFERENCES users (id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS changelogs (
        id TEXT PRIMARY KEY,
        version TEXT,
        date TEXT,
        title TEXT,
        changes TEXT,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

  // Run migrations/seeders if necessary
  if (!global.dbMigrationsRun) {
    global.dbMigrationsRun = true;
    
    // Seed initial changelogs if table is empty
    const changelogCount = db.prepare("SELECT COUNT(*) as count FROM changelogs").get().count;
    if (changelogCount === 0) {
      const crypto = require('crypto');
      const seedData = [
        {
          version: 'Beta 1.0', date: 'May 29, 2026', title: 'Initial Beta Release',
          changes: JSON.stringify([{ type: 'web', text: 'Officially entered Beta 1.0 phase.' }])
        },
        {
          version: 'Pre-Beta version 0.020', date: 'May 29, 2026', title: 'Admin Infrastructure & Security',
          changes: JSON.stringify([
            { type: 'web', text: 'Built the Admin Control Panel for managing user subscription roles.' },
            { type: 'web', text: 'Implemented self-bootstrapping registration to automatically secure the ecosystem.' },
            { type: 'web', text: 'Separated active tier from subscription role, allowing Premium users to toggle engines freely.' }
          ])
        },
        {
          version: 'Pre-Beta version 0.017', date: 'May 28, 2026', title: 'Specialized Capture & Premium AI Integrations',
          changes: JSON.stringify([
            { type: 'mobile', text: 'Added Coin Mode and Toy Mode for specialized capture logic.' },
            { type: 'web', text: 'Integrated Numista API for hyper-accurate numismatic coin identification.' },
            { type: 'web', text: 'Integrated SerpApi Google Lens for highly accurate premium visual matches.' }
          ])
        },
        {
          version: 'Pre-Beta version 0.014', date: 'May 27, 2026', title: 'The Beta Polish & Organization',
          changes: JSON.stringify([
            { type: 'mobile', text: 'Added visual scan verification with "Accept" and "Discard" controls.' },
            { type: 'web', text: 'Implemented an infinite-depth Subcategory system.' },
            { type: 'web', text: 'Built Advanced Search capabilities and category filtering.' },
            { type: 'web', text: 'Upgraded the Google Vision integration to scrape text and logos directly from box art.' },
            { type: 'web', text: 'Added a global sticky navigation header with version tracking.' }
          ])
        },
        {
          version: 'Alpha version 0.009', date: 'May 26, 2026', title: 'AI Integrations & Rate Limits',
          changes: JSON.stringify([
            { type: 'web', text: 'Integrated the UPCItemDB API for automated metadata lookups.' },
            { type: 'web', text: 'Built a failover pipeline utilizing Google Cloud Vision API for fallback image analysis.' },
            { type: 'web', text: 'Implemented smart retry queues to handle API rate limiting smoothly.' }
          ])
        },
        {
          version: 'Alpha version 0.006', date: 'May 25, 2026', title: 'Details & Async Processing',
          changes: JSON.stringify([
            { type: 'web', text: 'Built the dedicated Item Details page with barcode generation.' },
            { type: 'web', text: 'Migrated API requests to a background worker script to prevent server timeouts.' },
            { type: 'mobile', text: 'Added the Export Screen with ZIP generation for transferring scans to the dashboard.' }
          ])
        },
        {
          version: 'Alpha version 0.003', date: 'May 24, 2026', title: 'The Foundation',
          changes: JSON.stringify([
            { type: 'mobile', text: 'Created the React Native scanner app with queue functionality.' },
            { type: 'web', text: 'Initialized the Next.js dashboard and SQLite database structure.' },
            { type: 'web', text: 'Implemented the ZIP upload parser for syncing mobile scans to the server.' }
          ])
        }
      ];

      const insertStmt = db.prepare('INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
      seedData.reverse().forEach((item, index) => {
        insertStmt.run(crypto.randomUUID(), item.version, item.date, item.title, item.changes, Date.now() + index * 1000);
      });
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT REFERENCES users(id) ON DELETE CASCADE,
        expiresAt INTEGER
      )
    `);

    try {
      db.exec("ALTER TABLE items ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE categories ADD COLUMN userId TEXT REFERENCES users(id) ON DELETE CASCADE");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE users ADD COLUMN activeTier TEXT DEFAULT 'basic'");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE users ADD COLUMN isRoot INTEGER DEFAULT 0");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN moviePlot TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN movieCast TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN movieTrailer TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN toyBrand TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN toyYear TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN toyCondition TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN valueLow REAL");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN valueAvg REAL");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN valueHigh REAL");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN coinCondition TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN coinCertNumber TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN coinGradingAgency TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN cardCondition TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN cardCertNumber TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN cardGradingAgency TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN comicCondition TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN comicCertNumber TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN comicGradingAgency TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN comicPublisher TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN comicIssue TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN gradedCondition TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN gradedCertNumber TEXT");
    } catch(e) {}
    try {
      db.exec("ALTER TABLE items ADD COLUMN gradedAgency TEXT");
    } catch(e) {}



    // MIGRATION: Remove UNIQUE constraint from categories.name
    try {
      // Check if we need to migrate (we'll just safely rebuild it once per server boot to strip any hidden constraints)
      db.exec(`
        PRAGMA foreign_keys=off;
        BEGIN TRANSACTION;
        CREATE TABLE categories_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parentId TEXT,
          userId TEXT REFERENCES users(id) ON DELETE CASCADE,
          createdAt INTEGER,
          FOREIGN KEY (parentId) REFERENCES categories (id)
        );
        INSERT INTO categories_new SELECT id, name, parentId, userId, createdAt FROM categories;
        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;
        COMMIT;
        PRAGMA foreign_keys=on;
      `);
    } catch (e) {
      console.error('Category Migration Error:', e);
      // rollback if transaction failed
      try { db.exec('ROLLBACK;'); } catch (rb) {}
    }

  }
  
  }
  
  return db;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (e) {}
    db = null;
  }
}
