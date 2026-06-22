'use client';

import { useState } from 'react';
import { Users, BarChart3, Terminal } from 'lucide-react';
import AdminUsersSection from './AdminUsersSection';
import AdminStoreProfilesSection from './AdminStoreProfilesSection';
import SystemUpdatePanel from './SystemUpdatePanel';
import AdminSalesReport from './AdminSalesReport';
import TenantSalesReport from './TenantSalesReport';
import ServerLogsPanel from './ServerLogsPanel';

export default function AdminDashboardTabs({ users, saasMode, currentUser }) {
  const [activeTab, setActiveTab] = useState('management'); // 'management', 'sales', or 'logs'

  return (
    <div className="space-y-8">
      {/* Premium Pill Tabs Switcher */}
      <div className="flex flex-wrap bg-gray-900/80 backdrop-blur p-1 rounded-2xl border border-gray-800 w-fit gap-1 sm:gap-0">
        <button
          onClick={() => setActiveTab('management')}
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
            activeTab === 'management'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Users className="w-4 h-4" /> Users & Booth Listings
        </button>
        {!saasMode && (
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Mall Register Sales & Payouts
          </button>
        )}
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
          }`}
        >
          <Terminal className="w-4 h-4" /> Server Console Logs
        </button>
      </div>

      {/* Tab Body */}
      <div className="animate-in fade-in zoom-in-95 duration-200 space-y-8">
        {activeTab === 'management' ? (
          <>
            <AdminUsersSection users={users} />
            {!saasMode && currentUser?.isRoot === 1 && <AdminStoreProfilesSection />}
            {currentUser?.isRoot === 1 && <SystemUpdatePanel />}
          </>
        ) : activeTab === 'sales' ? (
          currentUser?.isRoot === 1 ? <AdminSalesReport /> : <TenantSalesReport />
        ) : (
          <ServerLogsPanel />
        )}
      </div>
    </div>
  );
}

