import test from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';

// Setup isolated testing environment directory before importing any modules
process.env.USER_DATA_PATH = path.resolve(process.cwd(), 'test_data_auth');

import { getDb, closeDb } from '../lib/db.js';
import { closeAllConnections } from '../lib/dbManager.js';
import { generateSecret, verifyToken } from '../lib/totp.js';
import crypto from 'crypto';

// Helper to decode Base32 strings to buffers
function base32Decode(base32Str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '');
  let bits = '';

  for (let i = 0; i < cleanStr.length; i++) {
    const val = alphabet.indexOf(cleanStr[i]);
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const byte = parseInt(bits.slice(i, i + 8), 2);
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function generateToken(secret) {
  const key = base32Decode(secret.secret || secret);
  const timeStep = 30;
  const currentEpoch = Math.floor(Date.now() / 1000);
  const currentTimeStep = Math.floor(currentEpoch / timeStep);

  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(currentTimeStep, 4);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buf);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const binary = ((hmacResult[offset] & 0x7f) << 24) |
                 ((hmacResult[offset + 1] & 0xff) << 16) |
                 ((hmacResult[offset + 2] & 0xff) << 8) |
                 (hmacResult[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

function cleanupTestData() {
  closeDb();
  closeAllConnections();
  global.dbMigrationsRun = false;
  const testDir = path.resolve(process.cwd(), 'test_data_auth');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// Helper to simulate request payload routing to /api/auth/register
async function simulateRegisterRequest({ email, password, host = 'localhost:3000' }) {
  const { POST } = await import('../app/api/auth/register/route.js');
  
  const mockRequest = {
    json: async () => ({ email, password }),
    headers: {
      get: (headerName) => {
        if (headerName === 'host') return host;
        return null;
      }
    }
  };

  const response = await POST(mockRequest);
  const data = await response.json();
  return { status: response.status, data };
}

// Helper to simulate GET request routing to /api/auth/verify-email
async function simulateVerifyEmailRequest({ token, host = 'localhost:3000' }) {
  const { GET } = await import('../app/api/auth/verify-email/route.js');
  
  const mockRequest = {
    url: `http://${host}/api/auth/verify-email?token=${token}`
  };

  const response = await GET(mockRequest);
  return { 
    status: response.status, 
    headers: {
      get: (h) => response.headers.get(h)
    }
  };
}

// Helper to simulate request payload routing to /api/auth/login
async function simulateLoginRequest({ email, password }) {
  const { POST } = await import('../app/api/auth/login/route.js');
  
  const mockRequest = {
    json: async () => ({ email, password })
  };

  const response = await POST(mockRequest);
  const data = await response.json();
  return { status: response.status, data };
}

// Helper to simulate request payload routing to /api/auth/reset-password
async function simulateResetPasswordRequest({ token, newPassword }) {
  const { POST } = await import('../app/api/auth/reset-password/route.js');
  
  const mockRequest = {
    json: async () => ({ token, newPassword })
  };

  const response = await POST(mockRequest);
  const data = await response.json();
  return { status: response.status, data };
}

// Helper to simulate request payload routing to /api/user/change-password
async function simulateChangePasswordRequest({ currentPassword, newPassword, sessionCookie }) {
  const { POST } = await import('../app/api/user/change-password/route.js');
  
  // Set the global mockSessionCookie that our getCookies() / getDb() overrides use
  global.mockSessionCookie = sessionCookie;

  const mockRequest = {
    json: async () => ({ currentPassword, newPassword })
  };

  try {
    const response = await POST(mockRequest);
    const data = await response.json();
    return { status: response.status, data };
  } finally {
    // Clean up
    delete global.mockSessionCookie;
  }
}

// Helper to simulate request payload routing to /api/admin/users
async function simulateAdminCreateUserRequest({ email, password, role, displayName, sessionCookie }) {
  const { POST } = await import('../app/api/admin/users/route.js');

  global.mockSessionCookie = sessionCookie;

  const mockRequest = {
    json: async () => ({ email, password, role, displayName })
  };

  try {
    const response = await POST(mockRequest);
    const data = await response.json();
    return { status: response.status, data };
  } finally {
    delete global.mockSessionCookie;
  }
}

test.describe('Authentication, Onboarding, & 2FA Security Infrastructure', () => {

  test.beforeEach(() => {
    cleanupTestData();
    // Clear process env so we test database gating properly
    delete process.env.SMTP_HOST;
    delete process.env.SAAS_MODE;
    process.env.DEFAULT_TENANT_ID = 'test-tenant';
  });

  test.after(() => {
    cleanupTestData();
  });

  test('Auto-Bootstraps first user as active Admin', async () => {
    const { status, data } = await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });

    assert.strictEqual(status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.isFirstUser, true);

    const db = await getDb();
    const admin = db.prepare('SELECT email, tier, activeTier, isAdmin, isRoot, role, status FROM users WHERE email = ?').get('owner@system.com');
    assert.ok(admin);
    assert.strictEqual(admin.isAdmin, 1);
    assert.strictEqual(admin.isRoot, 1);
    assert.strictEqual(admin.role, 'admin');
    assert.strictEqual(admin.status, 'active');
    assert.strictEqual(admin.tier, 'premium');
    assert.strictEqual(admin.activeTier, 'premium');
  });

  test('Subsequent user registration gates correctly (SMTP disabled vs enabled)', async () => {
    process.env.SAAS_MODE = 'true';
    // 1. Create first user to bootstrap system
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });

    // 2. Try registering second user with SMTP disabled - must fail with 403
    const resBlocked = await simulateRegisterRequest({
      email: 'staff1@system.com',
      password: 'staffpassword'
    });
    assert.strictEqual(resBlocked.status, 403);
    assert.match(resBlocked.data.error, /disabled/);

    const db = await getDb();
    const checkStaff1 = db.prepare('SELECT id FROM users WHERE email = ?').get('staff1@system.com');
    assert.ok(!checkStaff1, 'Staff 1 should not be in DB when registration is disabled');

    // 3. Enable SMTP configuration in settings
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").run(
      'smtp_config', 
      JSON.stringify({ host: 'smtp.mailtrap.io', port: 587, user: 'test', pass: 'test', from: 'test@system.com' })
    );

    // 4. Try registering second user again - must succeed with status pending
    const resAllowed = await simulateRegisterRequest({
      email: 'staff2@system.com',
      password: 'staffpassword'
    });
    assert.strictEqual(resAllowed.status, 200);
    assert.strictEqual(resAllowed.data.pendingVerification, true);

    const staff2 = db.prepare('SELECT status, role, verificationToken, verificationExpiresAt FROM users WHERE email = ?').get('staff2@system.com');
    assert.ok(staff2);
    assert.strictEqual(staff2.status, 'pending');
    assert.strictEqual(staff2.role, 'staff');
    assert.ok(staff2.verificationToken);
    assert.ok(staff2.verificationExpiresAt > Date.now());
  });

  test('Email activation flow activates pending accounts', async () => {
    process.env.SAAS_MODE = 'true';
    // 1. Setup admin and enable SMTP
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });
    const db = await getDb();
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").run(
      'smtp_config', 
      JSON.stringify({ host: 'smtp.mailtrap.io', port: 587 })
    );

    // 2. Register user
    await simulateRegisterRequest({
      email: 'staff@system.com',
      password: 'staffpassword'
    });
    const user = db.prepare('SELECT verificationToken FROM users WHERE email = ?').get('staff@system.com');
    assert.ok(user.verificationToken);

    // 3. Activate token via GET request simulation
    const resVerify = await simulateVerifyEmailRequest({ token: user.verificationToken });
    
    // Should redirect user to login page with verified parameter
    assert.strictEqual(resVerify.status, 307); // Next.js redirect code
    const location = resVerify.headers.get('location');
    assert.match(location, /verified=true/);

    // 4. Check user status in database (should be active and token cleared)
    const activatedUser = db.prepare('SELECT status, verificationToken, verificationExpiresAt FROM users WHERE email = ?').get('staff@system.com');
    assert.strictEqual(activatedUser.status, 'active');
    assert.strictEqual(activatedUser.verificationToken, null);
    assert.strictEqual(activatedUser.verificationExpiresAt, null);
  });

  test('RFC 6238 TOTP Engine functionality', () => {
    const { secret, otpauthUrl } = generateSecret();
    assert.ok(secret);
    assert.ok(otpauthUrl);
    assert.strictEqual(secret.length, 10);

    // Generate token for current time
    const token = generateToken(secret);
    assert.strictEqual(token.length, 6);
    assert.match(token, /^[0-9]{6}$/);

    // Verify token
    const isValid = verifyToken(secret, token);
    assert.strictEqual(isValid, true);

    // Verify invalid token fails
    const isInvalid = verifyToken(secret, '999999');
    assert.strictEqual(isInvalid, false);
  });

  test('Forced password reset flow on login', async () => {
    // 1. Setup admin
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });
    
    // 2. Set forcePasswordReset = 1 in the database for the user
    const db = await getDb();
    db.prepare('UPDATE users SET forcePasswordReset = 1 WHERE email = ?').run('owner@system.com');
    
    // 3. Try to log in - should return forcePasswordReset: true and a resetToken
    const loginRes = await simulateLoginRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });
    
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.forcePasswordReset, true);
    assert.ok(loginRes.data.resetToken);
    
    // Check that reset token was written to DB
    const user = db.prepare('SELECT resetPasswordToken, resetPasswordExpiresAt, forcePasswordReset FROM users WHERE email = ?').get('owner@system.com');
    assert.strictEqual(user.resetPasswordToken, loginRes.data.resetToken);
    assert.strictEqual(user.forcePasswordReset, 1);
    
    // 4. Reset password using the token
    const resetRes = await simulateResetPasswordRequest({
      token: loginRes.data.resetToken,
      newPassword: 'newsecurepassword123'
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data.success, true);
    
    // Check that DB is updated (forcePasswordReset is cleared, password changed)
    const updatedUser = db.prepare('SELECT passwordHash, resetPasswordToken, forcePasswordReset FROM users WHERE email = ?').get('owner@system.com');
    assert.strictEqual(updatedUser.resetPasswordToken, null);
    assert.strictEqual(updatedUser.forcePasswordReset, 0);
    
    // Verify new password is valid by logging in
    const finalLoginRes = await simulateLoginRequest({
      email: 'owner@system.com',
      password: 'newsecurepassword123'
    });
    assert.strictEqual(finalLoginRes.status, 200);
    assert.strictEqual(finalLoginRes.data.success, true);
    assert.strictEqual(finalLoginRes.data.forcePasswordReset, undefined);
  });

  test('User password change with current password verification', async () => {
    // 1. Bootstrap first user as active Admin
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });

    const db = await getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get('owner@system.com');
    assert.ok(user);

    const { encrypt } = await import('../lib/jwt.js');
    const sessionCookie = await encrypt({ userId: user.id, tenantId: null });

    // 2. Try to change password without a session cookie - should fail with 401
    const resNoSession = await simulateChangePasswordRequest({
      currentPassword: 'mypassword123',
      newPassword: 'newsecurepassword123',
      sessionCookie: null
    });
    assert.strictEqual(resNoSession.status, 401);
    assert.strictEqual(resNoSession.data.error, 'Unauthorized');

    // 3. Try to change password with incorrect current password - should fail with 400
    const resWrongCurrent = await simulateChangePasswordRequest({
      currentPassword: 'wrongcurrentpassword',
      newPassword: 'newsecurepassword123',
      sessionCookie
    });
    assert.strictEqual(resWrongCurrent.status, 400);
    assert.strictEqual(resWrongCurrent.data.error, 'Incorrect current password.');

    // 4. Try to change password with too short new password - should fail with 400
    const resTooShort = await simulateChangePasswordRequest({
      currentPassword: 'mypassword123',
      newPassword: '123',
      sessionCookie
    });
    assert.strictEqual(resTooShort.status, 400);
    assert.match(resTooShort.data.error, /at least 6 characters/);

    // 5. Change password successfully with correct current password
    const resSuccess = await simulateChangePasswordRequest({
      currentPassword: 'mypassword123',
      newPassword: 'newsecurepassword123',
      sessionCookie
    });
    assert.strictEqual(resSuccess.status, 200);
    assert.strictEqual(resSuccess.data.success, true);

    // 6. Verify old password no longer works for login
    const loginOldRes = await simulateLoginRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });
    assert.strictEqual(loginOldRes.status, 401);

    // 7. Verify new password works for login
    const loginNewRes = await simulateLoginRequest({
      email: 'owner@system.com',
      password: 'newsecurepassword123'
    });
    assert.strictEqual(loginNewRes.status, 200);
    assert.strictEqual(loginNewRes.data.success, true);
  });

  test('Local Mode blocks subsequent user self-registration', async () => {
    process.env.SAAS_MODE = 'false';

    // 1. Bootstrap admin
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });

    // 2. Try registering a second user - must fail with 403 even if SMTP is configured
    const db = await getDb();
    db.prepare("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)").run(
      'smtp_config', 
      JSON.stringify({ host: 'smtp.mailtrap.io', port: 587, user: 'test', pass: 'test', from: 'test@system.com' })
    );

    const resBlocked = await simulateRegisterRequest({
      email: 'staff@system.com',
      password: 'staffpassword'
    });
    assert.strictEqual(resBlocked.status, 403);
    assert.match(resBlocked.data.error, /disabled in local mode/);
  });

  test('Admin manual user creation is secured and fully active', async () => {
    // 1. Bootstrap admin
    await simulateRegisterRequest({
      email: 'owner@system.com',
      password: 'mypassword123'
    });

    const db = await getDb();
    const adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('owner@system.com');
    
    const { encrypt } = await import('../lib/jwt.js');
    const adminSessionCookie = await encrypt({ userId: adminUser.id, tenantId: null });

    // 2. Try creating user without session - should fail with 401
    const resNoSession = await simulateAdminCreateUserRequest({
      email: 'staff@store.com',
      password: 'staffpassword123',
      role: 'staff',
      displayName: 'Staff Person',
      sessionCookie: null
    });
    assert.strictEqual(resNoSession.status, 401);

    // 3. Create user successfully as admin
    const resSuccess = await simulateAdminCreateUserRequest({
      email: 'staff@store.com',
      password: 'staffpassword123',
      role: 'staff',
      displayName: 'Staff Person',
      sessionCookie: adminSessionCookie
    });
    assert.strictEqual(resSuccess.status, 200);
    assert.strictEqual(resSuccess.data.success, true);
    assert.ok(resSuccess.data.userId);

    // 4. Verify user was created directly active and can log in immediately
    const staffUser = db.prepare('SELECT status, role, displayName FROM users WHERE email = ?').get('staff@store.com');
    assert.ok(staffUser);
    assert.strictEqual(staffUser.status, 'active');
    assert.strictEqual(staffUser.role, 'staff');
    assert.strictEqual(staffUser.displayName, 'Staff Person');

    const loginRes = await simulateLoginRequest({
      email: 'staff@store.com',
      password: 'staffpassword123'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.success, true);
  });

});

