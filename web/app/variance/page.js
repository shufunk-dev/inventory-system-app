'use client';

import { useState, useEffect } from 'react';
import { Wine, Upload, TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

export default function VariancePage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // Selection states for audit sessions
  const [startCountId, setStartCountId] = useState('');
  const [endCountId, setEndCountId] = useState('');

  // Upload fields
  const [inventoryFiles, setInventoryFiles] = useState([]);
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);

  const [viewMode, setViewMode] = useState('compare'); // 'compare' or 'timeline'
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [selectedTimelineIds, setSelectedTimelineIds] = useState([]);
  const [prevTimelineLength, setPrevTimelineLength] = useState(0);

  useEffect(() => {
    if (timelineData && timelineData.history) {
      const allIds = timelineData.history.map(h => h.sessionId);
      if (allIds.length !== prevTimelineLength || selectedTimelineIds.length === 0) {
        setSelectedTimelineIds(allIds.slice(-5));
        setPrevTimelineLength(allIds.length);
      }
    }
  }, [timelineData, prevTimelineLength, selectedTimelineIds.length]);

  useEffect(() => {
    fetchAudit();
  }, [startCountId, endCountId]);

  async function fetchAudit() {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/inventory/audit';
      const params = [];
      if (startCountId) params.push(`startCountId=${startCountId}`);
      if (endCountId) params.push(`endCountId=${endCountId}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      } else {
        setError(resData.error || 'Failed to load audit data');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimeline() {
    setTimelineLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/audit?mode=history');
      const resData = await res.json();
      if (res.ok) {
        setTimelineData(resData);
      } else {
        setError(resData.error || 'Failed to load timeline history');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setTimelineLoading(false);
    }
  }

  useEffect(() => {
    if (viewMode === 'timeline') {
      fetchTimeline();
    } else {
      fetchAudit();
    }
  }, [startCountId, endCountId, viewMode]);

  const handleRefresh = () => {
    if (viewMode === 'timeline') {
      fetchTimeline();
    } else {
      fetchAudit();
    }
  };

  async function handleInventoryUpload(e) {
    e.preventDefault();
    if (inventoryFiles.length === 0) return;

    setUploading(true);
    try {
      let successMessages = [];
      for (const file of inventoryFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('countDate', countDate);

        const res = await fetch('/api/inventory/upload', {
          method: 'POST',
          body: formData
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || `Failed to upload ${file.name}`);
        }
        successMessages.push(`${file.name}: ${resData.message}`);
      }
      alert(`Upload complete!\n\n${successMessages.join('\n')}`);
      setInventoryFiles([]);
      if (viewMode === 'timeline') {
        fetchTimeline();
      } else {
        fetchAudit();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to upload inventory files');
    } finally {
      setUploading(false);
    }
  }

  const audit = data?.audit || [];
  const countSessions = data?.countSessions || [];

  // Calculate values
  let startingAssetValue = 0;
  let endingAssetValue = 0;
  let totalUsageCost = 0;
  let totalVolumeUsed = 0;

  audit.forEach(row => {
    startingAssetValue += row.startingOz * row.costPerOz;
    endingAssetValue += row.endingOz * row.costPerOz;
    totalUsageCost += row.depletionOz * row.costPerOz;
    totalVolumeUsed += row.depletionOz;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 mb-2 flex items-center gap-3">
              <Wine className="w-9 h-9 text-emerald-400 animate-pulse" />
              Inventory Usage & Valuation
            </h1>
            <p className="text-gray-400">Track on-hand asset values, usage costs, and volume depletions between stock counts.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="bg-gray-950 p-1.5 rounded-xl border border-gray-850 flex items-center gap-1.5">
              <button
                onClick={() => setViewMode('compare')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'compare'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Compare Two Counts
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Timeline History
              </button>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading || timelineLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 border border-gray-850 hover:bg-gray-850 text-sm font-semibold transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${(loading || timelineLoading) ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Upload panel (Centered and simplified) */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="p-6 rounded-2xl bg-gray-900/25 border border-gray-850 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-center gap-2">
              <Wine className="w-5 h-5 text-emerald-400" />
              Upload Physical Stock List
            </h3>
            <form onSubmit={handleInventoryUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col justify-center border-2 border-dashed border-gray-800 rounded-xl p-4 bg-gray-950/40 hover:border-gray-700 transition-colors relative h-28">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    multiple
                    onChange={(e) => setInventoryFiles(Array.from(e.target.files))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <Upload className="w-6 h-6 text-gray-500 mb-1 mx-auto" />
                  <span className="text-xs font-semibold text-gray-400 text-center line-clamp-1 px-2">
                    {inventoryFiles.length > 0 
                      ? `${inventoryFiles.length} file(s) selected` 
                      : 'Select Count Sheet(s) (PDF/TXT)'}
                  </span>
                </div>
                <div className="space-y-2 flex flex-col justify-center">
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Count Date</label>
                  <input
                    type="date"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-950 border border-gray-850 focus:outline-none focus:border-emerald-500 text-sm text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={uploading || inventoryFiles.length === 0}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md shadow-emerald-500/10"
              >
                {uploading ? 'Processing OCR & Ingesting...' : 'Parse & Sync Stock Count'}
              </button>
            </form>
          </div>
        </div>

        {/* Warning message if insufficient counts */}
        {data?.warning ? (
          <div className="p-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-300 flex items-start gap-4 mb-8">
            <AlertCircle className="w-7 h-7 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Insufficient Stock Count Data</h4>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                {data.warning} Please upload at least two physical counts (e.g. a starting count on one day, and an ending count on a later day) to compile usage and valuation history.
              </p>
              <div className="text-xs text-gray-500">
                Current Sessions count: {countSessions.length}
              </div>
            </div>
          </div>
        ) : null}

        {/* Selected Sessions row */}
        {viewMode === 'compare' ? (
          <>
            {/* Selected Sessions row */}
            {countSessions.length >= 2 ? (
              <div className="p-4 rounded-2xl bg-gray-900/20 border border-gray-850 flex flex-wrap gap-6 items-center mb-8">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Compare Audit Cycle:</span>
                <div className="flex items-center gap-3">
                  <select
                    value={startCountId}
                    onChange={(e) => setStartCountId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-850 text-xs font-semibold text-white focus:outline-none"
                  >
                    {countSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        Start: {s.countDate} ({s.status})
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <select
                    value={endCountId}
                    onChange={(e) => setEndCountId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-850 text-xs font-semibold text-white focus:outline-none"
                  >
                    {countSessions.map(s => (
                      <option key={s.id} value={s.id}>
                        End: {s.countDate} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            {/* Totals Summary Cards */}
            {data && !data.warning ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Starting Asset Value */}
                <div className="p-6 rounded-2xl bg-gray-950/80 border border-gray-850 relative overflow-hidden group">
                  <div className="absolute right-4 top-4 bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Starting Asset Value</span>
                  <h2 className="text-3xl font-extrabold text-white">
                    ${startingAssetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs text-gray-400 mt-2 block">Total stock value at cycle start</span>
                </div>

                {/* Ending Asset Value */}
                <div className="p-6 rounded-2xl bg-gray-950/80 border border-gray-850 relative overflow-hidden group">
                  <div className="absolute right-4 top-4 bg-teal-500/10 p-2.5 rounded-xl border border-teal-500/20">
                    <TrendingDown className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Ending Asset Value</span>
                  <h2 className="text-3xl font-extrabold text-white">
                    ${endingAssetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs text-gray-400 mt-2 block">Total stock value at cycle end</span>
                </div>

                {/* Total Volume Used */}
                <div className="p-6 rounded-2xl bg-gray-950/80 border border-gray-850 relative overflow-hidden group">
                  <div className="absolute right-4 top-4 bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">Stock Volume Used</span>
                  <h2 className="text-3xl font-extrabold text-white">
                    {totalVolumeUsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} oz
                  </h2>
                  <span className="text-xs text-gray-400 mt-2 block">Difference in counted weight</span>
                </div>

                {/* Cost of Stock Usage */}
                <div className="p-6 rounded-2xl bg-gray-950/80 border-emerald-500/20 bg-gradient-to-br from-gray-950 to-emerald-950/10 relative overflow-hidden group">
                  <div className="absolute right-4 top-4 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider block mb-1">Cost of Usage</span>
                  <h2 className="text-3xl font-extrabold text-emerald-400">
                    ${totalUsageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <span className="text-xs text-emerald-500/60 mt-2 block">Value of consumed inventory</span>
                </div>
              </div>
            ) : null}

            {/* Audit Details Table */}
            {data && !data.warning && audit.length > 0 ? (
              <div className="rounded-2xl border border-gray-850 bg-gray-950/40 overflow-hidden mb-10">
                <div className="p-6 border-b border-gray-850">
                  <h3 className="text-lg font-bold text-white">Inventory Item Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-gray-850 text-gray-500 bg-gray-950/80 text-xs font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Brand Name</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6 text-center">Start Qty (oz)</th>
                        <th className="py-4 px-6 text-center">End Qty (oz)</th>
                        <th className="py-4 px-6 text-center">Start Value</th>
                        <th className="py-4 px-6 text-center">End Value</th>
                        <th className="py-4 px-6 text-center">Usage (oz)</th>
                        <th className="py-4 px-6 text-right">Usage Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/60">
                      {audit.map(row => {
                        const startVal = row.startingOz * row.costPerOz;
                        const endVal = row.endingOz * row.costPerOz;
                        const useCost = row.depletionOz * row.costPerOz;
                        
                        return (
                          <tr key={row.brandId} className="hover:bg-gray-900/10 transition-colors">
                            <td className="py-4 px-6 font-semibold text-white">
                              {row.brandName}
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-xs bg-gray-900 text-gray-400 border border-gray-800 px-2 py-0.5 rounded-full font-semibold">
                                {row.brandCategory}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center font-mono text-gray-300">{row.startingOz.toFixed(2)}</td>
                            <td className="py-4 px-6 text-center font-mono text-gray-300">{row.endingOz.toFixed(2)}</td>
                            <td className="py-4 px-6 text-center font-mono text-gray-400">${startVal.toFixed(2)}</td>
                            <td className="py-4 px-6 text-center font-mono text-gray-400">${endVal.toFixed(2)}</td>
                            <td className="py-4 px-6 text-center font-mono text-blue-400 font-medium">{row.depletionOz.toFixed(2)}</td>
                            <td className="py-4 px-6 text-right font-mono font-bold text-gray-200">
                              ${useCost.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {/* Timeline Progress Cards */}
            {timelineLoading ? (
              <div className="flex items-center justify-center p-12 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
                Loading timeline history...
              </div>
            ) : timelineData && timelineData.history && timelineData.history.length > 0 ? (
              (() => {
                const activeHistory = timelineData.history.filter(h => selectedTimelineIds.includes(h.sessionId));
                return (
                  <>
                    {/* Date Filters Row */}
                    <div className="flex flex-col gap-4 p-4 bg-gray-900/25 border border-gray-850 rounded-2xl mb-8">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Select Dates to Include:</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineIds(timelineData.history.map(h => h.sessionId))}
                            className="px-2.5 py-1 rounded bg-gray-950 hover:bg-gray-900 border border-gray-800 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-all animate-fade-in"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineIds([])}
                            className="px-2.5 py-1 rounded bg-gray-950 hover:bg-gray-900 border border-gray-800 text-[11px] font-bold text-gray-400 hover:text-gray-300 transition-all animate-fade-in"
                          >
                            Clear All
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineIds(timelineData.history.map(h => h.sessionId).slice(-5))}
                            className="px-2.5 py-1 rounded bg-gray-950 hover:bg-gray-900 border border-gray-800 text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-all animate-fade-in"
                          >
                            Last 5
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedTimelineIds(timelineData.history.map(h => h.sessionId).slice(-10))}
                            className="px-2.5 py-1 rounded bg-gray-950 hover:bg-gray-900 border border-gray-800 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-all animate-fade-in"
                          >
                            Last 10
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {timelineData.history.map(hist => {
                          const isChecked = selectedTimelineIds.includes(hist.sessionId);
                          return (
                            <button
                              key={hist.sessionId}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedTimelineIds(selectedTimelineIds.filter(id => id !== hist.sessionId));
                                } else {
                                  setSelectedTimelineIds([...selectedTimelineIds, hist.sessionId]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isChecked
                                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-gray-950 text-gray-500 border-gray-850 hover:text-gray-400 hover:border-gray-800'
                              }`}
                            >
                              {hist.countDate}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeHistory.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                          {activeHistory.map((hist) => {
                            const originalIdx = timelineData.history.findIndex(h => h.sessionId === hist.sessionId);
                            return (
                              <div key={hist.sessionId} className="p-6 rounded-2xl bg-gray-950/80 border border-gray-850 relative overflow-hidden group">
                                <div className="absolute right-4 top-4 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                                  <span className="text-xs font-bold text-emerald-400">Audit #{originalIdx + 1}</span>
                                </div>
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-1">
                                  {hist.countDate}
                                </span>
                                <h2 className="text-3xl font-extrabold text-white">
                                  ${hist.totalAssetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h2>
                                <span className="text-xs text-gray-400 mt-2 block">
                                  Total Volume: {hist.totalOz.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} oz
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Stock Levels Progression Table */}
                        <div className="p-6 rounded-2xl bg-gray-950/40 border border-gray-850 backdrop-blur-xl mb-10">
                          <div className="p-6 border-b border-gray-850 mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-emerald-400" />
                              Stock Levels Progression
                            </h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead>
                                <tr className="border-b border-gray-850 text-gray-500 bg-gray-950/80 text-xs font-bold uppercase tracking-wider">
                                  <th className="py-4 px-6">Brand Name</th>
                                  <th className="py-4 px-6">Category</th>
                                  {activeHistory.map(hist => (
                                    <th key={hist.sessionId} className="py-4 px-6 text-center">
                                      {hist.countDate}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-850/60">
                                {timelineData.brands.map(brand => {
                                  const hasCount = activeHistory.some(hist => hist.items[brand.id]);
                                  if (!hasCount) return null;

                                  return (
                                    <tr key={brand.id} className="hover:bg-gray-900/10 transition-colors">
                                      <td className="py-4 px-6 font-semibold text-white">{brand.name}</td>
                                      <td className="py-4 px-6">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                          brand.category === 'Barringer' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                          brand.category === 'Caffey' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                          brand.category === 'Pepsi Co' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                          brand.category.includes('WINE') ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                          'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                                        }`}>
                                          {brand.category}
                                        </span>
                                      </td>
                                      {activeHistory.map(hist => {
                                        const itemData = hist.items[brand.id];
                                        return (
                                          <td key={hist.sessionId} className="py-4 px-6 text-center font-medium">
                                            {itemData ? (
                                              <div>
                                                <span className="text-white font-mono">{itemData.qtyRaw}</span>
                                                <span className="text-gray-500 text-xs block font-mono">{itemData.qtyOz.toFixed(1)} oz</span>
                                              </div>
                                            ) : (
                                              <span className="text-gray-600">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-8 rounded-3xl border border-gray-850 bg-gray-950/30 text-center text-gray-400">
                        Please select at least one audit date pill above to display the stock timeline.
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <div className="p-8 rounded-3xl border border-gray-850 bg-gray-950/30 text-center text-gray-400">
                No physical count sessions found. Upload some count sheets above to view your timeline.
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
