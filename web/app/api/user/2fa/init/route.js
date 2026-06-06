import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { getGlobalDb } from '@/lib/db';
import { generateSecret } from '@/lib/totp';

export async function POST(request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getGlobalDb();
    const { secret, otpauthUrl } = generateSecret(user.email, 'InventorySystem');

    // Save the secret temporarily. We do not enable 2FA until they verify their first code.
    db.prepare('UPDATE users SET twoFactorSecret = ?, twoFactorEnabled = 0 WHERE id = ?').run(
      secret, user.id
    );

    return NextResponse.json({
      secret,
      otpauthUrl
    });
  } catch (error) {
    console.error('2FA init error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
