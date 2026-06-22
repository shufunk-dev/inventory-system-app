'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, RefreshCw, Copy, Search, Power } from 'lucide-react';

export default function ServerLogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const terminalEndRef = useRef(null);
  const terminalRef = useRef(null);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching server logs:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Scroll to bottom when logs change
  useEffect(() => {
    if (terminalEndRef.current && autoRefresh) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    alert('Logs copied to clipboard!');
  };

  const filteredLogs = logs.filter(log => 
    log.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Live Server Console Logs</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors w-48 sm:w-64"
            />
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
              autoRefresh 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-gray-950 text-gray-500 border-gray-800'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Copy logs */}
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy All</span>
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div 
        ref={terminalRef}
        className="w-full h-[500px] overflow-y-auto bg-black border border-gray-800 rounded-xl p-4 font-mono text-xs leading-relaxed selection:bg-blue-500/30 selection:text-white"
      >
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
            Loading console log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-gray-600 italic">
            {searchTerm ? 'No logs matching search query.' : 'Console is quiet. No logs recorded.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, idx) => {
              // Colorize log levels
              let lineClass = 'text-gray-400';
              if (log.includes('[ERROR]')) lineClass = 'text-red-400 font-bold';
              else if (log.includes('[WARN]')) lineClass = 'text-amber-400';
              else if (log.includes('[INFO]')) lineClass = 'text-gray-300';
              else if (log.includes('[SYSTEM]')) lineClass = 'text-blue-400 font-bold';
              
              return (
                <div key={idx} className={`${lineClass} whitespace-pre-wrap`}>
                  {log}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 font-medium">
        Showing last 500 lines of console output. Stream includes background worker tasks, barcode lookup events, sync updates, and API access logs.
      </p>
    </div>
  );
}
