import { getGlobalDb } from '../../../../lib/db.js';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { NextResponse } = require('next/server');

export async function POST(request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Valid token and new password (min 6 chars) are required.' }, { status: 400 });
    }

    const db = await getGlobalDb();

    // Check if user matches token and has not expired
    const user = db.prepare('SELECT id, resetPasswordExpiresAt FROM users WHERE resetPasswordToken = ?').get(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    if (user.resetPasswordExpiresAt < Date.now()) {
      return NextResponse.json({ error: 'Password reset link has expired.' }, { status: 400 });
    }

    // Hash new password and update user record
    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET passwordHash = ?, resetPasswordToken = NULL, resetPasswordExpiresAt = NULL, forcePasswordReset = 0 WHERE id = ?').run(
      passwordHash, user.id
    );

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
