import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Valid email and password (min 6 chars) required.' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already registered.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    // Check if this is the very first normal user in the database (ignoring the root backdoor)
    const normalUserCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 0').get().count;
    const isFirstUser = normalUserCount === 0;

    const tier = isFirstUser ? 'premium' : 'basic';
    const activeTier = isFirstUser ? 'premium' : 'basic';
    const isAdmin = isFirstUser ? 1 : 0;

    db.prepare('INSERT INTO users (id, email, passwordHash, tier, activeTier, isAdmin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, email, passwordHash, tier, activeTier, isAdmin, Date.now()
    );

    await createSession(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
