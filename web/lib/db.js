import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { decryptSync } from './jwt.js';
import { getTenantDb, tenantStorage } from './dbManager.js';

const require = createRequire(import.meta.url);

let masterDb = null;
const storeDbs = new Map();

// Helper to initialize tables that belong to a store database
function initializeStoreSchema(dbConn) {
  dbConn.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parentId TEXT,
      userId TEXT,
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
      imagePathBack TEXT,
      syncStatus TEXT DEFAULT 'pending', 
      lastSyncAttempt INTEGER,
      createdAt INTEGER,
      retailPrice REAL,
      FOREIGN KEY (categoryId) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS changelogs (
      id TEXT PRIMARY KEY,
      version TEXT,
      date TEXT,
      title TEXT,
      changes TEXT,
      createdAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS liquor_brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      category TEXT,
      specificGravity REAL DEFAULT 1.0,
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS liquor_variants (
      id TEXT PRIMARY KEY,
      brandId TEXT REFERENCES liquor_brands(id) ON DELETE CASCADE,
      sizeMl INTEGER,
      containerType TEXT,
      emptyWeightGrams REAL,
      fullWeightGrams REAL,
      cost REAL
    );

    CREATE TABLE IF NOT EXISTS pos_items (
      itemNum TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      amount REAL,
      numSold REAL,
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      posItemNum TEXT REFERENCES pos_items(itemNum) ON DELETE CASCADE,
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipeId TEXT REFERENCES recipes(id) ON DELETE CASCADE,
      brandId TEXT REFERENCES liquor_brands(id) ON DELETE CASCADE,
      pourSizeOz REAL
    );

    CREATE TABLE IF NOT EXISTS physical_counts (
      id TEXT PRIMARY KEY,
      countDate TEXT,
      status TEXT DEFAULT 'draft',
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS physical_count_items (
      id TEXT PRIMARY KEY,
      countId TEXT REFERENCES physical_counts(id) ON DELETE CASCADE,
      brandId TEXT REFERENCES liquor_brands(id) ON DELETE CASCADE,
      variantId TEXT REFERENCES liquor_variants(id) ON DELETE CASCADE,
      qtyRaw REAL,
      isWeighted INTEGER DEFAULT 0,
      qtyCalculatedOz REAL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Run alterations safely for store database
  try { dbConn.exec("ALTER TABLE items ADD COLUMN userId TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE categories ADD COLUMN userId TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN moviePlot TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN movieCast TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN movieTrailer TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toyBrand TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toyYear TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toyCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN valueLow REAL"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN valueAvg REAL"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN valueHigh REAL"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN coinCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN coinCertNumber TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN coinGradingAgency TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN cardCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN cardCertNumber TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN cardGradingAgency TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN comicCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN comicCertNumber TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN comicGradingAgency TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN comicPublisher TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN comicIssue TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN gradedCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN gradedCertNumber TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN gradedAgency TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN retailPrice REAL"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN imagePathBack TEXT"); } catch(e) {}

  // MIGRATION: Remove UNIQUE constraint from categories.name
  try {
    dbConn.exec(`
      PRAGMA foreign_keys=off;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS categories_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parentId TEXT,
        userId TEXT,
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
    try { dbConn.exec('ROLLBACK;'); } catch (rb) {}
  }

  // MIGRATION: Convert pos_items.itemNum to TEXT PRIMARY KEY to support UUIDs and preserve leading zeros
  try {
    dbConn.exec(`
      PRAGMA foreign_keys=off;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS pos_items_new (
        itemNum TEXT PRIMARY KEY,
        name TEXT,
        price REAL,
        amount REAL,
        numSold REAL,
        userId TEXT
      );
      INSERT OR IGNORE INTO pos_items_new SELECT CAST(itemNum AS TEXT), name, price, amount, numSold, userId FROM pos_items;
      DROP TABLE pos_items;
      ALTER TABLE pos_items_new RENAME TO pos_items;
      COMMIT;
      PRAGMA foreign_keys=on;
    `);
  } catch (e) {
    try { dbConn.exec('ROLLBACK;'); } catch (rb) {}
  }
}

// Master DB (contains users, sessions, settings, store_profiles)
export function getMasterDb() {
  if (!masterDb) {
    const dataPath = process.env.USER_DATA_PATH || process.cwd();
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    const dbPath = path.resolve(dataPath, 'inventory.db');
    masterDb = new Database(dbPath);

    // Initialize master tables
    masterDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        passwordHash TEXT,
        tier TEXT DEFAULT 'basic',
        activeTier TEXT DEFAULT 'basic',
        isAdmin INTEGER DEFAULT 0,
        isRoot INTEGER DEFAULT 0,
        serpApiKey TEXT,
        createdAt INTEGER,
        displayName TEXT,
        profilePicture TEXT,
        role TEXT DEFAULT 'staff',
        status TEXT DEFAULT 'active',
        twoFactorEnabled INTEGER DEFAULT 0,
        twoFactorSecret TEXT,
        recoveryCodes TEXT,
        verificationToken TEXT,
        verificationExpiresAt INTEGER,
        resetPasswordToken TEXT,
        resetPasswordExpiresAt INTEGER,
        storeId TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT REFERENCES users(id) ON DELETE CASCADE,
        expiresAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS store_profiles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE,
        createdAt INTEGER
      );
    `);

    // For backward compatibility, also initialize the store schema on the master DB
    initializeStoreSchema(masterDb);

    // Run alterations safely for master database
    try { masterDb.exec("ALTER TABLE users ADD COLUMN activeTier TEXT DEFAULT 'basic'"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN isRoot INTEGER DEFAULT 0"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN forcePasswordReset INTEGER DEFAULT 0"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN displayName TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN profilePicture TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff'"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN twoFactorSecret TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN recoveryCodes TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN verificationToken TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN verificationExpiresAt INTEGER"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN resetPasswordToken TEXT"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN resetPasswordExpiresAt INTEGER"); } catch(e) {}
    try { masterDb.exec("ALTER TABLE users ADD COLUMN storeId TEXT"); } catch(e) {}
  }
  return masterDb;
}

export function getStoreDb(storeId) {
  let storeDb = storeDbs.get(storeId);
  if (!storeDb) {
    const dataPath = process.env.USER_DATA_PATH || process.cwd();
    const storeDbPath = path.resolve(dataPath, `store_${storeId}.sqlite`);
    storeDb = new Database(storeDbPath);
    initializeStoreSchema(storeDb);
    storeDbs.set(storeId, storeDb);
  }
  return storeDb;
}

export async function getGlobalDb() {
  if (process.env.SAAS_MODE === 'true') {
    return await getDb();
  }
  return getMasterDb();
}

export async function getDb() {
  if (process.env.SAAS_MODE === 'true') {
    // 1. Resolve from AsyncLocalStorage first (useful for background context or overrides)
    const context = tenantStorage.getStore();
    if (context && context.tenantId) {
      return getTenantDb(context.tenantId);
    }

    // 2. Resolve from session cookie next (standard request lifecycle)
    try {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('session')?.value;
      if (sessionCookie) {
        const payload = decryptSync(sessionCookie);
        if (payload && payload.tenantId) {
          return getTenantDb(payload.tenantId);
        }
      }
    } catch (e) {
      // Ignore: cookies() throws when called outside of standard request lifecycles (e.g. at startup or inside tests)
      if (global.mockSessionCookie) {
        const payload = decryptSync(global.mockSessionCookie);
        if (payload && payload.tenantId) {
          return getTenantDb(payload.tenantId);
        }
      }
    }

    // 3. Fallback to default tenant (useful for development)
    const fallbackTenantId = process.env.DEFAULT_TENANT_ID;
    if (fallbackTenantId) {
      return getTenantDb(fallbackTenantId);
    }

    throw new Error('[db] getDb() was called in SaaS mode outside of an active tenant context.');
  }

  // Local mode:
  // 1. Check if the logged-in user is locked to a specific store
  try {
    const { cookies } = require('next/headers');
    const cookieStore = await cookies();
    
    // Check user session
    const sessionCookie = cookieStore.get('session')?.value;
    if (sessionCookie) {
      const payload = decryptSync(sessionCookie);
      if (payload && payload.userId) {
        const masterDb = getMasterDb();
        const userRow = masterDb.prepare('SELECT storeId, isAdmin, isRoot FROM users WHERE id = ?').get(payload.userId);
        if (userRow) {
          const userStoreId = userRow.storeId;
          const isAdminOrRoot = userRow.isAdmin === 1 || userRow.isRoot === 1;

          if (userStoreId && userStoreId !== 'default' && !isAdminOrRoot) {
            const allowedStores = userStoreId.split(',').map(s => s.trim()).filter(Boolean);
            if (allowedStores.length > 0) {
              const activeStoreId = cookieStore.get('active_store_id')?.value;
              if (activeStoreId && allowedStores.includes(activeStoreId)) {
                return getStoreDb(activeStoreId);
              }
              return getStoreDb(allowedStores[0]);
            }
          }
        }
      }
    }

    // 2. Otherwise fall back to the active store selection cookie
    const activeStoreId = cookieStore.get('active_store_id')?.value;
    if (activeStoreId && activeStoreId !== 'default') {
      return getStoreDb(activeStoreId);
    }
  } catch (e) {
    // Fallback outside request context or in tests
    if (global.mockActiveStoreId && global.mockActiveStoreId !== 'default') {
      return getStoreDb(global.mockActiveStoreId);
    }
  }

  // Fallback to default master database
  return getMasterDb();
}

export function closeDb() {
  if (masterDb) {
    try {
      masterDb.close();
    } catch (e) {}
    masterDb = null;
  }
  for (const [storeId, storeDb] of storeDbs.entries()) {
    try {
      storeDb.close();
    } catch (e) {}
  }
  storeDbs.clear();
}
