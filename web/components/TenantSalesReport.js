'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Tag, RefreshCw, AlertCircle } from 'lucide-react';

export default function TenantSalesReport() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/user/sales-report');
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

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-400 text-xs">Loading sales report...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[200px]">
        <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
        <p className="text-red-400 text-xs mb-3">{errorMsg}</p>
        <button 
          onClick={loadReport}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { storeName, totalRevenue, totalItemsSold, sales, periodStart, periodEnd } = data || {};

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Your Booth Sales: {storeName}
          </h2>
          {periodStart && periodEnd ? (
            <p className="text-xs text-gray-400 mt-1">
              Sales Period: <span className="text-blue-400 font-semibold">{periodStart}</span> to <span className="text-blue-400 font-semibold">{periodEnd}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">No sales period detected.</p>
          )}
        </div>
        <button 
          onClick={loadReport}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
          title="Refresh Report"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-950/40 border border-gray-800 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Earnings</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">${(totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="bg-gray-950/40 border border-gray-800 p-4 rounded-2xl">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Items Sold</p>
          <p className="text-2xl font-extrabold text-white mt-1">{(totalItemsSold || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Sold items list */}
      <div>
        <h3 className="text-sm font-bold text-gray-300 mb-3">Itemized Sales</h3>
        {sales.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">No sales matched for your catalog items in this report.</p>
        ) : (
          <div className="overflow-x-auto border border-gray-800 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/20 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Catalog Match</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40 text-gray-350">
                {sales.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-gray-850/10">
                    <td className="px-4 py-2.5 font-mono text-gray-400">{sale.barcode}</td>
                    <td className="px-4 py-2.5 font-semibold text-white">{sale.catalogName}</td>
                    <td className="px-4 py-2.5 text-right font-mono">${sale.price.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{sale.numSold}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">${sale.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
