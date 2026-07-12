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
      purchasePrice REAL,
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

  // safe alterations
  const columnsToAdd = [
    { table: 'payment_transactions', col: 'isTraining INTEGER DEFAULT 0' },
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
    { table: 'items', col: 'gradedAgency TEXT' },
    { table: 'items', col: 'purchasePrice REAL' },
    { table: 'items', col: 'musicArtist TEXT' },
    { table: 'items', col: 'musicFormat TEXT' },
    { table: 'items', col: 'musicMatrixRunout TEXT' },
    { table: 'items', col: 'musicPressingYear INTEGER' },
    { table: 'items', col: 'musicPressingCountry TEXT' },
    { table: 'items', col: 'musicVinylWeight TEXT' },
    { table: 'items', col: 'musicMediaCondition TEXT' },
    { table: 'items', col: 'musicSleeveCondition TEXT' },
    { table: 'items', col: 'discogsReleaseId INTEGER' },
    { table: 'items', col: 'hardwareBrand TEXT' },
    { table: 'items', col: 'hardwareModel TEXT' },
    { table: 'items', col: 'hardwareSerial TEXT' },
    { table: 'items', col: 'hardwareType TEXT' },
    { table: 'items', col: 'hardwareFirmware TEXT' },
    { table: 'items', col: 'hardwareCondition TEXT' },
    { table: 'items', col: 'hardwareSpecs TEXT' },
    { table: 'items', col: 'hardwareCompat TEXT' },
    { table: 'items', col: 'hardwareSmartHealth TEXT' },
    { table: 'items', col: 'toolBrand TEXT' },
    { table: 'items', col: 'toolModel TEXT' },
    { table: 'items', col: 'toolSerial TEXT' },
    { table: 'items', col: 'toolWarrantyStatus TEXT' },
    { table: 'items', col: 'toolAssignedLocation TEXT' },
    { table: 'items', col: 'toolPurchaseDate TEXT' }
  ];

  for (const item of columnsToAdd) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col}`);
    } catch (e) {
      // Column already exists, ignore safely
    }
  }

  // Sync changelogs to database
  syncChangelogs(db);
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

// Master seed data for changelogs (unified layout)
const seedData = [
  {
    version: 'Beta 1.9.2', date: 'July 12, 2026', title: 'Widescreen Tablet Register, Dynamic QR Payments, Cloud Sync Tunnels, & ESC/POS Direct Printing',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented optimized Countertop Tablet POS Register Layout with collapsible config accordions and responsive tactile catalog grids.' },
      { type: 'web', text: 'Added interactive Touch Cart sidebar in Tablet Mode replacing static receipt previews with touch-friendly qty modifiers.' },
      { type: 'web', text: 'Implemented ESC/POS direct print controller (escposEncoder.js) translating checkout detail objects to raw command bytes.' },
      { type: 'web', text: 'Implemented raw TCP socket print stream connection to network POS receipt devices on Port 9100.' },
      { type: 'web', text: 'Added settings profiles for WebUSB and network direct receipt thermal printers, with cash drawer kick and paper cut options.' },
      { type: 'web', text: 'Added dynamic Scan-To-Pay QR code generation modal supporting Venmo deep-links and PayPal checkouts.' },
      { type: 'web', text: 'Implemented cloudflared daemon spawner (tunnelManager.js) automating dynamic remote sync subdomain connection in a single click.' },
      { type: 'web', text: 'Added simulated offline Training Mode running practice checkouts with isolated tables and realistic 3s delay timers.' }
    ])
  },
  {
    version: 'Beta 1.9.01', date: 'July 9, 2026', title: 'Secure License Offline Verification',
    changes: JSON.stringify([
      { type: 'web', text: 'Secured the offline license verification algorithm by requiring LICENSE_SALT environment variables.' },
      { type: 'web', text: 'Created local keygen utility keygen.mjs gitignored from GitHub.' }
    ])
  },
  {
    version: 'Beta 1.9.0', date: 'July 2, 2026', title: 'Music, Retro Tech, & Tools Inventory Modules',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented general Music Archives module supporting Vinyl records, Cassettes, CDs, and 8-Tracks with Discogs API integration.' },
      { type: 'web', text: 'Implemented Retro Computing & Hardware Archives module with automatic CPU-World, EveryMac, and TechPowerUp web spec parsing.' },
      { type: 'web', text: 'Implemented Tools & Workshop Inventory module supporting brand tracking, warranty statuses, and assigned locations.' },
      { type: 'mobile', text: 'Added Music, Retro Tech, and Tools modes to the handheld scanner app dropdown selector.' },
      { type: 'web', text: 'Added settings support for custom Discogs API tokens in admin dashboard.' },
      { type: 'web', text: 'Added automated tests for all three new inventory synchronization modules, achieving 100% test coverage.' }
    ])
  },
  {
    version: 'Beta 1.8.9', date: 'July 1, 2026', title: 'TMDB Removal & Commercial-Safe Metadata Resolution',
    changes: JSON.stringify([
      { type: 'web', text: 'Completely removed TMDB API integration to eliminate commercial licensing restrictions.' },
      { type: 'web', text: 'Implemented keyless, commercial-safe movie plot and cover image lookups using the Wikipedia MediaWiki API.' },
      { type: 'web', text: 'Implemented keyless YouTube movie trailer lookups using SearXNG/Google CSE search scraping.' },
      { type: 'web', text: 'Cleaned up Settings panel UI and API routes by removing TMDB configuration fields.' },
      { type: 'web', text: 'Added a dedicated unit test suite for Wikipedia and YouTube metadata resolution.' },
      { type: 'web', text: 'Bumped version to 1.8.9 and packaged the native Electron installer.' }
    ])
  },
  {
    version: 'Beta 1.8.8', date: 'June 29, 2026', title: 'Category Valuation Reports & SerpApi Quota Protections',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented dynamic category-specific valuation calculating on homepage stats badge.' },
      { type: 'web', text: 'Added query-parameter filtering to Valuation Report API, resolving nested subcategories recursively.' },
      { type: 'web', text: 'Designed category filter banner on the Valuation page with an interactive close-reset toggle.' },
      { type: 'web', text: 'Completely disabled SerpApi pricing fallbacks, forcing all price lookups to run on Google CSE for quota protection.' },
      { type: 'web', text: 'Fixed TMDB API Key resolution bug that caused movie metadata imports to bypass TMDB.' },
      { type: 'web', text: 'Bumped version to 1.8.8 and compiled + published Electron native app installer to GitHub releases.' }
    ])
  },
  {
    version: 'Beta 1.8.7', date: 'June 27, 2026', title: 'Google Custom Search Quota Safety & Rate Limiting',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented Google CSE 403 (restricted key) and 429 (quota exceeded) error handling.' },
      { type: 'web', text: 'Added queue safety pause that automatically halts background worker queue and marks remaining items as rate-limited.' },
      { type: 'web', text: 'Added regression tests to verify rate-limiting worker queue state persistence.' }
    ])
  },
  {
    version: 'Beta 1.8.6', date: 'June 25, 2026', title: 'Cryptographic Remote Support Tokens & Security Hardening',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented NIST P-256 (ECDSA ES256) asymmetric support token verification in the backend APIs.' },
      { type: 'web', text: 'Added secure virtual session routing for Remote Support Admins, bypassing database user queries.' },
      { type: 'web', text: 'Designed and built a premium glassmorphic Support Portal showing local Machine IDs and copyable tokens.' },
      { type: 'web', text: 'Integrated Remote Support Portal redirection links on the primary login dashboard.' }
    ])
  },
  {
    version: 'Beta 1.8.5', date: 'June 25, 2026', title: 'Shared Catalog Scoping & Appliance Onboarding Refinements',
    changes: JSON.stringify([
      { type: 'web', text: 'Removed individual userId filtering from core inventory lookup APIs (categories, audit, CSV, recipes, dashboard) to support shared catalogs.' },
      { type: 'web', text: 'Updated setup wizard redirection flow to force-redirect unconfigured instances to setup onboarding page on boot.' },
      { type: 'appliance', text: 'Configured automatic npm updates in appliance bootstrap scripts.' },
      { type: 'appliance', text: 'Added troubleshooting guides for Linux swap-space requirements on low-RAM Raspberry Pi devices.' },
      { type: 'web', text: 'Fixed trial license expiration throttling in the test suite by enforcing test environment variables.' }
    ])
  },
  {
    version: 'Beta 1.8.4', date: 'June 20, 2026', title: 'Direct Mobile Sync & Bearer Authentication',
    changes: JSON.stringify([
      { type: 'web', text: 'Extended session authentication to support Bearer Tokens in request headers.' },
      { type: 'web', text: 'Modified login API to return the session token in the JSON response body.' },
      { type: 'web', text: 'Added descriptive client-side error handling to setup wizard route.' },
      { type: 'mobile', text: 'Implemented Server Connection Settings panel (modal) with URL, email, and password inputs persisted locally.' },
      { type: 'mobile', text: 'Built direct server syncing that logs in, packages the scan queue into a ZIP archive, and uploads it via HTTP.' },
      { type: 'web', text: 'Optimized Google Books metadata search to prioritize exact matching ISBN identifiers.' },
      { type: 'web', text: 'Added troubleshooting documentation for pre-2007 mass-market paperback recycled UPC barcodes.' }
    ])
  },
  {
    version: 'Beta 1.8.3', date: 'June 19, 2026', title: 'Acquisition Cost & Segmented Valuation Report',
    changes: JSON.stringify([
      { type: 'web', text: 'Added database schema migrations for purchasePrice column.' },
      { type: 'web', text: 'Implemented item detail profit/loss calculator matching low, average, and high market value tiers.' },
      { type: 'web', text: 'Redesigned Valuation Report page with segmented tabs dividing Invested Assets and Market Value Only assets.' },
      { type: 'web', text: 'Updated Valuation API to compute portfolio-wide ROI statistics and separate unpriced assets.' },
      { type: 'web', text: 'Added automated test cases covering purchase price summaries and list sorting.' }
    ])
  },
  {
    version: 'Beta 1.8.2', date: 'June 11, 2026', title: 'Multi-Seat Licensing & Single-Device Deactivation Cooldown',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented stable machine ID hashing generated from host network interfaces.' },
      { type: 'web', text: 'Updated client activations to submit hostname and username descriptors.' },
      { type: 'web', text: 'Added support for single-device seat deactivations on multi-seat keys.' },
      { type: 'web', text: 'Enforced 7-day deactivation cooldown period to prevent licensing abuse.' },
      { type: 'web', text: 'Created comprehensive integration tests for anti-sharing and device rotations.' }
    ])
  },
  {
    version: 'Beta 1.8.1', date: 'June 7, 2026', title: 'Dynamic Booth Numbering & Print Layout Toggle',
    changes: JSON.stringify([
      { type: 'web', text: 'Added automatic database migrations for sequential booth numbering, zero-padding existing store profiles starting from 001.' },
      { type: 'web', text: 'Implemented sequential booth numbering logic on new store creations.' },
      { type: 'web', text: 'Added a settings toggle ("Show Booth Number instead of Name") in the barcode printing client.' },
      { type: 'web', text: 'Updated single price tag widget to render booth numbers dynamically and avoid layout clutter.' },
      { type: 'web', text: 'Included automated testing coverage for database migrations and POST calculations.' }
    ])
  },
  {
    version: 'Beta 1.8.0', date: 'June 6, 2026', title: 'Offline Trial Keys, Transactional Wiping Self-Destruct, & SaaS Cloud Demo Resets',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented 7-day (TRIA) and 5-minute (TR5M) offline trial activation keys mapped to Retail Store Mode.' },
      { type: 'web', text: 'Developed a robust wipeDatabaseData fallback that transactionally purges all SQLite tables first, bypassing Windows EBUSY file resource locks during self-destruction.' },
      { type: 'web', text: 'Created SaaS Cloud Demo mode (DEMO_MODE=true) which allows SMTP bypass, immediate user activation, and automated daily midnight database resets (preserving oldest tenant assets).' },
      { type: 'web', text: 'Added a comprehensive integration testing suite verifying validation, onboarding, self-destruct, and demo resets.' },
      { type: 'web', text: 'Created a dedicated trial info page published directly to the WordPress network dashboard.' }
    ])
  },
  {
    version: 'Beta 1.7.0', date: 'June 6, 2026', title: 'Multi-Booth User Gating, Sales Payout Draw, & Monospaced Receipts Hub',
    changes: JSON.stringify([
      { type: 'web', text: 'Extended user records with multi-store allowed mappings and locked header switcher badges for restricted booths.' },
      { type: 'web', text: 'Created dynamic sales report matching barcodes to booth catalogs on both UUID and manufacturer UPC keys.' },
      { type: 'web', text: 'Built full payouts reporting drawer summarizing gross sales and net vendor profits.' },
      { type: 'web', text: 'Developed a receipt printing hub rendering Thermal Roll (80mm) and Letter Invoice templates with inline booth details.' },
      { type: 'web', text: 'Updated SQLite schemas to TEXT and mocked cookie sessions inside the test runner to ensure 100% test coverage.' },
      { type: 'web', text: 'Added automated local filesystem unlinking to clean up front/back photo files upon catalog deletions.' }
    ])
  },
  {
    version: 'Beta 1.6.0', date: 'June 3, 2026', title: 'POS Ingestion, Recipe Mapping, BLE Weight Math, & Variance Auditor Dashboard',
    changes: JSON.stringify([
      { type: 'web', text: 'Added database schemas for liquor inventory tracking (brands, variants, recipes, physical count logs, POS sales).' },
      { type: 'web', text: 'Implemented scanned landscape PMIX report parsing with automated 90-degree image rotation, optimized PSM 6 OCR layout extraction, and regex-based item ingestion.' },
      { type: 'web', text: 'Created a mathematical constraint solver (Quantity * Cost = Total) to dynamically resolve and correct OCR text anomalies in scanned inventories.' },
      { type: 'web', text: 'Built specific gravity volume math conversion libraries to translate bottle weight inputs into fluid ounces.' },
      { type: 'web', text: 'Developed a premium glassmorphic auditor dashboard showing depletions, theoretical sales, variance, and financial cost metrics.' },
      { type: 'web', text: 'Created an interactive recipe editor, custom liquor brand onboarder, and BLE weight scale simulator.' },
      { type: 'web', text: 'Added full integration tests verifying specific gravity math, database mapping transactions, and variance calculation formulas.' }
    ])
  },
  {
    version: 'Beta 1.5.2', date: 'June 2, 2026', title: 'SaaS Database Multi-Tenancy & Security Hardening',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented Option 3 (Hybrid SQLite Database Manager) for dynamic, isolated database routing per tenant with in-memory connection caching and auto-cleanup.' },
      { type: 'web', text: 'Built the First-Boot Setup Onboarding Wizard (/setup) to configure administrator details and validate Type A (Collector) and Type B (Store) product license keys offline using SHA-256 HMAC checksums.' },
      { type: 'web', text: 'Created server-side redirect gates on the home dashboard and login pages to mandate setup completion.' },
      { type: 'web', text: 'Removed vulnerable backdoor admin accounts from source code and implemented environment-based Super Admin authentication (Option A) with virtual session resolution.' },
      { type: 'web', text: 'Added a full integration testing suite verifying concurrency, security locks, and Registry resolution.' }
    ])
  },
  {
    version: 'Beta 1.5.0', date: 'June 1, 2026', title: 'Single Instance Optimization',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented a Single Instance Lock to prevent multiple copies of the desktop app from running simultaneously in the background.' },
      { type: 'web', text: 'Clicking the app shortcut while the server is already running in the system tray will now focus and restore the existing window instead of launching duplicate processes.' }
    ])
  },
  {
    version: 'Beta 1.4.0', date: 'June 1, 2026', title: 'Desktop Autoupdater Integration',
    changes: JSON.stringify([
      { type: 'web', text: 'Successfully converted the web application into a fully standalone native Windows Desktop App with an integrated OTA (Over-The-Air) automatic updater!' },
      { type: 'web', text: 'Store owners no longer need to install Node.js or run command prompts. The new System Update Panel inside the Admin Dashboard allows seamless background updates with zero downtime.' }
    ])
  },
  {
    version: 'Beta 1.3', date: 'May 30, 2026', title: 'Comic Book Integration & AI Refinements',
    changes: JSON.stringify([
      { type: 'mobile', text: 'Added Comic Book Mode for capturing loose and slabbed comics.' },
      { type: 'web', text: 'Built the Comic Book Metadata Engine utilizing dual OCR and Lens identification.' },
      { type: 'web', text: 'Integrated automated Market Value scraping from Google Shopping for ungraded/raw comic books.' },
      { type: 'web', text: 'Added a clean unified "AI Pipeline Engine" dropdown to simplify the web dashboard.' },
      { type: 'web', text: 'Overhauled the Basic AI Engine to intelligently synthesize Logo identification with sequential vertical OCR text for robust product name extraction.' }
    ])
  },
  {
    version: 'Beta 1.2', date: 'May 30, 2026', title: 'Multi-Asset AI Ecosystem',
    changes: JSON.stringify([
      { type: 'web', text: 'Implemented Toy Mode condition tracking and dynamic market value calculations.' },
      { type: 'mobile', text: 'Built Coin Sheldon grading scale and PCGS/NGC slab barcode scraping.' },
      { type: 'web', text: 'Integrated IMDb Knowledge Graph for scraping Video and Movie metadata.' },
      { type: 'web', text: 'Developed the WordPress Autonomous Mirror for instantly publishing local inventory to the public web.' }
    ])
  },
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

// Helper to synchronize all changelog entries into the database (clears and re-seeds to guarantee order and freshness)
export function syncChangelogs(db) {
  try {
    const deleteStmt = db.prepare('DELETE FROM changelogs');
    const insertStmt = db.prepare('INSERT INTO changelogs (id, version, date, title, changes, createdAt) VALUES (?, ?, ?, ?, ?, ?)');

    db.transaction(() => {
      // Clear existing records to ensure no duplicates, correct sorting order, and clean updates
      deleteStmt.run();

      const items = [...seedData].reverse();
      const baseTime = Date.now();
      items.forEach((item, index) => {
        insertStmt.run(crypto.randomUUID(), item.version, item.date, item.title, item.changes, baseTime + index * 1000);
      });
    })();
  } catch (err) {
    console.error('[dbManager] Changelog sync failed:', err);
  }
}
