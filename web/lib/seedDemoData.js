import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

export function seedDemoData(customDataPath = null) {
  const dataPath = customDataPath || process.env.USER_DATA_PATH || process.cwd();
  const masterDbPath = path.resolve(dataPath, 'inventory.db');

  console.log('[Seed] Seeding Demo Data to:', masterDbPath);

  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }

  const masterDb = new Database(masterDbPath);

  // Initialize master tables if not existing
  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      passwordHash TEXT,
      tier TEXT DEFAULT 'store',
      activeTier TEXT DEFAULT 'store',
      isAdmin INTEGER DEFAULT 1,
      isRoot INTEGER DEFAULT 1,
      serpApiKey TEXT,
      createdAt INTEGER,
      displayName TEXT,
      profilePicture TEXT,
      role TEXT DEFAULT 'admin',
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
      syncStatus TEXT DEFAULT 'synced', 
      lastSyncAttempt INTEGER,
      createdAt INTEGER,
      retailPrice REAL,
      purchasePrice REAL,
      gameSystem TEXT,
      movieFormat TEXT,
      hardwareBrand TEXT,
      hardwareModel TEXT,
      hardwareType TEXT,
      toolBrand TEXT,
      toolModel TEXT,
      toyBrand TEXT,
      toyYear TEXT,
      toyCondition TEXT,
      cardCondition TEXT,
      cardCertNumber TEXT,
      cardGradingAgency TEXT,
      comicCondition TEXT,
      comicCertNumber TEXT,
      comicGradingAgency TEXT,
      comicPublisher TEXT,
      comicIssue TEXT
    );

    CREATE TABLE IF NOT EXISTS pos_items (
      itemNum TEXT PRIMARY KEY,
      name TEXT,
      price REAL,
      amount REAL,
      numSold REAL,
      userId TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      receiptNo TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerCheckoutId TEXT,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'completed',
      isTraining INTEGER DEFAULT 0,
      createdAt INTEGER
    );
  `);

  // Clear existing records to ensure idempotent fresh seed
  masterDb.exec(`
    DELETE FROM users;
    DELETE FROM sessions;
    DELETE FROM store_profiles;
    DELETE FROM categories;
    DELETE FROM items;
    DELETE FROM pos_items;
    DELETE FROM payment_transactions;
  `);

  const now = Date.now();
  const todayDateStr = new Date().toISOString().split('T')[0];

  // 1. Admin & Demo User
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('demo123', salt);

  masterDb.prepare(`
    INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, displayName, role, status, createdAt)
    VALUES (?, ?, ?, 'store', 'store', 1, 1, 'Demo Administrator', 'admin', 'active', ?)
  `).run('user-demo-admin', 'demo@shufunk.net', passwordHash, now);

  // 2. System Settings
  const settings = [
    ['license_type', 'store'],
    ['license_key', 'DEMO-SITEGROUND-2026'],
    ['license_status', 'active'],
    ['tax_rate', '7.0'],
    ['currency_symbol', '$'],
    ['store_name', 'Grand Antique & Collector Mall (Demo)'],
    ['pos_start_date', todayDateStr],
    ['pos_end_date', todayDateStr],
    ['siteground_demo', 'true'],
    ['last_reset_date', todayDateStr]
  ];

  const insertSetting = masterDb.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)");
  for (const [key, value] of settings) {
    insertSetting.run(key, value);
  }

  // 3. Store Profiles (Booths)
  const booths = [
    { id: 'booth-101-pixel-cartridge', name: 'Pixel & Cartridge', number: '101' },
    { id: 'booth-102-vault-cards', name: 'Vault Collectibles', number: '102' },
    { id: 'booth-103-nostalgia-toys', name: 'Nostalgia Toybox', number: '103' }
  ];

  const insertBooth = masterDb.prepare("INSERT INTO store_profiles (id, name, boothNumber, createdAt) VALUES (?, ?, ?, ?)");
  for (const booth of booths) {
    insertBooth.run(booth.id, booth.name, booth.number, now);
  }

  // 4. Booth Specifications & Catalogs
  const boothData = {
    'booth-101-pixel-cartridge': {
      name: 'Pixel & Cartridge',
      categories: [
        { id: 'cat-snes', name: 'Super Nintendo (SNES)' },
        { id: 'cat-n64', name: 'Nintendo 64' },
        { id: 'cat-gb', name: 'Game Boy & Handhelds' },
        { id: 'cat-retro-pc', name: 'Vintage Computing' }
      ],
      items: [
        {
          id: 'item-chrono-trigger',
          categoryId: 'cat-snes',
          name: 'Chrono Trigger (SNES - Loose Cartridge)',
          description: 'Authentic 1995 North American SNES release. Pristine label, original save battery tested and verified functional.',
          barcode: '045496830342',
          retailPrice: 220.00,
          purchasePrice: 110.00,
          gameSystem: 'Super Nintendo',
          soldToday: 1
        },
        {
          id: 'item-zelda-oot-cib',
          categoryId: 'cat-n64',
          name: 'The Legend of Zelda: Ocarina of Time (N64 CIB)',
          description: 'Collector grade complete-in-box with original manual, warranty insert, cardboard tray, and mint cartridge.',
          barcode: '045496870010',
          retailPrice: 95.00,
          purchasePrice: 45.00,
          gameSystem: 'Nintendo 64',
          soldToday: 1
        },
        {
          id: 'item-gbc-atomic-purple',
          categoryId: 'cat-gb',
          name: 'Nintendo Game Boy Color (Atomic Purple)',
          description: 'Clean OEM shell with matching battery cover. High-contrast LCD with no dead pixels or horizontal lines.',
          barcode: '045496711580',
          retailPrice: 75.00,
          purchasePrice: 35.00,
          gameSystem: 'Game Boy Color',
          soldToday: 0
        },
        {
          id: 'item-c64-breadbin',
          categoryId: 'cat-retro-pc',
          name: 'Commodore 64 Breadbin Computer & Modern PSU',
          description: 'Tested 6510 CPU and 6581 SID chip. Included modern safe switching power supply to prevent over-voltage.',
          barcode: 'C64-VINT-1982',
          retailPrice: 160.00,
          purchasePrice: 70.00,
          hardwareBrand: 'Commodore',
          hardwareModel: 'C64 Breadbin',
          hardwareType: 'Computer',
          soldToday: 0
        }
      ]
    },
    'booth-102-vault-cards': {
      name: 'Vault Collectibles',
      categories: [
        { id: 'cat-pokemon', name: 'Pokémon TCG' },
        { id: 'cat-sports', name: 'Sports Cards & Memorabilia' },
        { id: 'cat-comics', name: 'Graded Comic Books' }
      ],
      items: [
        {
          id: 'item-charizard-psa8',
          categoryId: 'cat-pokemon',
          name: '1999 Pokémon Base Set Charizard Holo #4 (PSA 8 NM-MT)',
          description: 'PSA Graded 8 NM-MT. Brilliant foil reflection, sharp corners, housed in secure tamper-proof sonic weld slab.',
          barcode: 'PSA-48291044',
          retailPrice: 480.00,
          purchasePrice: 260.00,
          cardCondition: 'PSA 8 NM-MT',
          cardCertNumber: '48291044',
          cardGradingAgency: 'PSA',
          soldToday: 1
        },
        {
          id: 'item-spiderman-300',
          categoryId: 'cat-comics',
          name: 'The Amazing Spider-Man #300 (1st Full Venom) - CGC 9.4',
          description: 'Historic key issue featuring the 1st full appearance of Venom (Eddie Brock). Todd McFarlane cover & art.',
          barcode: 'CGC-12847290',
          retailPrice: 350.00,
          purchasePrice: 180.00,
          comicCondition: 'CGC 9.4 NM',
          comicCertNumber: '12847290',
          comicGradingAgency: 'CGC',
          comicPublisher: 'Marvel Comics',
          comicIssue: '300',
          soldToday: 1
        },
        {
          id: 'item-jordan-rc-bgs8',
          categoryId: 'cat-sports',
          name: '1986-87 Fleer Michael Jordan #57 Rookie Card (BGS 8)',
          description: 'The definitive basketball card. Sub-grades: Centering 8.5, Corners 8.0, Edges 8.0, Surface 8.5.',
          barcode: 'BGS-00948211',
          retailPrice: 1850.00,
          purchasePrice: 1100.00,
          cardCondition: 'BGS 8 NM-MT',
          cardCertNumber: '00948211',
          cardGradingAgency: 'Beckett (BGS)',
          soldToday: 0
        },
        {
          id: 'item-brady-rookie',
          categoryId: 'cat-sports',
          name: '2000 Bowman Chrome Tom Brady Rookie Card #236',
          description: 'Authentic Tom Brady rookie card displayed in an archival magnetic one-touch UV protective case.',
          barcode: 'BOW-BRADY-2000',
          retailPrice: 275.00,
          purchasePrice: 130.00,
          cardCondition: 'Near Mint+',
          soldToday: 0
        }
      ]
    },
    'booth-103-nostalgia-toys': {
      name: 'Nostalgia Toybox',
      categories: [
        { id: 'cat-starwars', name: 'Vintage Star Wars' },
        { id: 'cat-transformers', name: 'Transformers G1' },
        { id: 'cat-diecast', name: 'Diecast & Hot Wheels' },
        { id: 'cat-lego', name: 'Vintage LEGO Sets' }
      ],
      items: [
        {
          id: 'item-starwars-boba-fett',
          categoryId: 'cat-starwars',
          name: '1979 Kenner Star Wars Vintage Boba Fett (Complete)',
          description: 'Original Hong Kong COO stamp. Tight joints, minimal paint wear, complete with authentic original blaster.',
          barcode: 'KENNER-BOBA-1979',
          retailPrice: 110.00,
          purchasePrice: 45.00,
          toyBrand: 'Kenner',
          toyYear: '1979',
          toyCondition: 'Excellent',
          soldToday: 1
        },
        {
          id: 'item-transformers-optimus',
          categoryId: 'cat-transformers',
          name: '1984 Hasbro Transformers G1 Optimus Prime & Trailer',
          description: 'First generation release with trailer, Roller, gas hose, pump nozzle, and combat deck twin missiles.',
          barcode: 'HASBRO-G1-OP1984',
          retailPrice: 145.00,
          purchasePrice: 65.00,
          toyBrand: 'Hasbro',
          toyYear: '1984',
          toyCondition: 'Very Good',
          soldToday: 1
        },
        {
          id: 'item-hotwheels-redline-mustang',
          categoryId: 'cat-diecast',
          name: '1968 Mattel Hot Wheels Redline Custom Mustang',
          description: 'Sweet 16 release in Antifreeze Spectraflame with original redline tires and working pop-up hood.',
          barcode: 'HW-REDLINE-1968',
          retailPrice: 85.00,
          purchasePrice: 30.00,
          toyBrand: 'Mattel',
          toyYear: '1968',
          toyCondition: 'Good - Original Redlines',
          soldToday: 0
        },
        {
          id: 'item-lego-kings-castle-6080',
          categoryId: 'cat-lego',
          name: '1984 LEGO System Castle 6080 King\'s Castle (Boxed)',
          description: 'Classic castle theme set with working drawbridge, portcullis, 12 minifigures, 4 barded horses, and box.',
          barcode: '042884060809',
          retailPrice: 190.00,
          purchasePrice: 90.00,
          toyBrand: 'LEGO',
          toyYear: '1984',
          toyCondition: 'Complete with Box & Instructions',
          soldToday: 0
        }
      ]
    }
  };

  const insertMasterItem = masterDb.prepare(`
    INSERT INTO items (
      id, userId, categoryId, name, description, barcode, itemType, retailPrice, purchasePrice, valueAvg,
      gameSystem, hardwareBrand, hardwareModel, hardwareType,
      toyBrand, toyYear, toyCondition, cardCondition, cardCertNumber, cardGradingAgency,
      comicCondition, comicCertNumber, comicGradingAgency, comicPublisher, comicIssue, createdAt
    ) VALUES (
      ?, 'user-demo-admin', ?, ?, ?, ?, 'standard', ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);

  const insertPosItem = masterDb.prepare(`
    INSERT INTO pos_items (itemNum, name, price, amount, numSold, userId)
    VALUES (?, ?, ?, ?, ?, 'user-demo-admin')
  `);

  const insertPayment = masterDb.prepare(`
    INSERT INTO payment_transactions (id, receiptNo, provider, providerCheckoutId, amount, status, isTraining, createdAt)
    VALUES (?, ?, ?, ?, ?, 'completed', 0, ?)
  `);

  let receiptCounter = 100001;
  const completedSales = [];

  for (const [storeId, storeInfo] of Object.entries(boothData)) {
    const storeDbPath = path.resolve(dataPath, `store_${storeId}.sqlite`);
    if (fs.existsSync(storeDbPath)) {
      try { fs.unlinkSync(storeDbPath); } catch (e) {}
    }
    
    const storeDb = new Database(storeDbPath);
    
    storeDb.exec(`
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
        syncStatus TEXT DEFAULT 'synced', 
        lastSyncAttempt INTEGER,
        createdAt INTEGER,
        retailPrice REAL,
        purchasePrice REAL,
        gameSystem TEXT,
        hardwareBrand TEXT,
        hardwareModel TEXT,
        hardwareType TEXT,
        toyBrand TEXT,
        toyYear TEXT,
        toyCondition TEXT,
        cardCondition TEXT,
        cardCertNumber TEXT,
        cardGradingAgency TEXT,
        comicCondition TEXT,
        comicCertNumber TEXT,
        comicGradingAgency TEXT,
        comicPublisher TEXT,
        comicIssue TEXT
      );
      CREATE TABLE IF NOT EXISTS pos_items (
        itemNum TEXT PRIMARY KEY,
        name TEXT,
        price REAL,
        amount REAL,
        numSold REAL,
        userId TEXT
      );
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        receiptNo TEXT NOT NULL,
        provider TEXT NOT NULL,
        providerCheckoutId TEXT,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'completed',
        isTraining INTEGER DEFAULT 0,
        createdAt INTEGER
      );
    `);

    const insertStoreCat = storeDb.prepare("INSERT INTO categories (id, name, userId, createdAt) VALUES (?, ?, 'user-demo-admin', ?)");
    const insertMasterCat = masterDb.prepare("INSERT OR IGNORE INTO categories (id, name, userId, createdAt) VALUES (?, ?, 'user-demo-admin', ?)");
    for (const cat of storeInfo.categories) {
      insertStoreCat.run(cat.id, cat.name, now);
      insertMasterCat.run(cat.id, cat.name, now);
    }

    const insertStoreItem = storeDb.prepare(`
      INSERT INTO items (
        id, userId, categoryId, name, description, barcode, itemType, retailPrice, purchasePrice, valueAvg,
        gameSystem, hardwareBrand, hardwareModel, hardwareType,
        toyBrand, toyYear, toyCondition, cardCondition, cardCertNumber, cardGradingAgency,
        comicCondition, comicCertNumber, comicGradingAgency, comicPublisher, comicIssue, createdAt
      ) VALUES (
        ?, 'user-demo-admin', ?, ?, ?, ?, 'standard', ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `);

    for (const item of storeInfo.items) {
      insertStoreItem.run(
        item.id, item.categoryId, item.name, item.description, item.barcode, item.retailPrice, item.purchasePrice, item.retailPrice,
        item.gameSystem || null, item.hardwareBrand || null, item.hardwareModel || null, item.hardwareType || null,
        item.toyBrand || null, item.toyYear || null, item.toyCondition || null,
        item.cardCondition || null, item.cardCertNumber || null, item.cardGradingAgency || null,
        item.comicCondition || null, item.comicCertNumber || null, item.comicGradingAgency || null,
        item.comicPublisher || null, item.comicIssue || null, now
      );

      // Duplicate into master catalog
      insertMasterItem.run(
        item.id, item.categoryId, item.name, item.description, item.barcode, item.retailPrice, item.purchasePrice, item.retailPrice,
        item.gameSystem || null, item.hardwareBrand || null, item.hardwareModel || null, item.hardwareType || null,
        item.toyBrand || null, item.toyYear || null, item.toyCondition || null,
        item.cardCondition || null, item.cardCertNumber || null, item.cardGradingAgency || null,
        item.comicCondition || null, item.comicCertNumber || null, item.comicGradingAgency || null,
        item.comicPublisher || null, item.comicIssue || null, now
      );

      if (item.soldToday > 0) {
        const soldAmt = item.retailPrice * item.soldToday;
        insertPosItem.run(item.barcode, item.name, item.retailPrice, soldAmt, item.soldToday);
        
        completedSales.push({
          name: item.name,
          price: item.retailPrice,
          booth: storeInfo.name
        });
      }
    }

    storeDb.close();
    console.log(`[Seed] Populated booth: ${storeInfo.name} (${storeId})`);
  }

  // Create receipts
  let txIndex = 1;
  for (const sale of completedSales) {
    const receiptNo = `R-${receiptCounter++}`;
    const txTime = now - (6 * 3600 * 1000) + (txIndex * 1800 * 1000);
    insertPayment.run(
      `tx-demo-${txIndex}`,
      receiptNo,
      txIndex % 2 === 0 ? 'card' : 'cash',
      `DEMO-PAY-${receiptNo}`,
      sale.price,
      txTime
    );
    txIndex++;
  }

  masterDb.close();
  console.log('[Seed] Demo data seeding completed successfully!');
  return { success: true, boothsCount: booths.length, salesCount: completedSales.length };
}
