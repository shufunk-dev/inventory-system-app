import { getGlobalDb } from '../../../lib/db.js';
import { getUser } from '../../../lib/auth.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  NextResponse = {
    json: (body, init) => ({
      status: init?.status || 200,
      json: async () => body
    })
  };
}

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

const DEFAULT_GAME_SYSTEMS = [
  { name: 'Nintendo Entertainment System (NES)', enabled: true },
  { name: 'Super Nintendo (SNES)', enabled: true },
  { name: 'Nintendo 64 (N64)', enabled: true },
  { name: 'Nintendo GameCube', enabled: true },
  { name: 'Nintendo Wii', enabled: true },
  { name: 'Nintendo Wii U', enabled: true },
  { name: 'Nintendo Switch', enabled: true },
  { name: 'Game Boy', enabled: true },
  { name: 'Game Boy Color', enabled: true },
  { name: 'Game Boy Advance', enabled: true },
  { name: 'Nintendo DS', enabled: true },
  { name: 'Nintendo 3DS', enabled: true },
  { name: 'Sega Master System', enabled: true },
  { name: 'Sega Genesis', enabled: true },
  { name: 'Sega Saturn', enabled: true },
  { name: 'Sega Dreamcast', enabled: true },
  { name: 'Sega Game Gear', enabled: true },
  { name: 'PlayStation (PS1)', enabled: true },
  { name: 'PlayStation 2 (PS2)', enabled: true },
  { name: 'PlayStation 3 (PS3)', enabled: true },
  { name: 'PlayStation 4 (PS4)', enabled: true },
  { name: 'PlayStation 5 (PS5)', enabled: true },
  { name: 'PlayStation Portable (PSP)', enabled: true },
  { name: 'PlayStation Vita', enabled: true },
  { name: 'Xbox', enabled: true },
  { name: 'Xbox 360', enabled: true },
  { name: 'Xbox One', enabled: true },
  { name: 'Xbox Series X/S', enabled: true },
  { name: 'Atari 2600', enabled: true },
  { name: 'Atari 7800', enabled: true },
  { name: 'Atari Lynx', enabled: true },
  { name: 'Atari Jaguar', enabled: true },
  { name: 'TurboGrafx-16', enabled: true },
  { name: 'Neo Geo', enabled: true },
  { name: 'PC / MS-DOS', enabled: true },
  { name: 'Mac', enabled: true }
];

const DEFAULT_MOVIE_FORMATS = [
  { name: 'VHS', enabled: true },
  { name: 'DVD', enabled: true },
  { name: 'Blu-ray', enabled: true },
  { name: '4K Ultra HD', enabled: true },
  { name: 'LaserDisc', enabled: true },
  { name: 'BetaMax', enabled: true },
  { name: 'VCD', enabled: true },
  { name: 'HD DVD', enabled: true },
  { name: 'Digital Copy', enabled: true }
];

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!(user.isAdmin || user.isRoot)) {
    const db = await getGlobalDb();
    const rows = db.prepare("SELECT key, value FROM system_settings WHERE key IN ('mall_name', 'mall_address', 'mall_phone', 'receipt_footer', 'receipt_logo', 'enabled_game_systems', 'enabled_movie_formats')").all();
    let settings = {
      mallName: 'Antique Mall',
      mallAddress: '123 Main Street, Suite A',
      mallPhone: '(555) 019-2834',
      receiptFooter: 'THANK YOU FOR SHOPPING!\nALL SALES FINAL ON ANTIQUES',
      receiptLogo: '',
      enabledGameSystems: DEFAULT_GAME_SYSTEMS,
      enabledMovieFormats: DEFAULT_MOVIE_FORMATS
    };
    rows.forEach(row => {
      if (row.key === 'mall_name') settings.mallName = row.value;
      if (row.key === 'mall_address') settings.mallAddress = row.value;
      if (row.key === 'mall_phone') settings.mallPhone = row.value;
      if (row.key === 'receipt_footer') settings.receiptFooter = row.value;
      if (row.key === 'receipt_logo') settings.receiptLogo = row.value;
      if (row.key === 'enabled_game_systems') {
        try {
          const parsed = JSON.parse(row.value);
          const merged = DEFAULT_GAME_SYSTEMS.map(defSys => {
            const matched = parsed.find(p => p.name === defSys.name);
            return matched ? { ...defSys, enabled: matched.enabled } : defSys;
          });
          settings.enabledGameSystems = merged;
        } catch (e) {}
      }
      if (row.key === 'enabled_movie_formats') {
        try {
          const parsed = JSON.parse(row.value);
          const merged = DEFAULT_MOVIE_FORMATS.map(defForm => {
            const matched = parsed.find(p => p.name === defForm.name);
            return matched ? { ...defForm, enabled: matched.enabled } : defForm;
          });
          settings.enabledMovieFormats = merged;
        } catch (e) {}
      }
    });
    return NextResponse.json(settings);
  }

  const db = await getGlobalDb();
  const stmt = db.prepare('SELECT key, value FROM system_settings WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const rows = stmt.all('api_keys', 'active_tier', 'smtp_config', 'mall_name', 'mall_address', 'mall_phone', 'receipt_footer', 'receipt_logo', 'payment_config', 'tunnel_config', 'printer_config', 'enabled_game_systems', 'enabled_movie_formats');
  
  let settings = {
    mallName: 'Antique Mall',
    mallAddress: '123 Main Street, Suite A',
    mallPhone: '(555) 019-2834',
    receiptFooter: 'THANK YOU FOR SHOPPING!\nALL SALES FINAL ON ANTIQUES',
    receiptLogo: '',
    apiKeys: {
      googleVisionKey: '',
      googleBooksKey: '',
      serpApiKey: '',
      priceChartingKey: '',
      searxngUrl: '',
      discogsApiKey: '',
      ebayClientId: '',
      ebayClientSecret: '',
      ebayMarketplaceId: 'EBAY_US',
      ebayVerificationToken: '',
      discordWebhookUrl: '',
      marketValuationProvider: 'searxng'
    },
    activeTier: 'basic',
    smtpConfig: {
      host: '',
      port: '587',
      secure: false,
      user: '',
      pass: '',
      from: ''
    },
    paymentConfig: {
      provider: 'none',
      stripeApiKey: '',
      stripeReaderId: '',
      squareAccessToken: '',
      squareLocationId: '',
      squareDeviceId: '',
      venmoHandle: '',
      paypalEmail: ''
    },
    tunnelConfig: {
      method: 'none',
      licenseKey: '',
      customToken: '',
      activeToken: '',
      subdomain: '',
      isConnected: false
    },
    printerConfig: {
      connectionType: 'browser',
      networkIp: '',
      networkPort: '9100',
      paperWidth: '80mm',
      cashDrawerKick: true,
      paperCut: true
    },
    enabledGameSystems: DEFAULT_GAME_SYSTEMS,
    enabledMovieFormats: DEFAULT_MOVIE_FORMATS
  };

  rows.forEach(row => {
    try {
      if (row.key === 'mall_name') settings.mallName = row.value;
      if (row.key === 'mall_address') settings.mallAddress = row.value;
      if (row.key === 'mall_phone') settings.mallPhone = row.value;
      if (row.key === 'receipt_footer') settings.receiptFooter = row.value;
      if (row.key === 'receipt_logo') settings.receiptLogo = row.value;
      if (row.key === 'api_keys') {
        const parsed = JSON.parse(row.value);
        settings.apiKeys = { ...settings.apiKeys, ...parsed };
        if (settings.apiKeys.ebayClientSecret) {
          settings.apiKeys.ebayClientSecret = '••••••••';
        }
      }
      if (row.key === 'active_tier') settings.activeTier = row.value;
      if (row.key === 'smtp_config') {
        const parsed = JSON.parse(row.value);
        if (parsed.pass) parsed.pass = '••••••••';
        settings.smtpConfig = { ...settings.smtpConfig, ...parsed };
      }
      if (row.key === 'payment_config') {
        const parsed = JSON.parse(row.value);
        if (parsed.stripeApiKey) parsed.stripeApiKey = '••••••••';
        if (parsed.squareAccessToken) parsed.squareAccessToken = '••••••••';
        settings.paymentConfig = { ...settings.paymentConfig, ...parsed };
      }
      if (row.key === 'tunnel_config') {
        const parsed = JSON.parse(row.value);
        if (parsed.customToken) parsed.customToken = '••••••••';
        if (parsed.activeToken) parsed.activeToken = '••••••••';
        settings.tunnelConfig = { ...settings.tunnelConfig, ...parsed };
      }
      if (row.key === 'printer_config') {
        const parsed = JSON.parse(row.value);
        settings.printerConfig = { ...settings.printerConfig, ...parsed };
      }
      if (row.key === 'enabled_game_systems') {
        const parsed = JSON.parse(row.value);
        const merged = DEFAULT_GAME_SYSTEMS.map(defSys => {
          const matched = parsed.find(p => p.name === defSys.name);
          return matched ? { ...defSys, enabled: matched.enabled } : defSys;
        });
        settings.enabledGameSystems = merged;
      }
      if (row.key === 'enabled_movie_formats') {
        const parsed = JSON.parse(row.value);
        const merged = DEFAULT_MOVIE_FORMATS.map(defForm => {
          const matched = parsed.find(p => p.name === defForm.name);
          return matched ? { ...defForm, enabled: matched.enabled } : defForm;
        });
        settings.enabledMovieFormats = merged;
      }
    } catch (e) {}
  });

  return NextResponse.json(settings);
}

export async function PUT(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const db = await getGlobalDb();
    
    // We update multiple settings in a transaction
    const updateStmt = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    
    const runUpdate = db.transaction(() => {
      if (data.mallName) {
        updateStmt.run('mall_name', data.mallName.trim());
      }
      if (data.mallAddress !== undefined) {
        updateStmt.run('mall_address', (data.mallAddress || '').trim());
      }
      if (data.mallPhone !== undefined) {
        updateStmt.run('mall_phone', (data.mallPhone || '').trim());
      }
      if (data.receiptFooter !== undefined) {
        updateStmt.run('receipt_footer', (data.receiptFooter || '').trim());
      }
      if (data.receiptLogo !== undefined) {
        updateStmt.run('receipt_logo', (data.receiptLogo || '').trim());
      }
      if (data.apiKeys) {
        let keysToSave = { ...data.apiKeys };
        if (keysToSave.ebayClientSecret === '••••••••') {
          try {
            const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'api_keys'").get();
            if (existingRow && existingRow.value) {
              const prev = JSON.parse(existingRow.value);
              keysToSave.ebayClientSecret = prev.ebayClientSecret || '';
            }
          } catch (e) {}
        }
        updateStmt.run('api_keys', JSON.stringify(keysToSave));
      }
      if (data.activeTier) {
        updateStmt.run('active_tier', data.activeTier);
      }
      if (data.smtpConfig) {
        let configToSave = { ...data.smtpConfig };
        if (configToSave.pass === '••••••••') {
          try {
            const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'smtp_config'").get();
            if (existingRow && existingRow.value) {
              const existingParsed = JSON.parse(existingRow.value);
              configToSave.pass = existingParsed.pass || '';
            } else {
              configToSave.pass = '';
            }
          } catch(e) {
            configToSave.pass = '';
          }
        }
        updateStmt.run('smtp_config', JSON.stringify(configToSave));
      }
      if (data.paymentConfig) {
        let configToSave = { ...data.paymentConfig };
        
        // Retrieve and restore masked parameters
        try {
          const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'payment_config'").get();
          if (existingRow && existingRow.value) {
            const existingParsed = JSON.parse(existingRow.value);
            if (configToSave.stripeApiKey === '••••••••') {
              configToSave.stripeApiKey = existingParsed.stripeApiKey || '';
            }
            if (configToSave.squareAccessToken === '••••••••') {
              configToSave.squareAccessToken = existingParsed.squareAccessToken || '';
            }
          } else {
            if (configToSave.stripeApiKey === '••••••••') configToSave.stripeApiKey = '';
            if (configToSave.squareAccessToken === '••••••••') configToSave.squareAccessToken = '';
          }
        } catch (e) {
          if (configToSave.stripeApiKey === '••••••••') configToSave.stripeApiKey = '';
          if (configToSave.squareAccessToken === '••••••••') configToSave.squareAccessToken = '';
        }
        updateStmt.run('payment_config', JSON.stringify(configToSave));
      }
      if (data.tunnelConfig) {
        let configToSave = { ...data.tunnelConfig };
        
        // Retrieve and restore masked parameters
        try {
          const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'tunnel_config'").get();
          if (existingRow && existingRow.value) {
            const existingParsed = JSON.parse(existingRow.value);
            if (configToSave.customToken === '••••••••') {
              configToSave.customToken = existingParsed.customToken || '';
            }
            if (configToSave.activeToken === '••••••••') {
              configToSave.activeToken = existingParsed.activeToken || '';
            }
          } else {
            if (configToSave.customToken === '••••••••') configToSave.customToken = '';
            if (configToSave.activeToken === '••••••••') configToSave.activeToken = '';
          }
        } catch (e) {
          if (configToSave.customToken === '••••••••') configToSave.customToken = '';
          if (configToSave.activeToken === '••••••••') configToSave.activeToken = '';
        }
        updateStmt.run('tunnel_config', JSON.stringify(configToSave));
      }
      if (data.printerConfig) {
        updateStmt.run('printer_config', JSON.stringify(data.printerConfig));
      }
      if (data.enabledGameSystems) {
        updateStmt.run('enabled_game_systems', JSON.stringify(data.enabledGameSystems));
      }
      if (data.enabledMovieFormats) {
        updateStmt.run('enabled_movie_formats', JSON.stringify(data.enabledMovieFormats));
      }
    });

    runUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
