import { getGlobalDb } from '../../../lib/db.js';
import { getRegistryDb, registerTenantUser, getTenantDb, tenantStorage } from '../../../lib/dbManager.js';
import { validateLicenseKey } from '../../../lib/license.js';
import { createSession } from '../../../lib/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  // Mock NextResponse for standalone Node.js testing runner
  NextResponse = {
    json: (body, init) => {
      return {
        status: init?.status || 200,
        json: async () => body
      };
    }
  };
}

export async function POST(request) {
  try {
    const { email, password, licenseKey } = await request.json();

    if (!email || !password || password.length < 6 || !licenseKey) {
      return NextResponse.json({ error: 'Valid email, password (min 6 chars), and license key are required.' }, { status: 400 });
    }

    // 1. Validate the license key offline
    const license = validateLicenseKey(licenseKey);
    if (!license.isValid) {
      return NextResponse.json({ error: 'Invalid or corrupted license key.' }, { status: 400 });
    }

    if (license.type === 'upgrade') {
      return NextResponse.json({ error: 'Upgrade keys must be applied from within the settings dashboard.' }, { status: 400 });
    }

    const systemMode = (license.type === 'trial' || license.type === 'trial_5m') ? 'store' : license.type; // 'collector' or 'store'
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // ----------------------------------------------------
    // CASE A: SaaS Cloud-Hosted Mode
    // ----------------------------------------------------
    if (process.env.SAAS_MODE === 'true') {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already registered in the central tenant registry
      const rdb = getRegistryDb();
      const existingMapping = rdb.prepare('SELECT tenant_id FROM tenant_registry WHERE email = ?').get(normalizedEmail);
      if (existingMapping) {
        return NextResponse.json({ error: 'This email is already registered to a hosted tenant database.' }, { status: 400 });
      }

      // Generate a unique tenant ID and register it
      const tenantId = `tenant_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
      registerTenantUser(normalizedEmail, tenantId);

      // Resolve and initialize the new tenant database
      const tenantDb = getTenantDb(tenantId);
      
      // Insert the primary Admin user into this tenant database
      tenantDb.prepare(`
        INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, normalizedEmail, passwordHash, 'premium', 'premium', 1, 1, Date.now());

      // Save license settings inside the tenant database
      tenantDb.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
        .run('system_mode', systemMode);
      tenantDb.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
        .run('license_key', licenseKey);
      if (license.type === 'trial' || license.type === 'trial_5m') {
        tenantDb.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
          .run('license_activated_at', Date.now().toString());
      }

      // Create browser login session
      await createSession(userId, tenantId);

      return NextResponse.json({ success: true, mode: systemMode, tenantId });
    }

    // ----------------------------------------------------
    // CASE B: Local-First / Desktop / Offline Mode
    // ----------------------------------------------------
    const db = await getGlobalDb();
    
    // In local mode, setup is only allowed if there are no existing admin users
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 1').get().count;
    if (userCount > 0) {
      return NextResponse.json({ error: 'System is already configured. Setup wizard is permanently locked.' }, { status: 403 });
    }

    // Write admin record to local database
    db.prepare(`
      INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, isRoot, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, passwordHash, 'premium', 'premium', 1, 1, Date.now());

    // Save operating mode and key
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
      .run('system_mode', systemMode);
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
      .run('license_key', licenseKey);
    if (license.type === 'trial' || license.type === 'trial_5m') {
      db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
        .run('license_activated_at', Date.now().toString());
    }

    // Create session cookie
    await createSession(userId);

    return NextResponse.json({ success: true, mode: systemMode });

  } catch (error) {
    console.error('[setup_route] Onboarding failure:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
