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

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getGlobalDb();
  const stmt = db.prepare('SELECT key, value FROM system_settings WHERE key IN (?, ?, ?, ?, ?, ?, ?)');
  const rows = stmt.all('api_keys', 'active_tier', 'smtp_config', 'mall_name', 'payment_config', 'tunnel_config', 'printer_config');
  
  let settings = {
    mallName: 'Antique Mall',
    apiKeys: {
      googleVisionKey: '',
      serpApiKey: '',
      priceChartingKey: '',
      googleCseKey: '',
      googleCseCx: '',
      searxngUrl: '',
      discogsApiKey: ''
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
      paypalEmail: '',
      zelleToken: '',
      zelleBusinessName: ''
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
    }
  };

  rows.forEach(row => {
    try {
      if (row.key === 'mall_name') settings.mallName = row.value;
      if (row.key === 'api_keys') {
        const parsed = JSON.parse(row.value);
        settings.apiKeys = { ...settings.apiKeys, ...parsed };
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
      if (data.apiKeys) {
        updateStmt.run('api_keys', JSON.stringify(data.apiKeys));
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
    });

    runUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
