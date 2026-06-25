import { getDb, getGlobalDb } from './db.js';
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
      get: (key) => {
        if (key === 'session' && global.mockSessionCookie) {
          return { value: global.mockSessionCookie };
        }
        return null;
      },
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
    secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function createSupportSession(supportEmail, supportName, expiresAt) {
  // Absolute cap of 24 hours from now
  const maxExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const finalExpiry = expiresAt < maxExpiry ? expiresAt : maxExpiry;

  const session = await encrypt({
    userId: 'support-admin-session',
    supportEmail,
    supportName,
    expiresAt: finalExpiry
  });

  const cookieStore = await getCookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.SECURE_COOKIES !== 'false',
    expires: finalExpiry,
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
  let session = cookieStore.get('session')?.value;

  if (!session) {
    try {
      const { headers } = require('next/headers');
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        session = authHeader.substring(7);
      }
    } catch (e) {
      // Fallback outside request context or in tests
      if (global.mockSessionCookie) {
        session = global.mockSessionCookie;
      }
    }
  }

  if (!session) return null;
  return await decrypt(session);
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;
  
  if (session.userId === 'super-admin-root') {
    return {
      id: 'super-admin-root',
      email: process.env.SUPER_ADMIN_EMAIL || 'support@system.com',
      tier: 'premium',
      activeTier: 'premium',
      isAdmin: 1,
      isRoot: 1,
      isSuperAdmin: true
    };
  }

  if (session.userId === 'support-admin-session') {
    return {
      id: 'support-admin-session',
      email: session.supportEmail || 'support@shufeltdesigns.com',
      displayName: session.supportName || 'Remote Support Admin',
      tier: 'premium',
      activeTier: 'premium',
      isAdmin: 1,
      isRoot: 1,
      isSupportAdmin: true
    };
  }
  
  const db = await getGlobalDb();
  const user = db.prepare('SELECT id, email, tier, activeTier, isAdmin, isRoot, role, displayName, profilePicture, storeId FROM users WHERE id = ?').get(session.userId);
  return user || null;
}
