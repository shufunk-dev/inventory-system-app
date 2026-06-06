import { getGlobalDb } from '../../../../lib/db.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=Invalid token', request.url));
    }

    const db = await getGlobalDb();

    // Check if user matches token and has not expired
    const user = db.prepare('SELECT id, verificationExpiresAt FROM users WHERE verificationToken = ?').get(token);

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=Token not found or already verified', request.url));
    }

    if (user.verificationExpiresAt < Date.now()) {
      return NextResponse.redirect(new URL('/login?error=Verification link has expired', request.url));
    }

    // Activate the user
    db.prepare('UPDATE users SET status = ?, verificationToken = NULL, verificationExpiresAt = NULL WHERE id = ?').run(
      'active', user.id
    );

    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Verification route error:', error);
    return NextResponse.redirect(new URL('/login?error=Internal server error', request.url));
  }
}
