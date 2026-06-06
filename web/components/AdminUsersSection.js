'use client';

import { useState } from 'react';
import { Users, ShieldAlert, UserPlus } from 'lucide-react';
import UserBoothSelector from './UserBoothSelector';
import AddUserModal from './AddUserModal';

export default function AdminUsersSection({ users }) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            User Accounts
          </h2>
          <p className="text-gray-400 text-sm mt-1">Manage employee logins and subscription tiers.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 text-sm self-start sm:self-center"
        >
          <UserPlus className="w-4 h-4" />
          Add User Account
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800">
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">User Level</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Booth Access</th>
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
                    {u.isRoot === 1 ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Super Admin
                      </span>
                    ) : u.isAdmin === 1 ? (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Staff
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <UserBoothSelector user={u} />
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

      {showAddModal && (
        <AddUserModal onClose={() => setShowAddModal(false)} />
      )}
    </>
  );
}
