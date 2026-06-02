import { cookies } from 'next/headers';
import { getDb } from './db.js';
import { encrypt, decrypt } from './jwt.js';

export async function createSession(userId, tenantId = null) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, tenantId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;
  
  const db = getDb();
  const user = db.prepare('SELECT id, email, tier, activeTier, isAdmin, isRoot FROM users WHERE id = ?').get(session.userId);
  return user || null;
}
