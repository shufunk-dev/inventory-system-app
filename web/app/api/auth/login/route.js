import { getGlobalDb } from '../../../../lib/db.js';
import bcrypt from 'bcryptjs';
import { createSession } from '../../../../lib/auth.js';
import { resolveTenantIdByEmail, tenantStorage } from '../../../../lib/dbManager.js';
import { encryptTemp, encrypt } from '../../../../lib/jwt.js';
import { createRequire } from 'module';
import crypto from 'crypto';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check for global Super Admin credentials
    const superEmail = process.env.SUPER_ADMIN_EMAIL;
    const superHash = process.env.SUPER_ADMIN_HASH;

    if (superEmail && normalizedEmail === superEmail.toLowerCase().trim()) {
      const isMatch = await bcrypt.compare(password, superHash);
      if (isMatch) {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const sessionToken = await encrypt({ userId: 'super-admin-root', tenantId: 'super-admin', expiresAt });
        await createSession('super-admin-root', 'super-admin');
        return NextResponse.json({ success: true, isSuperAdmin: true, token: sessionToken });
      }
    }

    // 2. Standard Client Login
    let tenantId = null;
    if (process.env.SAAS_MODE === 'true') {
      tenantId = resolveTenantIdByEmail(normalizedEmail);
      if (!tenantId) {
        return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
      }
    }

    const queryUser = async () => {
      const db = await getGlobalDb();
      return db.prepare('SELECT id, passwordHash, status, twoFactorEnabled, forcePasswordReset FROM users WHERE email = ?').get(normalizedEmail);
    };

    const user = tenantId 
      ? await tenantStorage.run({ tenantId }, () => queryUser())
      : await queryUser();

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Please verify your email address to active your account.' }, { status: 403 });
    }

    if (user.forcePasswordReset === 1) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      const db = await getGlobalDb();
      const updateFn = () => {
        db.prepare('UPDATE users SET resetPasswordToken = ?, resetPasswordExpiresAt = ? WHERE id = ?').run(
          resetToken, resetExpiresAt, user.id
        );
      };
      
      if (tenantId) {
        tenantStorage.run({ tenantId }, () => updateFn());
      } else {
        updateFn();
      }

      return NextResponse.json({ 
        success: true, 
        forcePasswordReset: true, 
        resetToken 
      });
    }

    if (user.twoFactorEnabled === 1) {
      const tempToken = await encryptTemp({ userId: user.id, tenantId });
      return NextResponse.json({ 
        success: true, 
        twoFactorRequired: true, 
        tempToken 
      });
    }

    // Generate the session token so it can be returned in the response body for API clients
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt({ userId: user.id, tenantId, expiresAt });

    await createSession(user.id, tenantId);

    return NextResponse.json({ success: true, token: sessionToken });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
