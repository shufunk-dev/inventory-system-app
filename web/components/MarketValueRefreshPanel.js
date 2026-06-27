'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Play, CheckCircle2, AlertCircle, Loader2, DollarSign, RotateCcw, FolderOpen } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function MarketValueRefreshPanel() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(buildCategoryTree(data));
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch queue status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/market-value/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (retryOnly = false) => {
    if (retryOnly) {
      setRetryLoading(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/market-value/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategory, retryOnly })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Refresh queued successfully.');
        await fetchStatus();
      } else {
        setErrorMsg(data.error || 'Failed to trigger refresh.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred while queuing the refresh job.');
      console.error(err);
    } finally {
      setLoading(false);
      setRetryLoading(false);
    }
  };

  const isQueueActive = status 
    ? (status.pending_price_refresh > 0 || status.pending > 0)
    : false;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-xl overflow-hidden mb-8 p-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Market Value Refresh
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Bulk-refresh estimated market values of items to current online prices via background workers.
          </p>
        </div>

        {/* Live Status Pill */}
        {status && (
          <div className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
            isQueueActive 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}>
            {isQueueActive ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing Queue
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Queue Idle
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Controls */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Select Target Category
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Categories (Entire Catalog)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-1.5">
              Note: Selecting a parent category will automatically queue all of its subcategories.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => handleRefresh(false)}
              disabled={loading || retryLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Queue Refresh Job
                </>
              )}
            </button>

            <button
              onClick={() => handleRefresh(true)}
              disabled={loading || retryLoading}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            >
              {retryLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Retry Failed & Limits
                </>
              )}
            </button>
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Right Side: Status Display */}
        <div className="lg:col-span-5 bg-gray-950/50 border border-gray-850 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Queue Statistics
          </h3>

          {status ? (
            <div className="space-y-4">
              {/* Counts Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-gray-500 text-xs">Pending Refresh</div>
                  <div className="text-lg font-bold text-blue-400 mt-1">
                    {status.pending_price_refresh}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-gray-500 text-xs">Standard Queue</div>
                  <div className="text-lg font-bold text-purple-400 mt-1">
                    {status.pending}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-gray-500 text-xs">Rate Limited</div>
                  <div className="text-lg font-bold text-yellow-500 mt-1">
                    {status.rate_limited}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-gray-500 text-xs">Failed Updates</div>
                  <div className="text-lg font-bold text-red-500 mt-1">
                    {status.failed}
                  </div>
                </div>
              </div>

              {/* Total Items Tracker */}
              <div className="flex justify-between items-center bg-gray-900/60 border border-gray-850 px-4 py-3 rounded-xl text-xs">
                <span className="text-gray-400 font-medium">Successfully Synced Items</span>
                <span className="text-gray-200 font-bold">{status.success} / {status.total}</span>
              </div>

              {/* Progress Indicator */}
              {isQueueActive && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Current Job Progress</span>
                    <span>
                      {Math.round(
                        (status.success + status.failed) / 
                        Math.max(1, status.success + status.failed + status.pending_price_refresh + status.pending) * 100
                      )}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.round(
                          (status.success + status.failed) / 
                          Math.max(1, status.success + status.failed + status.pending_price_refresh + status.pending) * 100
                        )}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
              <span>Loading statistics...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
