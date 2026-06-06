import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

// AsyncLocalStorage context to propagate tenant IDs within asynchronous execution paths
export const tenantStorage = new AsyncLocalStorage();

// Cache for active tenant database connections
// Key: tenantId, Value: { db: Database, lastAccess: number }
const dbCache = new Map();

// Timer to clean up idle database connections (e.g. older than 5 minutes)
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let cleanupInterval = null;

function startCleanupTimer() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [tenantId, entry] of dbCache.entries()) {
      if (now - entry.lastAccess > IDLE_TIMEOUT_MS) {
        console.log(`[dbManager] Closing idle database connection for tenant: ${tenantId}`);
        try {
          entry.db.close();
        } catch (e) {
          console.error(`[dbManager] Error closing database for tenant ${tenantId}:`, e);
        }
        dbCache.delete(tenantId);
      }
    }
    if (dbCache.size === 0) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 60 * 1000); // Check every minute
}

export function getTenantDbPath(tenantId) {
  const dataPath = process.env.USER_DATA_PATH || process.cwd();
  // Safe filename sanitization
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  return path.resolve(dataPath, 'tenants', `tenant_${safeTenantId}.sqlite`);
}

// Master registry path
export function getRegistryDbPath() {
  const dataPath = process.env.USER_DATA_PATH || process.cwd();
  return path.resolve(dataPath, 'tenants', 'registry.sqlite');
}

let registryDb = null;
export function getRegistryDb() {
  // If not in SaaS mode, there is no registry database needed
  if (process.env.SAAS_MODE !== 'true') return null;
  
  if (!registryDb) {
    const registryPath = getRegistryDbPath();
    const dir = path.dirname(registryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    registryDb = new Database(registryPath);
    registryDb.exec(`
      CREATE TABLE IF NOT EXISTS tenant_registry (
        email TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        createdAt INTEGER
      )
    `);
  }
  return registryDb;
}

export function registerTenantUser(email, tenantId) {
  const rdb = getRegistryDb();
  if (!rdb) return;
  const normalizedEmail = email.toLowerCase().trim();
  rdb.prepare(`
    INSERT INTO tenant_registry (email, tenant_id, createdAt)
    VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET tenant_id = excluded.tenant_id
  `).run(normalizedEmail, tenantId, Date.now());
}

export function resolveTenantIdByEmail(email) {
  const rdb = getRegistryDb();
  if (!rdb) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const row = rdb.prepare('SELECT tenant_id FROM tenant_registry WHERE email = ?').get(normalizedEmail);
  return row ? row.tenant_id : null;
}

// Initialize database schema for a tenant database
export function initializeSchema(db) {
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
      resetPasswordExpiresAt INTEGER
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
      imagePathBack TEXT,
      syncStatus TEXT DEFAULT 'pending',
      lastSyncAttempt INTEGER,
      createdAt INTEGER,
      FOREIGN KEY (categoryId) REFERENCES categories (id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );

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

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      userId TEXT REFERENCES users(id) ON DELETE CASCADE,
      expiresAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS liquor_brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      category TEXT,
      specificGravity REAL DEFAULT 1.0,
      userId TEXT REFERENCES users(id) ON DELETE CASCADE
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
      itemNum INTEGER PRIMARY KEY,
      name TEXT,
      price REAL,
      amount REAL,
      numSold REAL,
      userId TEXT REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      posItemNum REFERENCES pos_items(itemNum) ON DELETE CASCADE,
      userId TEXT REFERENCES users(id) ON DELETE CASCADE
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
      userId TEXT REFERENCES users(id) ON DELETE CASCADE
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
  `);

  // safe alterations
  const columnsToAdd = [
    { table: 'items', col: 'moviePlot TEXT' },
    { table: 'items', col: 'movieCast TEXT' },
    { table: 'items', col: 'movieTrailer TEXT' },
    { table: 'items', col: 'toyBrand TEXT' },
    { table: 'items', col: 'toyYear TEXT' },
    { table: 'items', col: 'toyCondition TEXT' },
    { table: 'items', col: 'valueLow REAL' },
    { table: 'items', col: 'valueAvg REAL' },
    { table: 'items', col: 'valueHigh REAL' },
    { table: 'items', col: 'coinCondition TEXT' },
    { table: 'items', col: 'coinCertNumber TEXT' },
    { table: 'items', col: 'coinGradingAgency TEXT' },
    { table: 'items', col: 'cardCondition TEXT' },
    { table: 'items', col: 'cardCertNumber TEXT' },
    { table: 'items', col: 'cardGradingAgency TEXT' },
    { table: 'items', col: 'comicCondition TEXT' },
    { table: 'items', col: 'comicCertNumber TEXT' },
    { table: 'items', col: 'comicGradingAgency TEXT' },
    { table: 'items', col: 'comicPublisher TEXT' },
    { table: 'items', col: 'comicIssue TEXT' },
    { table: 'items', col: 'gradedCondition TEXT' },
    { table: 'items', col: 'gradedCertNumber TEXT' },
    { table: 'items', col: 'gradedAgency TEXT' }
  ];

  for (const item of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col}`);
    } catch (e) {
      // Column already exists, ignore safely
    }
  }

  // Seed initial changelogs if table is empty
  try {
    const changelogCount = db.prepare("SELECT COUNT(*) as count FROM changelogs").get().count;
    if (changelogCount === 0) {
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
  } catch (err) {
    console.error('[dbManager] Changelog seeding failed:', err);
  }
}

// Retreive database for a specific tenant
export function getTenantDb(tenantId) {
  if (!tenantId) {
    throw new Error('Tenant ID is required to open a database connection in SaaS mode');
  }

  // Safe tenant ID sanitization
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeTenantId) {
    throw new Error('Invalid Tenant ID format');
  }

  let cacheEntry = dbCache.get(safeTenantId);
  if (cacheEntry) {
    cacheEntry.lastAccess = Date.now();
    return cacheEntry.db;
  }

  const dbPath = getTenantDbPath(safeTenantId);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[dbManager] Dynamic DB open: tenant: ${safeTenantId} at ${dbPath}`);
  const db = new Database(dbPath);
  initializeSchema(db);

  dbCache.set(safeTenantId, {
    db,
    lastAccess: Date.now()
  });

  startCleanupTimer();

  return db;
}

// Function to close all active cached connections (useful for tests or server shutdown)
export function closeAllConnections() {
  for (const [tenantId, entry] of dbCache.entries()) {
    try {
      entry.db.close();
    } catch (e) {
      // ignore errors
    }
  }
  dbCache.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  if (registryDb) {
    try {
      registryDb.close();
    } catch (e) {}
    registryDb = null;
  }
}
