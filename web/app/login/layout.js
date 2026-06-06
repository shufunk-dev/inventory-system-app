import { getGlobalDb } from '@/lib/db.js';
import { redirect } from 'next/navigation';

export default async function LoginLayout({ children }) {
  // In Local-First Mode, redirect to the onboarding wizard if no admin exists
  let shouldRedirect = false;
  if (process.env.SAAS_MODE !== 'true') {
    try {
      const db = await getGlobalDb();
      const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE isRoot = 1').get().count;
      if (adminCount === 0) {
        shouldRedirect = true;
      }
    } catch (e) {
      console.error('[login_layout] Failed to check admin count:', e);
    }
    if (shouldRedirect) {
      redirect('/setup');
    }
  }

  return <>{children}</>;
}
