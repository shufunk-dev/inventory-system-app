import { getGlobalDb } from '../../../../lib/db.js';
import { getUser } from '../../../../lib/auth.js';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

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
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id === 'super-admin-root') {
      return NextResponse.json({ error: 'Super Admin password is managed via environment variables and cannot be changed here.' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
    }

    const db = await getGlobalDb();
    const userRow = db.prepare('SELECT passwordHash FROM users WHERE id = ?').get(user.id);
    if (!userRow) {
      return NextResponse.json({ error: 'User not found in database.' }, { status: 404 });
    }

    const match = await bcrypt.compare(currentPassword, userRow.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET passwordHash = ?, forcePasswordReset = 0 WHERE id = ?').run(passwordHash, user.id);

    return NextResponse.json({ success: true, message: 'Password has been updated successfully.' });
  } catch (error) {
    console.error('Change password API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
