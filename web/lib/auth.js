import { getDb } from './db.js';
import { encrypt, decrypt } from './jwt.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function getCookies() {
  try {
    const { cookies } = require('next/headers');
    return cookies();
  } catch (e) {
    // Return a mock fallback cookie store for testing environments
    return {
      get: () => null,
      set: () => {},
      delete: () => {}
    };
  }
}

export async function createSession(userId, tenantId = null) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, tenantId, expiresAt });

  const cookieStore = await getCookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await getCookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await getCookies();
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
