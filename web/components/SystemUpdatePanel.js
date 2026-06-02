'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SystemUpdatePanel() {
  const [statusInfo, setStatusInfo] = useState({ status: 'idle', message: 'Initializing...', version: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/admin/system/update');
        if (res.ok) {
          const data = await res.json();
          setStatusInfo(data);
        }
      } catch (err) {
        console.error('Failed to fetch update status', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckUpdate = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const handleInstallUpdate = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/system/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' })
      });
      setStatusInfo(prev => ({ ...prev, message: 'Server is restarting for update...' }));
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden mb-8 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            System Update
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage application updates for the local network server.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
            statusInfo.status === 'up-to-date' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            statusInfo.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            statusInfo.status === 'downloaded' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            'bg-gray-800 text-gray-300'
          }`}>
            {statusInfo.status === 'up-to-date' && <CheckCircle2 className="w-4 h-4" />}
            {statusInfo.status === 'error' && <AlertCircle className="w-4 h-4" />}
            {statusInfo.message}
            {statusInfo.version && <span className="opacity-70">({statusInfo.version})</span>}
          </div>

          {(statusInfo.status === 'idle' || statusInfo.status === 'up-to-date' || statusInfo.status === 'error') && (
            <button
              onClick={handleCheckUpdate}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check for Updates'}
            </button>
          )}

          {statusInfo.status === 'downloaded' && (
            <button
              onClick={handleInstallUpdate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Installing...' : 'Install Update & Restart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
