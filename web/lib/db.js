import './logger.js';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import { decryptSync } from './jwt.js';
import { getTenantDb, tenantStorage, getRegistryDb, closeAllConnections, syncChangelogs } from './dbManager.js';

const require = createRequire(import.meta.url);

let masterDb = null;
const storeDbs = new Map();
let lastTrialCheck = 0;
let lastDemoCheck = 0;
let isResetScheduled = false;

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
      purchasePrice REAL,
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

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      receiptNo TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerCheckoutId TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      isTraining INTEGER DEFAULT 0,
      createdAt INTEGER
    );
  `);

  // Run alterations safely for store database
  try { dbConn.exec("ALTER TABLE payment_transactions ADD COLUMN isTraining INTEGER DEFAULT 0"); } catch(e) {}
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
  try { dbConn.exec("ALTER TABLE items ADD COLUMN purchasePrice REAL"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicArtist TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicFormat TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicMatrixRunout TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicPressingYear INTEGER"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicPressingCountry TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicVinylWeight TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicMediaCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN musicSleeveCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN discogsReleaseId INTEGER"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareBrand TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareModel TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareSerial TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareType TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareFirmware TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareCondition TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareSpecs TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareCompat TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN hardwareSmartHealth TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolBrand TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolModel TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolSerial TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolWarrantyStatus TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolAssignedLocation TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN toolPurchaseDate TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN gameSystem TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE items ADD COLUMN movieFormat TEXT"); } catch(e) {}

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

  // Sync changelogs to database
  syncChangelogs(dbConn);
}

// Master DB schema initializer (extracted for re-usability during factory reset)
function initializeMasterSchema(dbConn) {
  dbConn.exec(`
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
      boothNumber TEXT,
      createdAt INTEGER
    );
  `);

  initializeStoreSchema(dbConn);

  // Run alterations safely for master database
  try { dbConn.exec("ALTER TABLE users ADD COLUMN activeTier TEXT DEFAULT 'basic'"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN isRoot INTEGER DEFAULT 0"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN forcePasswordReset INTEGER DEFAULT 0"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN displayName TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN profilePicture TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff'"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN twoFactorSecret TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN recoveryCodes TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN verificationToken TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN verificationExpiresAt INTEGER"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN resetPasswordToken TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN resetPasswordExpiresAt INTEGER"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE users ADD COLUMN storeId TEXT"); } catch(e) {}
  try { dbConn.exec("ALTER TABLE store_profiles ADD COLUMN boothNumber TEXT"); } catch(e) {}

  // Run booth number auto-assignment migration for unnumbered store profiles
  try {
    const unassigned = dbConn.prepare("SELECT id, createdAt FROM store_profiles WHERE boothNumber IS NULL ORDER BY createdAt ASC").all();
    if (unassigned.length > 0) {
      const maxRow = dbConn.prepare("SELECT MAX(CAST(boothNumber AS INTEGER)) as maxNum FROM store_profiles WHERE boothNumber IS NOT NULL").get();
      let startNum = (maxRow && maxRow.maxNum) ? maxRow.maxNum : 0;
      
      for (const store of unassigned) {
        startNum++;
        const formatted = String(startNum).padStart(3, '0');
        dbConn.prepare("UPDATE store_profiles SET boothNumber = ? WHERE id = ?").run(formatted, store.id);
        console.log(`[Migration] Auto-assigned booth number ${formatted} to store ${store.id}`);
      }
    }
  } catch (e) {
    console.error('Error running booth number migration:', e);
  }
}

// Master DB (contains users, sessions, settings, store_profiles)
export function getMasterDb() {
  const dataPath = process.env.USER_DATA_PATH || process.cwd();
  const dbPath = path.resolve(dataPath, 'inventory.db');

  if (!masterDb) {
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    masterDb = new Database(dbPath);
    initializeMasterSchema(masterDb);
    scheduleMidnightReset();
  }

  const now = Date.now();

  // 1. Throttled Trial Expiration Check (Self-Destruct) - Runs once every minute (or always in tests)
  if (process.env.NODE_ENV === 'test' || now - lastTrialCheck > 60 * 1000) {
    lastTrialCheck = now;
    
    let isExpired = false;
    try {
      const rowKey = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'license_key'").get();
      const rowTime = masterDb.prepare("SELECT value FROM system_settings WHERE key = 'license_activated_at'").get();
      if (rowKey && rowKey.value) {
        const keyVal = rowKey.value;
        if (keyVal.startsWith('TRIA-') || keyVal.startsWith('TR5M-')) {
          if (rowTime && rowTime.value) {
            const activatedAt = parseInt(rowTime.value, 10);
            const duration = keyVal.startsWith('TR5M-')
              ? 5 * 60 * 1000 // 5 minutes
              : 7 * 24 * 60 * 60 * 1000; // 7 days
              
            if (now > activatedAt + duration) {
              isExpired = true;
            }
          }
        }
      }
    } catch (e) {
      // Ignored
    }

    if (isExpired) {
      resetToFactorySettings(masterDb);
      masterDb = null;
      
      masterDb = new Database(dbPath);
      initializeMasterSchema(masterDb);
    }
  }

  // 2. Throttled Demo Mode Reset Check - Runs once every minute (or always in tests)
  if (process.env.DEMO_MODE === 'true') {
    if (process.env.NODE_ENV === 'test' || now - lastDemoCheck > 60 * 1000) {
      lastDemoCheck = now;
      try {
        checkAndResetIfNeeded();
      } catch (e) {
        console.error('[demo] Throttled reset check failed:', e);
      }
    }
  }

  return masterDb;
}

// Helper to wipe all data from a database connection (used during factory reset/self-destruct)
function wipeDatabaseData(dbConn) {
  try {
    dbConn.exec('PRAGMA foreign_keys = OFF');
    const tables = dbConn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    dbConn.exec('BEGIN TRANSACTION');
    for (const table of tables) {
      dbConn.prepare(`DELETE FROM "${table.name}"`).run();
    }
    dbConn.exec('COMMIT');
  } catch (e) {
    console.error('[trial] Error during database wipe:', e);
    try { dbConn.exec('ROLLBACK'); } catch (_) {}
  } finally {
    try { dbConn.exec('PRAGMA foreign_keys = ON'); } catch (_) {}
    try { dbConn.exec('VACUUM'); } catch (_) {}
  }
}

// Resets the local system entirely back to "factory settings" (Setup Wizard)
export function resetToFactorySettings(activeMasterDb = null) {
  console.log('[trial] Trial key has expired. Performing self-destruct / factory reset...');
  
  // 1. Wipe the master database connection first to guarantee immediate data removal
  const dbToWipe = activeMasterDb || masterDb;
  if (dbToWipe) {
    try {
      wipeDatabaseData(dbToWipe);
      console.log('[trial] Successfully wiped master DB tables.');
    } catch (e) {
      console.error('[trial] Failed to wipe master DB tables:', e);
    }
  }

  // 2. Close all database connections
  closeDb();
  if (process.env.SAAS_MODE === 'true') {
    try {
      closeAllConnections();
    } catch (e) {
      console.error('[trial] Failed to close SaaS connections:', e);
    }
  }
  
  const dataPath = process.env.USER_DATA_PATH || process.cwd();
  
  // 3. Try to delete the master database file (cleanup attempt)
  const masterDbPath = path.resolve(dataPath, 'inventory.db');
  if (fs.existsSync(masterDbPath)) {
    try {
      fs.unlinkSync(masterDbPath);
      console.log(`[trial] Deleted master DB: ${masterDbPath}`);
    } catch (e) {
      console.warn(`[trial] Could not delete master DB file (resource busy), but all data tables were wiped.`);
    }
  }
  
  // 4. Close and delete any custom store SQLite databases
  try {
    const files = fs.readdirSync(dataPath);
    for (const file of files) {
      if (file.startsWith('store_') && file.endsWith('.sqlite')) {
        const storeDbPath = path.resolve(dataPath, file);
        try {
          fs.unlinkSync(storeDbPath);
          console.log(`[trial] Deleted store DB: ${storeDbPath}`);
        } catch (e) {
          // Fallback: open and wipe it
          try {
            const tempDb = new Database(storeDbPath);
            wipeDatabaseData(tempDb);
            tempDb.close();
            console.log(`[trial] Wiped store DB data: ${storeDbPath} (could not delete file)`);
          } catch (wipeErr) {
            console.error(`[trial] Failed to wipe store DB ${storeDbPath}:`, wipeErr);
          }
        }
      }
    }
  } catch (e) {
    console.error('[trial] Failed to list/delete store databases:', e);
  }

  // 5. Delete tenants subdirectory if in SaaS mode
  if (process.env.SAAS_MODE === 'true') {
    const tenantsDir = path.resolve(dataPath, 'tenants');
    if (fs.existsSync(tenantsDir)) {
      try {
        fs.rmSync(tenantsDir, { recursive: true, force: true });
        console.log(`[trial] Deleted tenants directory: ${tenantsDir}`);
      } catch (e) {
        console.error('[trial] Failed to delete tenants directory:', e);
      }
    }
  }
}

// Resets cloud demo databases and files, keeping only the initial root admin account/tenant intact
export function performMidnightReset() {
  console.log('[demo] Performing scheduled daily midnight reset...');
  const dataPath = process.env.USER_DATA_PATH || process.cwd();
  
  if (process.env.SAAS_MODE !== 'true') {
    // Local-first mode demo reset: wipes tables but keeps the very first user intact
    try {
      const db = getMasterDb();
      const firstUser = db.prepare('SELECT id FROM users ORDER BY createdAt ASC LIMIT 1').get();
      if (firstUser) {
        db.prepare('DELETE FROM users WHERE id != ?').run(firstUser.id);
        db.prepare('DELETE FROM sessions').run();
        db.prepare('DELETE FROM items').run();
        db.prepare('DELETE FROM categories').run();
        db.prepare('DELETE FROM pos_items').run();
        db.prepare('DELETE FROM recipes').run();
        db.prepare('DELETE FROM recipe_ingredients').run();
        db.prepare('DELETE FROM physical_counts').run();
        db.prepare('DELETE FROM physical_count_items').run();
        db.prepare('DELETE FROM store_profiles').run();
        
        // Also wipe all uploaded items files
        const uploadsDir = path.resolve(dataPath, 'uploads');
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          for (const file of files) {
            if (file === 'debug_latest.zip') continue;
            const filePath = path.resolve(uploadsDir, file);
            try {
              if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
              }
            } catch (e) {}
          }
        }
        console.log('[demo] Local mode demo data wiped successfully, keeping first user.');
      }
    } catch (e) {
      console.error('[demo] Failed to reset local database:', e);
    }
    return;
  }

  // SaaS Cloud-Hosted Mode Reset
  try {
    const rdb = getRegistryDb();
    if (!rdb) return;
    
    // Find initial tenant
    const initialTenant = rdb.prepare('SELECT tenant_id, email FROM tenant_registry ORDER BY createdAt ASC LIMIT 1').get();
    const initialTenantId = initialTenant?.tenant_id;
    const initialTenantEmail = initialTenant?.email;
    
    console.log(`[demo] Initial tenant to preserve: ${initialTenantId} (${initialTenantEmail})`);
    
    // Gather all image filenames that are referenced by the preserved initial tenant
    const preservedFiles = new Set();
    if (initialTenantId) {
      try {
        const tenantDb = getTenantDb(initialTenantId);
        const items = tenantDb.prepare('SELECT imagePath, imagePathBack FROM items').all();
        items.forEach(item => {
          if (item.imagePath) {
            if (item.imagePath.includes('/api/file/')) {
              preservedFiles.add(item.imagePath.split('/').pop());
            } else if (item.imagePath.includes('/uploads/')) {
              preservedFiles.add(item.imagePath.split('/').pop());
            }
          }
          if (item.imagePathBack) {
            if (item.imagePathBack.includes('/api/file/')) {
              preservedFiles.add(item.imagePathBack.split('/').pop());
            } else if (item.imagePathBack.includes('/uploads/')) {
              preservedFiles.add(item.imagePathBack.split('/').pop());
            }
          }
        });
        
        // Also find any profile picture for the preserved tenant's users
        const users = tenantDb.prepare('SELECT profilePicture FROM users WHERE profilePicture IS NOT NULL').all();
        users.forEach(u => {
          preservedFiles.add(u.profilePicture);
        });
      } catch (e) {
        console.error('[demo] Failed to scan initial tenant DB for preserved files:', e);
      }
    }

    // 1. Close all active cached database connections
    closeAllConnections();
    
    // 2. Iterate and delete all tenant database files except the initial one
    const tenantsDir = path.resolve(dataPath, 'tenants');
    if (fs.existsSync(tenantsDir)) {
      const files = fs.readdirSync(tenantsDir);
      for (const file of files) {
        if (file.startsWith('tenant_') && file.endsWith('.sqlite')) {
          const expectedInitialFile = `tenant_${initialTenantId}.sqlite`;
          if (initialTenantId && file === expectedInitialFile) {
            continue; // Preserve initial tenant
          }
          
          const filePath = path.resolve(tenantsDir, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`[demo] Deleted tenant DB: ${filePath}`);
          } catch (e) {
            console.error(`[demo] Failed to delete tenant file ${filePath}:`, e);
          }
        }
      }
    }
    
    // 3. Clear non-initial entries from the registry table
    const rdbNew = getRegistryDb(); // reopen
    if (initialTenantId) {
      rdbNew.prepare('DELETE FROM tenant_registry WHERE tenant_id != ?').run(initialTenantId);
    } else {
      rdbNew.prepare('DELETE FROM tenant_registry').run();
    }
    
    // 4. Clean up the uploads directory, preserving only files referenced by the initial tenant
    const uploadsDir = path.resolve(dataPath, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        for (const file of files) {
          if (preservedFiles.has(file) || file === 'debug_latest.zip') {
            continue; // Keep initial tenant's files and debug ZIP
          }
          const filePath = path.resolve(uploadsDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
              fs.unlinkSync(filePath);
              console.log(`[demo] Deleted unreferenced upload file: ${filePath}`);
            }
          } catch (e) {
            console.error(`[demo] Failed to delete uploaded file ${filePath}:`, e);
          }
        }
      } catch (e) {
        console.error('[demo] Failed to clean up uploads directory:', e);
      }
    }

    console.log('[demo] SaaS midnight reset completed successfully.');
  } catch (e) {
    console.error('[demo] Error during midnight reset:', e);
  }
}

// Verification checks and logic to reset daily testing database contexts
export function checkAndResetIfNeeded() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`; // YYYY-MM-DD local time
  
  let lastResetDate = null;
  if (process.env.SAAS_MODE === 'true') {
    try {
      const rdb = getRegistryDb();
      if (rdb) {
        rdb.exec(`CREATE TABLE IF NOT EXISTS registry_settings (key TEXT PRIMARY KEY, value TEXT)`);
        const row = rdb.prepare("SELECT value FROM registry_settings WHERE key = 'last_reset_date'").get();
        lastResetDate = row ? row.value : null;
      }
    } catch (e) {
      console.error('[demo] Failed to read last_reset_date from registry:', e);
    }
  } else {
    try {
      const db = getMasterDb();
      const row = db.prepare("SELECT value FROM system_settings WHERE key = 'last_reset_date'").get();
      lastResetDate = row ? row.value : null;
    } catch (e) {
      // Table might not exist yet during startup setup
    }
  }

  // If lastResetDate is not today, we perform the reset!
  if (lastResetDate !== todayStr) {
    // Write new reset date first to prevent infinite loop triggers
    if (process.env.SAAS_MODE === 'true') {
      try {
        const rdb = getRegistryDb();
        if (rdb) {
          rdb.prepare("INSERT OR REPLACE INTO registry_settings (key, value) VALUES ('last_reset_date', ?)")
            .run(todayStr);
        }
      } catch (e) {}
    } else {
      try {
        const db = getMasterDb();
        db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('last_reset_date', ?)")
          .run(todayStr);
      } catch (e) {}
    }

    performMidnightReset();
  }
}

// Scheduled check interval initialization
export function scheduleMidnightReset() {
  if (process.env.DEMO_MODE !== 'true') return;
  if (isResetScheduled) return;
  isResetScheduled = true;
  console.log('[demo] Daily midnight reset scheduler initialized.');
  
  // Check every 10 minutes
  const interval = setInterval(() => {
    try {
      checkAndResetIfNeeded();
    } catch (e) {
      console.error('[demo] Scheduled reset check failed:', e);
    }
  }, 10 * 60 * 1000);

  if (interval.unref) {
    interval.unref();
  }
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
        if (payload.userId === 'support-admin-session') {
          const activeStoreId = cookieStore.get('active_store_id')?.value;
          if (activeStoreId && activeStoreId !== 'default') {
            return getStoreDb(activeStoreId);
          }
          return getMasterDb();
        }
        const masterDb = getMasterDb();
        const userRow = masterDb.prepare('SELECT storeId, isAdmin, isRoot FROM users WHERE id = ?').get(payload.userId);
        if (userRow) {
          const userStoreId = userRow.storeId;

          if (userStoreId && userStoreId !== 'default' && userRow.isRoot !== 1 && userRow.isAdmin !== 1) {
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
