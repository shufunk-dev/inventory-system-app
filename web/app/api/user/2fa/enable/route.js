import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getGlobalDb } from '@/lib/db';
import { verifyToken } from '@/lib/totp';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
    }

    const db = await getGlobalDb();
    const dbUser = db.prepare('SELECT twoFactorSecret FROM users WHERE id = ?').get(user.id);
    
    if (!dbUser || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: '2FA has not been initialized.' }, { status: 400 });
    }

    const isValid = verifyToken(dbUser.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 400 });
    }

    // Generate 8 user-friendly offline recovery codes
    const plainCodes = [];
    const hashedCodes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < 8; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        if (j === 4) code += '-';
        code += chars[crypto.randomBytes(1)[0] % chars.length];
      }
      plainCodes.push(code);
      const hash = await bcrypt.hash(code, 8);
      hashedCodes.push(hash);
    }

    // Enable 2FA and save recovery code hashes
    db.prepare('UPDATE users SET twoFactorEnabled = 1, recoveryCodes = ? WHERE id = ?').run(
      JSON.stringify(hashedCodes),
      user.id
    );

    return NextResponse.json({
      success: true,
      recoveryCodes: plainCodes
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
