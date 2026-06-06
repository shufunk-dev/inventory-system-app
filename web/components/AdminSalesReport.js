'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Tag, Info, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react';

export default function AdminSalesReport() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedStoreId, setExpandedStoreId] = useState(null);

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/sales-report');
      if (res.ok) {
        const report = await res.json();
        setData(report);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to fetch sales report');
      }
    } catch (e) {
      setErrorMsg('Network error fetching sales report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const toggleExpand = (storeId) => {
    setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Calculating multi-store revenue distribution...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[300px]">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <p className="text-red-400 text-sm font-medium mb-4">{errorMsg}</p>
        <button 
          onClick={loadReport}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, stores, unattributed } = data || {};
  const totalAttributed = stores ? stores.reduce((sum, s) => sum + s.totalRevenue, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Mall Register Sales & Payouts</h2>
          {summary?.periodStart && summary?.periodEnd ? (
            <p className="text-sm text-gray-400 mt-1">
              Sales Period: <span className="text-blue-400 font-semibold">{summary.periodStart}</span> to <span className="text-blue-400 font-semibold">{summary.periodEnd}</span>
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No sales period detected. Upload a POS PDF report to seed data.</p>
          )}
        </div>
        <button 
          onClick={loadReport}
          className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-gray-700/60"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Sales */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/20 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-blue-600/10 p-2 rounded-xl">
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Registers Revenue</p>
          <p className="text-2xl font-extrabold text-white mt-2">${(summary?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Overall checkout receipts sum</p>
        </div>

        {/* Card 2: Items Sold */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/20 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-purple-600/10 p-2 rounded-xl">
            <Tag className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items Sold</p>
          <p className="text-2xl font-extrabold text-white mt-2">{(summary?.totalItemsSold || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Across all categories and booths</p>
        </div>

        {/* Card 3: Attributed to Booths */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950/20 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-emerald-600/10 p-2 rounded-xl">
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tenant Attributed Sales</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">${totalAttributed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Linked via barcode to tenant databases</p>
        </div>

        {/* Card 4: Unattributed */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-yellow-950/20 border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-yellow-600/10 p-2 rounded-xl">
            <Info className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Direct / Unattributed</p>
          <p className="text-2xl font-extrabold text-yellow-500 mt-2">${(unattributed?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">No store barcode found (Mall items)</p>
        </div>
      </div>

      {/* Main List of Stores & Booths */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Booth Breakdown & Payouts</h3>
          <p className="text-xs text-gray-400 mt-0.5">Scanned barcodes matching catalog items in each store database</p>
        </div>

        <div className="divide-y divide-gray-800/80">
          {stores?.map((store) => {
            const isExpanded = expandedStoreId === store.storeId;
            return (
              <div key={store.storeId} className="transition-colors hover:bg-gray-800/20">
                {/* Header Row */}
                <div 
                  onClick={() => toggleExpand(store.storeId)}
                  className="px-6 py-4 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-sm text-gray-300">
                      {store.storeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-white">{store.storeName}</p>
                      <p className="text-xs text-gray-500">{store.sales.length} unique barcode items matched</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-extrabold text-emerald-400 text-lg">
                        ${store.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">{store.totalItemsSold} items sold</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-gray-800 bg-gray-950/40">
                    {store.sales.length === 0 ? (
                      <p className="text-sm text-gray-500 py-2">No sales matching items in this store's catalog.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                              <th className="py-2.5">Barcode</th>
                              <th className="py-2.5">POS Registered Name</th>
                              <th className="py-2.5">Catalog Match</th>
                              <th className="py-2.5 text-right">Price</th>
                              <th className="py-2.5 text-right">Qty</th>
                              <th className="py-2.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/40 text-gray-300">
                            {store.sales.map((sale, i) => (
                              <tr key={i} className="hover:text-white">
                                <td className="py-2 font-mono text-gray-400">{sale.barcode}</td>
                                <td className="py-2 font-medium">{sale.name}</td>
                                <td className="py-2 text-blue-400 font-semibold">{sale.catalogName}</td>
                                <td className="py-2 text-right font-mono">${sale.price.toFixed(2)}</td>
                                <td className="py-2 text-right font-mono">{sale.numSold}</td>
                                <td className="py-2 text-right font-mono font-bold text-white">${sale.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Direct / Unattributed Sales Row */}
          {unattributed && (
            <div className="transition-colors hover:bg-gray-800/20">
              <div 
                onClick={() => toggleExpand('unattributed')}
                className="px-6 py-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-950/20 border border-yellow-800/30 flex items-center justify-center font-bold text-sm text-yellow-400">
                    ??
                  </div>
                  <div>
                    <p className="font-bold text-white">Direct / Unattributed Sales</p>
                    <p className="text-xs text-gray-500">{unattributed.sales.length} checkout lines unmatched</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-extrabold text-yellow-500 text-lg">
                      ${unattributed.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">{unattributed.totalItemsSold} items sold</p>
                  </div>
                  {expandedStoreId === 'unattributed' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {expandedStoreId === 'unattributed' && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-800 bg-gray-950/40">
                  {unattributed.sales.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No unattributed sales records.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5">Barcode</th>
                            <th className="py-2.5">POS Registered Name</th>
                            <th className="py-2.5 text-right">Price</th>
                            <th className="py-2.5 text-right">Qty</th>
                            <th className="py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40 text-gray-300">
                          {unattributed.sales.map((sale, i) => (
                            <tr key={i} className="hover:text-white">
                              <td className="py-2 font-mono text-gray-400">{sale.barcode}</td>
                              <td className="py-2 font-medium">{sale.name}</td>
                              <td className="py-2 text-right font-mono">${sale.price.toFixed(2)}</td>
                              <td className="py-2 text-right font-mono">{sale.numSold}</td>
                              <td className="py-2 text-right font-mono font-bold text-white">${sale.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
