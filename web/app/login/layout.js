import { getDb } from '@/lib/db.js';
import { redirect } from 'next/navigation';

export default async function LoginLayout({ children }) {
  // In Local-First Mode, redirect to the onboarding wizard if no admin exists
  if (process.env.SAAS_MODE !== 'true') {
    try {
      const db = getDb();
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 1').get().count;
      if (adminCount === 0) {
        redirect('/setup');
      }
    } catch (e) {
      console.error('[login_layout] Failed to check admin count:', e);
    }
  }

  return <>{children}</>;
}
