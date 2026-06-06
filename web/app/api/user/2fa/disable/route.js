import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getGlobalDb } from '@/lib/db';
import { verifyToken } from '@/lib/totp';

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
      return NextResponse.json({ error: '2FA is not set up.' }, { status: 400 });
    }

    const isValid = verifyToken(dbUser.twoFactorSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    // Disable 2FA
    db.prepare('UPDATE users SET twoFactorEnabled = 0, twoFactorSecret = NULL, recoveryCodes = NULL WHERE id = ?').run(
      user.id
    );

    return NextResponse.json({ success: true, message: '2FA has been disabled successfully.' });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
