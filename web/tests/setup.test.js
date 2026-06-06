import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from '../lib/db.js';
import { getTenantDbPath, getRegistryDbPath, closeAllConnections, getTenantDb, getRegistryDb } from '../lib/dbManager.js';
import { generateLicenseKey } from '../lib/license.js';

// Setup isolated testing environment directory
process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data_setup');

function cleanupTestData() {
  closeDb();
  closeAllConnections();
  const testDir = path.resolve(process.cwd(), 'test_data_setup');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// Helper to simulate request payload routing to /api/setup
async function simulateSetupRequest({ email, password, licenseKey, saasMode }) {
  process.env.SAAS_MODE = saasMode ? 'true' : 'false';
  
  // Dynamically load API route handler to read live environment changes
  const { POST } = await import('../app/api/setup/route.js');
  
  const mockRequest = {
    json: async () => ({ email, password, licenseKey })
  };

  const response = await POST(mockRequest);
  const data = await response.json();
  return { status: response.status, data };
}

test.describe('Onboarding Setup Wizard API (/api/setup)', () => {

  test.beforeEach(() => {
    cleanupTestData();
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Local Mode Onboarding: Creates admin user and locks wizard', async () => {
    const licenseKey = generateLicenseKey('store'); // Type B: Store Mode
    
    // First setup attempt should succeed
    const { status, data } = await simulateSetupRequest({
      email: 'owner@localstore.com',
      password: 'mypassword123',
      licenseKey,
      saasMode: false
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.mode, 'store');

    // Verify local DB entries
    const db = await getDb();
    const admin = db.prepare('SELECT email, tier, activeTier, isAdmin, isRoot FROM users WHERE email = ?').get('owner@localstore.com');
    assert.ok(admin, 'Admin user should be registered');
    assert.strictEqual(admin.isAdmin, 1);
    assert.strictEqual(admin.isRoot, 1);
    assert.strictEqual(admin.tier, 'premium');

    const modeSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'system_mode'").get();
    assert.strictEqual(modeSetting.value, 'store');

    const keySetting = db.prepare("SELECT value FROM system_settings WHERE key = 'license_key'").get();
    assert.strictEqual(keySetting.value, licenseKey);

    // Second setup attempt must be locked out
    const secondTry = await simulateSetupRequest({
      email: 'attacker@localstore.com',
      password: 'attackerpassword',
      licenseKey,
      saasMode: false
    });
    assert.strictEqual(secondTry.status, 403);
    assert.match(secondTry.data.error, /already configured/);
  });

  test('SaaS Mode Onboarding: Registers tenant in registry, creates separate DB', async () => {
    const licenseKey = generateLicenseKey('collector'); // Type A: Collector Mode

    const { status, data } = await simulateSetupRequest({
      email: 'collector@saashost.com',
      password: 'saaspassword123',
      licenseKey,
      saasMode: true
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.mode, 'collector');
    assert.ok(data.tenantId, 'Tenant ID should be returned in SaaS onboarding response');

    const tenantId = data.tenantId;

    // Verify central registry mapping
    const registry = getRegistryDb();
    const row = registry.prepare('SELECT tenant_id FROM tenant_registry WHERE email = ?').get('collector@saashost.com');
    assert.strictEqual(row.tenant_id, tenantId);

    // Verify physical tenant file exists
    const tenantDbFile = getTenantDbPath(tenantId);
    assert.ok(fs.existsSync(tenantDbFile), 'Physical tenant database file should exist');

    // Verify tenant-specific admin details
    const tenantDb = getTenantDb(tenantId);
    const admin = tenantDb.prepare('SELECT email, tier, isAdmin, isRoot FROM users WHERE email = ?').get('collector@saashost.com');
    assert.ok(admin, 'Admin should exist in tenant DB');
    assert.strictEqual(admin.isRoot, 1);

    const modeSetting = tenantDb.prepare("SELECT value FROM system_settings WHERE key = 'system_mode'").get();
    assert.strictEqual(modeSetting.value, 'collector');
  });

  test('Input Validation & Invalid License Keys', async () => {
    // Test empty inputs
    const emptyRes = await simulateSetupRequest({
      email: '',
      password: '',
      licenseKey: '',
      saasMode: false
    });
    assert.strictEqual(emptyRes.status, 400);

    // Test invalid license key
    const invalidKeyRes = await simulateSetupRequest({
      email: 'user@test.com',
      password: 'password123',
      licenseKey: 'INVALID-KEY-FORMAT',
      saasMode: false
    });
    assert.strictEqual(invalidKeyRes.status, 400);
    assert.match(invalidKeyRes.data.error, /Invalid or corrupted/);
  });

});
