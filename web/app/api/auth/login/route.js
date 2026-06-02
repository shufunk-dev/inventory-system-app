import { getDb } from '../../../../lib/db.js';
import bcrypt from 'bcryptjs';
import { createSession } from '../../../../lib/auth.js';
import { resolveTenantIdByEmail, tenantStorage } from '../../../../lib/dbManager.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let NextResponse;
try {
  const nextServer = require('next/server');
  NextResponse = nextServer.NextResponse;
} catch (e) {
  // Fallback mock for testing in raw Node.js environment
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

    // 1. Check for global Super Admin credentials (Option A)
    const superEmail = process.env.SUPER_ADMIN_EMAIL;
    const superHash = process.env.SUPER_ADMIN_HASH;

    if (superEmail && normalizedEmail === superEmail.toLowerCase().trim()) {
      const isMatch = await bcrypt.compare(password, superHash);
      if (isMatch) {
        // Create support session mapped to 'super-admin'
        await createSession('super-admin-root', 'super-admin');
        return NextResponse.json({ success: true, isSuperAdmin: true });
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

    // Helper to query user in the resolved database context
    const queryUser = () => {
      const db = getDb();
      return db.prepare('SELECT id, passwordHash FROM users WHERE email = ?').get(normalizedEmail);
    };

    const user = tenantId 
      ? tenantStorage.run({ tenantId }, () => queryUser())
      : queryUser();

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // Log the user into their session (passing tenantId in SaaS mode)
    await createSession(user.id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
