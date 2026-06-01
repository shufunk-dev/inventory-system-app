import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

function checkAdmin() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('inventory_session');
  
  if (!sessionToken) return false;
  
  const db = getDb();
  const session = db.prepare('SELECT userId, expiresAt FROM sessions WHERE id = ?').get(sessionToken.value);
  
  if (!session || session.expiresAt < Date.now()) return false;
  
  const user = db.prepare('SELECT isAdmin, isRoot FROM users WHERE id = ?').get(session.userId);
  return user && (user.isAdmin || user.isRoot);
}

export async function GET() {
  if (!checkAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const stmt = db.prepare('SELECT key, value FROM system_settings WHERE key IN (?, ?)');
  const rows = stmt.all('api_keys', 'active_tier');
  
  let settings = {
    apiKeys: {
      googleVisionKey: '',
      serpApiKey: ''
    },
    activeTier: 'basic'
  };

  rows.forEach(row => {
    try {
      if (row.key === 'api_keys') settings.apiKeys = JSON.parse(row.value);
      if (row.key === 'active_tier') settings.activeTier = row.value;
    } catch (e) {}
  });

  return NextResponse.json(settings);
}

export async function PUT(request) {
  if (!checkAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const db = getDb();
    
    // We update multiple settings in a transaction
    const updateStmt = db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    
    const runUpdate = db.transaction(() => {
      if (data.apiKeys) {
        updateStmt.run('api_keys', JSON.stringify(data.apiKeys));
      }
      if (data.activeTier) {
        updateStmt.run('active_tier', data.activeTier);
      }
    });

    runUpdate();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
