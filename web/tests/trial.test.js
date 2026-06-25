import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb, getMasterDb } from '../lib/db.js';
import { getTenantDbPath, getRegistryDbPath, closeAllConnections, getTenantDb, getRegistryDb } from '../lib/dbManager.js';
import { validateLicenseKey } from '../lib/license.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Setup isolated testing environment directory
process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data_trial');
process.env.NODE_ENV = 'test';

function cleanupTestData() {
  closeDb();
  closeAllConnections();
  const testDir = path.resolve(process.cwd(), 'test_data_trial');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

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

async function simulateRegisterRequest({ email, password, tenantId }) {
  const { POST } = await import('../app/api/auth/register/route.js');
  const mockRequest = {
    headers: {
      get: (name) => {
        if (name === 'host') return 'localhost:3000';
        if (name === 'x-forwarded-proto') return 'http';
        return null;
      }
    },
    json: async () => ({ email, password })
  };
  
  const response = await POST(mockRequest);
  const data = await response.json();
  return { status: response.status, data };
}

test.describe('Trial & Cloud Demo Mode system tests', () => {

  test.beforeEach(() => {
    cleanupTestData();
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Validates trial license keys correctly', () => {
    const key7d = 'TRIA-7777-7042-18B0';
    const key5m = 'TR5M-5555-E254-D0D0';

    const check7d = validateLicenseKey(key7d);
    assert.strictEqual(check7d.isValid, true);
    assert.strictEqual(check7d.type, 'trial');

    const check5m = validateLicenseKey(key5m);
    assert.strictEqual(check5m.isValid, true);
    assert.strictEqual(check5m.type, 'trial_5m');
  });

  test('Local Onboarding using TR5M key activates Store mode features and saves activated timestamp', async () => {
    const { status, data } = await simulateSetupRequest({
      email: 'trialuser@test.com',
      password: 'password123',
      licenseKey: 'TR5M-5555-E254-D0D0',
      saasMode: false
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.mode, 'store'); // mapped to store mode!

    const db = await getDb();
    const modeSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'system_mode'").get();
    assert.strictEqual(modeSetting.value, 'store');

    const activatedAt = db.prepare("SELECT value FROM system_settings WHERE key = 'license_activated_at'").get();
    assert.ok(activatedAt && activatedAt.value, 'license_activated_at timestamp should exist');
    assert.ok(parseInt(activatedAt.value) > 0);
  });

  test('Trial key self-destruct resets database back to factory wizard onboarding when expired', async () => {
    const { status } = await simulateSetupRequest({
      email: 'trialuser@test.com',
      password: 'password123',
      licenseKey: 'TR5M-5555-E254-D0D0',
      saasMode: false
    });
    assert.strictEqual(status, 200);

    // Let's manually backdate license_activated_at by 6 minutes (360,000ms ago)
    const dbBefore = getMasterDb();
    dbBefore.prepare("UPDATE system_settings SET value = ? WHERE key = 'license_activated_at'")
      .run((Date.now() - 6 * 60 * 1000).toString());

    // Make sure a test item exists to verify deletion
    dbBefore.prepare("INSERT INTO items (id, name, userId) VALUES ('test-item-id', 'Test Coin', 'some-user')").run();
    assert.strictEqual(
      dbBefore.prepare("SELECT COUNT(*) as count FROM items WHERE id = 'test-item-id'").get().count,
      1
    );

    // Close connections to clear state
    closeDb();

    // Now, obtaining getMasterDb() should trigger the self-destruct instantly because lastTrialCheck is initially 0
    const dbAfter = getMasterDb();

    // Check if master database was re-initialized empty (no users, no items)
    const userCount = dbAfter.prepare('SELECT COUNT(*) as count FROM users').get().count;
    assert.strictEqual(userCount, 0, 'Database users table should be empty after self-destruct');

    const itemCount = dbAfter.prepare('SELECT COUNT(*) as count FROM items').get().count;
    assert.strictEqual(itemCount, 0, 'Database items table should be empty after self-destruct');
  });

  test('Cloud Demo Mode (DEMO_MODE=true): Registers subsequent users instantly active without SMTP', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.SAAS_MODE = 'true';

    // 1. Initial tenant onboarding (no SMTP needed, first user is admin)
    const { status: setupStatus, data: setupData } = await simulateSetupRequest({
      email: 'admin@democloud.com',
      password: 'adminpassword',
      licenseKey: 'TR5M-5555-E254-D0D0',
      saasMode: true
    });
    assert.strictEqual(setupStatus, 200);
    const tenantId = setupData.tenantId;

    const { encrypt } = await import('../lib/jwt.js');
    global.mockSessionCookie = await encrypt({ userId: 'some-id', tenantId });

    // 2. Register subsequent user (staff) in this tenant with bogus email
    const { status: regStatus, data: regData } = await simulateRegisterRequest({
      email: 'bogus_staff_member@testing.com',
      password: 'staffpassword123',
      tenantId
    });

    assert.strictEqual(regStatus, 200);
    assert.strictEqual(regData.success, true);
    assert.strictEqual(regData.pendingVerification, false);

    // Verify staff user is instantly 'active'
    const tenantDb = getTenantDb(tenantId);
    const staff = tenantDb.prepare("SELECT status, role FROM users WHERE email = ?").get('bogus_staff_member@testing.com');
    assert.ok(staff);
    assert.strictEqual(staff.status, 'active');
    assert.strictEqual(staff.role, 'staff');

    // Clean env variables
    delete process.env.DEMO_MODE;
    delete global.mockSessionCookie;
  });

  test('Cloud Demo Mode resets non-initial tenants and files, keeping first seed tenant intact', async () => {
    process.env.DEMO_MODE = 'true';
    process.env.SAAS_MODE = 'true';

    // 1. Create first tenant (to be preserved)
    const { data: firstTenant } = await simulateSetupRequest({
      email: 'mallowner@preserved.com',
      password: 'ownerpassword',
      licenseKey: 'TR5M-5555-E254-D0D0',
      saasMode: true
    });
    const firstTenantId = firstTenant.tenantId;

    // 2. Create second tenant (to be wiped)
    const { data: secondTenant } = await simulateSetupRequest({
      email: 'temporary@wiped.com',
      password: 'temppassword',
      licenseKey: 'TR5M-5555-E254-D0D0',
      saasMode: true
    });
    const secondTenantId = secondTenant.tenantId;

    // Verify both exist
    const registryBefore = getRegistryDb();
    const countBefore = registryBefore.prepare('SELECT COUNT(*) as count FROM tenant_registry').get().count;
    assert.strictEqual(countBefore, 2);

    const firstDbFile = getTenantDbPath(firstTenantId);
    const secondDbFile = getTenantDbPath(secondTenantId);
    assert.ok(fs.existsSync(firstDbFile));
    assert.ok(fs.existsSync(secondDbFile));

    // Import performMidnightReset dynamically
    const { performMidnightReset } = await import('../lib/db.js');
    performMidnightReset();

    // Verify only the first tenant is preserved
    const registryAfter = getRegistryDb();
    const countAfter = registryAfter.prepare('SELECT COUNT(*) as count FROM tenant_registry').get().count;
    assert.strictEqual(countAfter, 1);

    const preservedRow = registryAfter.prepare('SELECT email FROM tenant_registry').get();
    assert.strictEqual(preservedRow.email, 'mallowner@preserved.com');

    assert.ok(fs.existsSync(firstDbFile), 'Preserved tenant file should still exist');
    assert.ok(!fs.existsSync(secondDbFile), 'Temporary tenant file should be deleted');

    delete process.env.DEMO_MODE;
  });

});
