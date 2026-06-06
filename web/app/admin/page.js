import { getGlobalDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Shield } from 'lucide-react';
import AdminDashboardTabs from '@/components/AdminDashboardTabs';

export default async function AdminPage() {
  const currentUser = await getUser();

  if (!currentUser || currentUser.isAdmin !== 1) {
    redirect('/');
  }

  const db = await getGlobalDb();
  
  // Fetch all users
  let users;
  if (currentUser.isRoot === 1) {
    users = db.prepare('SELECT id, email, tier, isAdmin, isRoot, role, createdAt, storeId FROM users ORDER BY createdAt ASC').all();
  } else {
    users = db.prepare('SELECT id, email, tier, isAdmin, isRoot, role, createdAt, storeId FROM users WHERE isRoot = 0 ORDER BY createdAt ASC').all();
  }

  const saasMode = process.env.SAAS_MODE === 'true';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Premium Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-400">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight">
              Admin Control Panel
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage user accounts, store profiles, payouts reports, and local system updates.</p>
          </div>
        </div>
      </div>

      <AdminDashboardTabs users={users} saasMode={saasMode} />
    </main>
  );
}

