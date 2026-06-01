import { getDb } from '@/lib/db';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Users, ShieldAlert } from 'lucide-react';
import UserTierDropdown from '@/components/UserTierDropdown';
import SystemUpdatePanel from '@/components/SystemUpdatePanel';

export default async function AdminPage() {
  const currentUser = await getUser();

  if (!currentUser || currentUser.isAdmin !== 1) {
    redirect('/');
  }

  const db = getDb();
  
  // Fetch all users
  let users;
  if (currentUser.isRoot === 1) {
    users = db.prepare('SELECT id, email, tier, isAdmin, isRoot, createdAt FROM users ORDER BY createdAt ASC').all();
  } else {
    users = db.prepare('SELECT id, email, tier, isAdmin, isRoot, createdAt FROM users WHERE isRoot = 0 ORDER BY createdAt ASC').all();
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
          <div className="bg-blue-500/20 p-4 rounded-2xl text-blue-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Admin Control Panel</h1>
            <p className="text-gray-400">Manage user accounts and subscription tiers.</p>
          </div>
        </div>

        <SystemUpdatePanel />

        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-800">
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Subscription Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-gray-500">{u.id.substring(0, 8)}...</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{u.email}</span>
                        {u.isAdmin === 1 && (
                          <ShieldAlert className="w-4 h-4 text-blue-400" title="Admin User" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <UserTierDropdown user={u} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No users found.
            </div>
          )}
        </div>
    </>
  );
}
