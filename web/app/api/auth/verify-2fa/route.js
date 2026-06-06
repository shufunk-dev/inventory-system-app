import { NextResponse } from 'next/server';
import { getGlobalDb } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { decrypt } from '@/lib/jwt';
import { verifyToken } from '@/lib/totp';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { tempToken, code } = await request.json();

    if (!tempToken || !code) {
      return NextResponse.json({ error: 'Token and code are required.' }, { status: 400 });
    }

    // Decrypt the short-lived temp token
    const payload = await decrypt(tempToken);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Session expired. Please log in again.' }, { status: 400 });
    }

    const { userId, tenantId } = payload;
    const db = await getGlobalDb();

    // Query user
    const user = db.prepare('SELECT twoFactorSecret, recoveryCodes FROM users WHERE id = ?').get(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 400 });
    }

    // 1. Try TOTP code verification
    const isTotpValid = verifyToken(user.twoFactorSecret, code);
    if (isTotpValid) {
      await createSession(userId, tenantId);
      return NextResponse.json({ success: true });
    }

    // 2. Try offline recovery code verification
    if (user.recoveryCodes) {
      try {
        const hashedCodes = JSON.parse(user.recoveryCodes);
        let matchedIndex = -1;

        for (let i = 0; i < hashedCodes.length; i++) {
          const match = await bcrypt.compare(code.trim().toUpperCase(), hashedCodes[i]);
          if (match) {
            matchedIndex = i;
            break;
          }
        }

        if (matchedIndex !== -1) {
          // Remove the matched recovery code (one-time use)
          hashedCodes.splice(matchedIndex, 1);
          
          db.prepare('UPDATE users SET recoveryCodes = ? WHERE id = ?').run(
            JSON.stringify(hashedCodes),
            userId
          );

          await createSession(userId, tenantId);
          return NextResponse.json({ success: true, recoveryCodeUsed: true });
        }
      } catch (e) {
        console.error('Failed to parse recovery codes:', e);
      }
    }

    return NextResponse.json({ error: 'Invalid verification code or recovery code.' }, { status: 400 });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
