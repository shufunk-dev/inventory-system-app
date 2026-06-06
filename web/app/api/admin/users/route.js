import { getGlobalDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function POST(request) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email: rawEmail, password, role, displayName, storeId } = await request.json();

    if (!rawEmail || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password (min 6 chars) required.' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const db = await getGlobalDb();

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const finalDisplayName = displayName || email.split('@')[0];
    const finalRole = role === 'admin' ? 'admin' : 'staff';
    const finalIsAdmin = finalRole === 'admin' ? 1 : 0;
    const finalStoreId = storeId && storeId !== 'default' ? storeId : null;

    db.prepare(`
      INSERT INTO users (
        id, email, passwordHash, tier, activeTier, isAdmin, isRoot, role, status, displayName, createdAt, storeId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, email, passwordHash, 'basic', 'basic', finalIsAdmin, 0, finalRole, 'active', finalDisplayName, Date.now(), finalStoreId
    );

    return NextResponse.json({ success: true, userId: id });
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
