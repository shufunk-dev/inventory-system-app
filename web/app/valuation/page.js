'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Layers, 
  Search, 
  ArrowUpRight, 
  PieChart,
  Loader2,
  AlertCircle,
  Printer
} from 'lucide-react';
import Link from 'next/link';

const TYPE_LABELS = {
  coin: 'Coins',
  toy: 'Toys & Figures',
  comic: 'Comic Books',
  game: 'Video Games',
  card: 'Trading Cards',
  video: 'VHS & Movies',
  bottle: 'Bottles & Glassware',
  graded: 'Graded Assets',
  standard: 'Standard Items'
};

const TYPE_COLORS = {
  coin: 'bg-amber-500/20 text-amber-400 border-amber-500/30 progress-amber',
  toy: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30 progress-fuchsia',
  comic: 'bg-sky-500/20 text-sky-400 border-sky-500/30 progress-sky',
  game: 'bg-purple-500/20 text-purple-400 border-purple-500/30 progress-purple',
  card: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 progress-emerald',
  video: 'bg-rose-500/20 text-rose-400 border-rose-500/30 progress-rose',
  bottle: 'bg-teal-500/20 text-teal-400 border-teal-500/30 progress-teal',
  graded: 'bg-orange-500/20 text-orange-400 border-orange-500/30 progress-orange',
  standard: 'bg-slate-500/20 text-slate-400 border-slate-500/30 progress-slate'
};

function ValuationReportContent() {
  const searchParams = useSearchParams();
  const categoryId = searchParams.get('category') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState('invested');

  useEffect(() => {
    setLoading(true);
    const fetchUrl = categoryId 
      ? `/api/reports/valuation?category=${encodeURIComponent(categoryId)}`
      : '/api/reports/valuation';
    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load valuation data');
        return res.json();
      })
      .then(json => {
        setData(json);
        const hasInvested = json.items.some(item => item.purchasePrice !== null);
        setActiveSegment(hasInvested ? 'invested' : 'market_only');
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [categoryId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-gray-400">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="font-medium text-lg animate-pulse">Calculating Inventory Valuation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-red-400 inline-flex flex-col items-center gap-4">
          <AlertCircle className="w-16 h-16" />
          <h2 className="text-2xl font-bold">Failed to load valuation report</h2>
          <p className="text-gray-400 text-sm max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  const { summary, breakdown, items } = data;

  const investedItems = items.filter(item => item.purchasePrice !== null);
  const marketOnlyItems = items.filter(item => item.purchasePrice === null);

  const activeItems = activeSegment === 'invested' ? investedItems : marketOnlyItems;

  // Filter items
  const filteredItems = activeItems.filter(item => {
    const matchesType = selectedType === 'all' || item.itemType === selectedType;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Calculate totals for print view
  const printTotals = filteredItems.reduce((acc, item) => {
    acc.low += item.valueLow || 0;
    acc.avg += item.valueAvg || 0;
    acc.high += item.valueHigh || 0;
    return acc;
  }, { low: 0, avg: 0, high: 0 });

  // Unique types present in inventory (based on active segment items)
  const activeBreakdownTypes = breakdown.filter(b => 
    items.some(item => item.itemType === b.itemType && 
      (activeSegment === 'invested' ? item.purchasePrice !== null : item.purchasePrice === null)
    )
  ).map(b => b.itemType);
  const availableTypes = ['all', ...activeBreakdownTypes];

  return (
    <>
      <main className="print-hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 selection:bg-blue-500/30">
      {/* Premium Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <PieChart className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400 tracking-tight flex items-center gap-3 flex-wrap">
              Inventory Valuation Report
              {data.categoryName && (
                <span className="text-xs px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full font-bold inline-flex items-center gap-2">
                  <span>Filtered: {data.categoryName}</span>
                  <Link href="/valuation" className="hover:text-white text-blue-500 transition-colors font-black">×</Link>
                </span>
              )}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Real-time valuation stats across categories based on estimated market value.</p>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Metric 1: Total Valuation */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-25">
            <div className="w-20 h-20 bg-emerald-500 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total Portfolio Value</p>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
            ${summary.totalAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Combined catalog value
          </div>
        </div>

        {/* Metric 2: Total Invested Cost */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="w-20 h-20 bg-blue-500 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Total Invested Cost</p>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
            ${summary.totalPurchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-blue-400 mt-4 font-semibold">
            <Coins className="w-4 h-4" />
            Total spent on receipts
          </div>
        </div>

        {/* Metric 3: Net Return (Invested ROI) */}
        {(() => {
          const netReturn = summary.purchasedItemsValue - summary.totalPurchasePrice;
          const roiPct = summary.totalPurchasePrice > 0 ? (netReturn / summary.totalPurchasePrice) * 100 : 0;
          const isGain = netReturn >= 0;
          
          return (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <div className={`w-20 h-20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 ${isGain ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Net Return (Invested ROI)</p>
              <p className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${isGain ? 'from-emerald-400 to-green-300' : 'from-rose-400 to-pink-300'}`}>
                {isGain ? '+' : ''}{roiPct.toFixed(1)}%
              </p>
              <div className={`flex items-center gap-1 text-xs mt-4 font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isGain ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isGain ? 'Profit' : 'Loss'}: {isGain ? '+' : ''}${netReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          );
        })()}

        {/* Metric 4: Market Value Only */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="w-20 h-20 bg-purple-500 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Market Value Only</p>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">
            ${summary.unpricedItemsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1 text-xs text-purple-400 mt-4 font-semibold">
            <Layers className="w-4 h-4" />
            Assets without receipts
          </div>
        </div>

        {/* Metric 5: Valuation Coverage */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="w-20 h-20 bg-amber-500 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Valuation Coverage</p>
          <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
            {summary.valuedCount} <span className="text-xs font-bold text-gray-500">of {summary.totalCount} items</span>
          </p>
          
          <div className="mt-4 space-y-1">
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-yellow-500 h-1.5 rounded-full" 
                style={{ width: `${(summary.valuedCount / (summary.totalCount || 1)) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-bold">
              <span>{Math.round((summary.valuedCount / (summary.totalCount || 1)) * 100)}% Valued</span>
              <span>100% Items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Category Breakdown Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <h2 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-400" />
          Category Valuation Distribution
        </h2>
        
        {breakdown.length === 0 ? (
          <p className="text-gray-500 italic py-4">No categories have estimated market values yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {breakdown.map(b => {
                const percentOfTotal = summary.totalAvg > 0 ? (b.totalAvg / summary.totalAvg) * 100 : 0;
                const percentValued = b.totalCount > 0 ? (b.valuedCount / b.totalCount) * 100 : 0;
                const colors = TYPE_COLORS[b.itemType] || TYPE_COLORS.standard;
                
                return (
                  <div key={b.itemType} className="space-y-2 group">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${colors.split(' ').slice(0, 3).join(' ')}`}>
                          {TYPE_LABELS[b.itemType] || b.itemType}
                        </span>
                        <span className="text-gray-500 text-xs">({b.valuedCount} / {b.totalCount} items)</span>
                      </div>
                      <span className="text-white font-bold">
                        ${b.totalAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs text-gray-500 font-medium ml-1.5">({Math.round(percentOfTotal)}%)</span>
                      </span>
                    </div>

                    <div className="w-full bg-gray-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-gray-800/80">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${colors.split(' ').slice(3).join(' ')}`}
                        style={{ width: `${percentOfTotal}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Visual Callout / Information Box */}
            <div className="bg-gray-950/50 border border-gray-800 rounded-3xl p-6 flex flex-col justify-center gap-4 relative">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white text-lg">Value Calculation Details</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Market values are automatically cross-referenced by our AI pipeline from eBay, Numista, PriceCharting, Google Shopping, and other online registries.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                <strong>Standard Low Range</strong> represents the lowest currently active listing prices, while the <strong>High Range</strong> reflects graded or complete/new conditions.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Valued Items List */}
      <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-8 md:p-10 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white">Individual Item Estimates</h2>
            <p className="text-xs text-gray-500 mt-0.5">Explore individual items that contribute to the overall valuation.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search bar inside the list */}
            <div className="relative flex-1 md:w-80 md:flex-none">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search valued items..."
                className="w-full bg-black/60 border border-gray-800 hover:border-gray-700 focus:border-blue-500 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
              />
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.1)] hover:shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print List</span>
            </button>
          </div>
        </div>

        {/* Segment Tabs */}
        <div className="flex gap-4 border-b border-gray-800/80 pb-2">
          <button
            onClick={() => {
              setActiveSegment('invested');
              setSelectedType('all');
            }}
            className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
              activeSegment === 'invested'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Invested Assets ({investedItems.length})
          </button>
          <button
            onClick={() => {
              setActiveSegment('market_only');
              setSelectedType('all');
            }}
            className={`pb-3 px-2 text-sm font-extrabold transition-all border-b-2 ${
              activeSegment === 'market_only'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Market Value Only ({marketOnlyItems.length})
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-800/80">
          {availableTypes.map(type => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  isActive 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/10' 
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                {type === 'all' ? 'All Items' : (TYPE_LABELS[type] || type)}
              </button>
            );
          })}
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-gray-950/20 border-2 border-dashed border-gray-850 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold text-lg">No items match filters</p>
            <p className="text-gray-500 text-sm mt-1">Try resetting the category filter or searching another keyword.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeSegment === 'invested' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs font-extrabold uppercase tracking-wider">
                    <th className="pb-4 pl-4">Item Details</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4 text-right">Acquisition Cost</th>
                    <th className="pb-4 text-right">Current Value</th>
                    <th className="pb-4 text-right">Net Return (ROI)</th>
                    <th className="pb-4 text-right pr-4">Market Spread (Low-High)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850 text-sm font-semibold">
                  {filteredItems.map(item => {
                    const colors = TYPE_COLORS[item.itemType] || TYPE_COLORS.standard;
                    const diff = item.valueAvg - item.purchasePrice;
                    const pct = item.purchasePrice > 0 ? (diff / item.purchasePrice) * 100 : 0;
                    const isGain = diff >= 0;
                    
                    return (
                      <tr key={item.id} className="group hover:bg-gray-800/20 transition-colors">
                        <td className="py-4 pl-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-950 border border-gray-850 flex-shrink-0 flex items-center justify-center">
                            {item.imagePath ? (
                              <img src={item.imagePath} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-600 text-xs">📷</span>
                            )}
                          </div>
                          <Link href={`/item/${item.id}`} className="text-gray-200 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                            {item.name}
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${colors.split(' ').slice(0, 3).join(' ')}`}>
                            {TYPE_LABELS[item.itemType] || item.itemType}
                          </span>
                        </td>

                        <td className="py-4 text-right font-mono text-gray-300">
                          ${item.purchasePrice.toFixed(2)}
                        </td>

                        <td className="py-4 text-right font-mono text-white">
                          ${item.valueAvg > 0 ? item.valueAvg.toFixed(2) : '0.00'}
                        </td>

                        <td className={`py-4 text-right font-mono font-extrabold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isGain ? '+' : ''}${diff.toFixed(2)} ({isGain ? '+' : ''}{pct.toFixed(1)}%)
                        </td>

                        <td className="py-4 text-right font-mono text-gray-500 pr-4">
                          ${item.valueLow.toFixed(2)} - ${item.valueHigh.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs font-extrabold uppercase tracking-wider">
                    <th className="pb-4 pl-4">Item Details</th>
                    <th className="pb-4">Type</th>
                    <th className="pb-4 text-right">Low Estimate</th>
                    <th className="pb-4 text-right">Average Value</th>
                    <th className="pb-4 text-right pr-4">High Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850 text-sm font-semibold">
                  {filteredItems.map(item => {
                    const colors = TYPE_COLORS[item.itemType] || TYPE_COLORS.standard;
                    return (
                      <tr key={item.id} className="group hover:bg-gray-800/20 transition-colors">
                        <td className="py-4 pl-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-950 border border-gray-850 flex-shrink-0 flex items-center justify-center">
                            {item.imagePath ? (
                              <img src={item.imagePath} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-600 text-xs">📷</span>
                            )}
                          </div>
                          <Link href={`/item/${item.id}`} className="text-gray-200 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                            {item.name}
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${colors.split(' ').slice(0, 3).join(' ')}`}>
                            {TYPE_LABELS[item.itemType] || item.itemType}
                          </span>
                        </td>

                        <td className="py-4 text-right font-mono text-gray-400">
                          ${item.valueLow.toFixed(2)}
                        </td>

                        <td className="py-4 text-right font-mono text-emerald-400 font-extrabold">
                          ${item.valueAvg.toFixed(2)}
                        </td>

                        <td className="py-4 text-right font-mono text-gray-400 pr-4">
                          ${item.valueHigh.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .progress-amber { background: linear-gradient(to right, #f59e0b, #fbbf24); }
        .progress-fuchsia { background: linear-gradient(to right, #d946ef, #f472b6); }
        .progress-sky { background: linear-gradient(to right, #0ea5e9, #60a5fa); }
        .progress-purple { background: linear-gradient(to right, #a855f7, #6366f1); }
        .progress-emerald { background: linear-gradient(to right, #10b981, #2dd4bf); }
        .progress-rose { background: linear-gradient(to right, #f43f5e, #f87171); }
        .progress-orange { background: linear-gradient(to right, #f97316, #fb923c); }
        .progress-slate { background: linear-gradient(to right, #64748b, #94a3b8); }

        @media print {
          body, html {
            background: white !important;
            color: black !important;
          }
          nav, footer, .no-print, .print-hidden {
            display: none !important;
          }
          .page-break-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>

    {/* Print-only layout */}
    <div className="hidden print:block text-black bg-white p-6 font-sans">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Inventory Valuation Report</h1>
          {data.categoryName && (
            <p className="text-sm text-gray-700 mt-1 font-semibold">Category: {data.categoryName}</p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            Segment: {activeSegment === 'invested' ? 'Invested Assets' : 'Market Value Only'}
            {selectedType !== 'all' && ` | Type: ${TYPE_LABELS[selectedType] || selectedType}`}
            {searchQuery && ` | Search: "${searchQuery}"`}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Items Count: {filteredItems.length}</p>
        </div>
      </div>

      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-black text-black font-bold">
            <th className="py-2 pl-2">Item Name</th>
            <th className="py-2 text-right w-28">Low Value</th>
            <th className="py-2 text-right w-28">Average Value</th>
            <th className="py-2 text-right pr-2 w-28">High Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-250">
          {filteredItems.map(item => (
            <tr key={item.id} className="page-break-avoid">
              <td className="py-2 pl-2 font-medium text-black">{item.name}</td>
              <td className="py-2 text-right font-mono text-gray-800">${item.valueLow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="py-2 text-right font-mono font-bold text-black">${item.valueAvg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="py-2 text-right font-mono text-gray-800 pr-2">${item.valueHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {/* Totals Row - placed at the end of tbody so it only prints once at the bottom of the last page */}
          <tr className="border-t-2 border-black font-bold bg-gray-50 page-break-avoid">
            <td className="py-3 pl-2 text-sm text-black">Total Valuation</td>
            <td className="py-3 text-right font-mono text-sm text-black">${printTotals.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td className="py-3 text-right font-mono text-sm text-black">${printTotals.avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td className="py-3 text-right font-mono text-sm text-black pr-2">${printTotals.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </>
  );
}

export default function ValuationReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-gray-400">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="font-medium text-lg animate-pulse">Calculating Inventory Valuation...</p>
      </div>
    }>
      <ValuationReportContent />
    </Suspense>
  );
}
