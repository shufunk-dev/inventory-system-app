import { getGlobalDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import { startTunnel, stopTunnel, getTunnelStatus } from '../../../../lib/tunnelManager.js';
import { POST as activateLicense } from '../../central/license/route.js';
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

  try {
    const db = await getGlobalDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'tunnel_config'").get();
    
    let config = {
      method: 'none',
      licenseKey: '',
      customToken: '',
      activeToken: '',
      subdomain: '',
      isConnected: false
    };

    if (row && row.value) {
      config = { ...config, ...JSON.parse(row.value) };
    }

    const daemonStatus = getTunnelStatus();

    return NextResponse.json({
      status: daemonStatus.status,
      error: daemonStatus.error,
      subdomain: config.subdomain,
      method: config.method,
      isConnected: config.isConnected
    });

  } catch (err) {
    console.error('GET Tunnel Status Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { method, licenseKey, customToken } = await request.json();
    const db = await getGlobalDb();

    let targetToken = '';
    let targetSubdomain = '';

    if (method === 'managed') {
      if (!licenseKey) {
        return NextResponse.json({ error: 'License key is required for managed sync' }, { status: 400 });
      }

      // Invoke simulated central server route handler directly to activate key and provision tunnel
      const mockReq = {
        json: async () => ({
          licenseKey,
          machineId: 'local-pos-machine',
          hostname: 'POS-Countertop',
          username: 'admin'
        })
      };

      const activationResponse = await activateLicense(mockReq);
      const activationData = await activationResponse.json();

      if (activationResponse.status !== 200 || !activationData.success) {
        return NextResponse.json({ error: activationData.error || 'License activation failed' }, { status: 400 });
      }

      targetToken = activationData.token;
      targetSubdomain = activationData.subdomain;

    } else if (method === 'self-hosted') {
      if (!customToken) {
        return NextResponse.json({ error: 'Custom tunnel token is required for self-hosted sync' }, { status: 400 });
      }
      targetToken = customToken;
      targetSubdomain = 'https://self-hosted-tunnel.cloudflare';
    } else {
      return NextResponse.json({ error: 'Invalid sync method option' }, { status: 400 });
    }

    // Save configurations in local SQLite settings
    const config = {
      method,
      licenseKey: licenseKey || '',
      customToken: customToken === '••••••••' ? undefined : (customToken || ''),
      activeToken: targetToken,
      subdomain: targetSubdomain,
      isConnected: true
    };

    // Restore customToken if masked
    if (customToken === '••••••••') {
      const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'tunnel_config'").get();
      if (existingRow && existingRow.value) {
        const existingParsed = JSON.parse(existingRow.value);
        config.customToken = existingParsed.customToken || '';
        config.activeToken = existingParsed.activeToken || '';
      }
    }

    db.prepare(`
      INSERT INTO system_settings (key, value)
      VALUES ('tunnel_config', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(config));

    // Spawn the background cloudflared daemon
    startTunnel(config.activeToken);

    return NextResponse.json({
      success: true,
      status: 'connecting',
      subdomain: targetSubdomain
    });

  } catch (err) {
    console.error('POST Start Tunnel Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getGlobalDb();

    // Kill background process
    stopTunnel();

    // Update isConnected flag in database settings
    const existingRow = db.prepare("SELECT value FROM system_settings WHERE key = 'tunnel_config'").get();
    if (existingRow && existingRow.value) {
      const config = JSON.parse(existingRow.value);
      config.isConnected = false;
      
      db.prepare(`
        UPDATE system_settings
        SET value = ?
        WHERE key = 'tunnel_config'
      `).run(JSON.stringify(config));
    }

    return NextResponse.json({
      success: true,
      status: 'stopped'
    });

  } catch (err) {
    console.error('DELETE Stop Tunnel Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
