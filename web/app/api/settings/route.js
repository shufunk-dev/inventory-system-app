import { NextResponse } from 'next/server';
import { getGlobalDb } from '../../../lib/db.js';
import { getUser } from '../../../lib/auth.js';

async function checkAdmin() {
  const user = await getUser();
  return user && (user.isAdmin || user.isRoot);
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getGlobalDb();
  const stmt = db.prepare('SELECT key, value FROM system_settings WHERE key IN (?, ?, ?, ?)');
  const rows = stmt.all('api_keys', 'active_tier', 'smtp_config', 'mall_name');
  
  let settings = {
    mallName: 'Antique Mall',
    apiKeys: {
      googleVisionKey: '',
      serpApiKey: '',
      priceChartingKey: '',
      googleCseKey: '',
      googleCseCx: '',
      searxngUrl: ''
    },
    activeTier: 'basic',
    smtpConfig: {
      host: '',
      port: '587',
      secure: false,
      user: '',
      pass: '',
      from: ''
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
    });

    runUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
