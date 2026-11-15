'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ListPlus, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  DollarSign, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  Sparkles
} from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function QuickAddItemsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState([
    { tempId: 1, name: '', marketPrice: '', retailPrice: '' },
    { tempId: 2, name: '', marketPrice: '', retailPrice: '' },
    { tempId: 3, name: '', marketPrice: '', retailPrice: '' },
    { tempId: 4, name: '', marketPrice: '', retailPrice: '' },
    { tempId: 5, name: '', marketPrice: '', retailPrice: '' }
  ]);
  const [nextTempId, setNextTempId] = useState(6);
  
  const [categories, setCategories] = useState([]);
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [defaultItemType, setDefaultItemType] = useState('standard');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [customAddCount, setCustomAddCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const router = useRouter();
  const lastInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCategories(buildCategoryTree(data));
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setError('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setError('');
    setSuccessMsg('');
  };

  const addRows = (count = 1) => {
    const num = Math.max(1, parseInt(count, 10) || 1);
    const newItems = [];
    let currentId = nextTempId;
    for (let i = 0; i < num; i++) {
      newItems.push({
        tempId: currentId++,
        name: '',
        marketPrice: '',
        retailPrice: ''
      });
    }
    setNextTempId(currentId);
    setRows(prev => [...prev, ...newItems]);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      // Keep at least one blank row
      setRows([{ tempId: nextTempId, name: '', marketPrice: '', retailPrice: '' }]);
      setNextTempId(nextTempId + 1);
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (error) setError('');
  };

  const clearEmptyRows = () => {
    const filled = rows.filter(r => r.name.trim().length > 0 || r.marketPrice || r.retailPrice);
    if (filled.length === 0) {
      setRows([{ tempId: nextTempId, name: '', marketPrice: '', retailPrice: '' }]);
      setNextTempId(nextTempId + 1);
    } else {
      setRows(filled);
    }
  };

  // Keyboard navigation: pressing Enter on retail price of last row automatically adds next row
  const handleKeyDown = (e, index, field) => {
    if (e.key === 'Enter' && field === 'retailPrice' && index === rows.length - 1) {
      e.preventDefault();
      addRows(1);
    }
  };

  const validRows = rows.filter(r => r.name.trim().length > 0);
  const totalMarket = validRows.reduce((sum, r) => sum + (parseFloat(r.marketPrice) || 0), 0);
  const totalRetail = validRows.reduce((sum, r) => sum + (parseFloat(r.retailPrice) || 0), 0);

  const handleSubmit = async () => {
    if (validRows.length === 0) {
      setError('Please enter a name for at least one item.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      let finalCategoryId = defaultCategoryId;

      // Create new category if user typed one
      if (isCreatingCategory && newCategoryName.trim()) {
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCategoryName.trim(), parentId: null })
        });
        if (!catRes.ok) throw new Error('Failed to create new category.');
        const newCat = await catRes.json();
        finalCategoryId = newCat.id;
      }

      // Submit items
      const payload = {
        items: validRows.map(r => ({
          name: r.name.trim(),
          marketPrice: r.marketPrice !== '' ? r.marketPrice : null,
          retailPrice: r.retailPrice !== '' ? r.retailPrice : null
        })),
        defaultCategoryId: finalCategoryId || null,
        defaultItemType
      };

      const res = await fetch('/api/item/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add items.');
      }

      setSuccessMsg(`Successfully added ${data.count} ${data.count === 1 ? 'item' : 'items'} to inventory!`);
      
      // Reset form
      setRows([
        { tempId: 1, name: '', marketPrice: '', retailPrice: '' },
        { tempId: 2, name: '', marketPrice: '', retailPrice: '' },
        { tempId: 3, name: '', marketPrice: '', retailPrice: '' },
        { tempId: 4, name: '', marketPrice: '', retailPrice: '' },
        { tempId: 5, name: '', marketPrice: '', retailPrice: '' }
      ]);
      setNextTempId(6);
      setIsCreatingCategory(false);
      setNewCategoryName('');

      // Refresh catalog data
      router.refresh();

      setTimeout(() => {
        setIsOpen(false);
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        type="button"
        className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white shadow-lg transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:-translate-y-0.5 border border-emerald-500/30"
        title="Quickly add multiple items by typing without requiring photos"
      >
        <ListPlus className="w-5 h-5 text-emerald-100" />
        <span>Quick Add Items</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-gray-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-800/80 flex items-start justify-between bg-gradient-to-r from-gray-900/60 to-gray-900/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                  <ListPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Quick Batch Item Entry</h2>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> No Photos Needed
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Quickly key in your items list. Item name is required; market and retail prices are optional.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Options Bar */}
            <div className="px-6 py-4 bg-gray-900/40 border-b border-gray-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Assignment */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  Default Category (Optional)
                </label>
                {!isCreatingCategory ? (
                  <div className="flex gap-2">
                    <select
                      value={defaultCategoryId}
                      onChange={(e) => setDefaultCategoryId(e.target.value)}
                      className="flex-1 bg-gray-800/90 border border-gray-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- None / Uncategorized --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.displayName}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCategory(true)}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                      title="Create a new category for this batch"
                    >
                      <Plus className="w-3.5 h-3.5" /> New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Rare Books, Hardcovers..."
                      className="flex-1 bg-gray-800/90 border border-emerald-500/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Item Type Assignment */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                  Item Type (Optional)
                </label>
                <select
                  value={defaultItemType}
                  onChange={(e) => setDefaultItemType(e.target.value)}
                  className="w-full bg-gray-800/90 border border-gray-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="standard">📦 Standard Merchandise / Books / General</option>
                  <option value="comic">📖 Comic Book</option>
                  <option value="card">🃏 Trading Card</option>
                  <option value="coin">🪙 Graded Coin</option>
                  <option value="game">🎮 Video Game</option>
                  <option value="movie">🎬 DVD / Blu-Ray / VHS</option>
                  <option value="toy">🧸 Action Figure / Toy</option>
                  <option value="tool">🔧 Tools & Workshop</option>
                  <option value="liquor">🍾 Bar & Bottle</option>
                </select>
              </div>
            </div>

            {/* Error & Success Alerts */}
            {error && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Table / List Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-950/40">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900/80 border-b border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-4">
                        Item Name <span className="text-rose-400 font-normal">*Required</span>
                      </th>
                      <th className="py-3 px-4 w-44">
                        Market Price <span className="text-gray-500 font-normal">($)</span>
                      </th>
                      <th className="py-3 px-4 w-44">
                        Retail Price <span className="text-gray-500 font-normal">($)</span>
                      </th>
                      <th className="py-3 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {rows.map((row, index) => {
                      const hasName = row.name.trim().length > 0;
                      return (
                        <tr 
                          key={row.tempId} 
                          className={`transition-colors hover:bg-gray-900/40 ${hasName ? 'bg-emerald-950/10' : ''}`}
                        >
                          {/* Row Number */}
                          <td className="py-2.5 px-3 text-center text-xs font-mono text-gray-500 select-none">
                            {index + 1}
                          </td>

                          {/* Item Name */}
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateRow(index, 'name', e.target.value)}
                              placeholder={`Item #${index + 1} title (e.g. Stephen King The Shining 1st Ed)`}
                              className={`w-full bg-gray-900/90 border rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors ${
                                hasName 
                                  ? 'border-emerald-500/40 focus:border-emerald-400' 
                                  : 'border-gray-800 focus:border-blue-500'
                              }`}
                            />
                          </td>

                          {/* Market Price */}
                          <td className="py-2.5 px-4">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.marketPrice}
                                onChange={(e) => updateRow(index, 'marketPrice', e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-gray-900/90 border border-gray-800 focus:border-blue-500 rounded-xl pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                              />
                            </div>
                          </td>

                          {/* Retail Price */}
                          <td className="py-2.5 px-4">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.retailPrice}
                                onChange={(e) => updateRow(index, 'retailPrice', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, 'retailPrice')}
                                placeholder="0.00"
                                className="w-full bg-gray-900/90 border border-gray-800 focus:border-blue-500 rounded-xl pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                              />
                            </div>
                          </td>

                          {/* Delete Button */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-gray-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Delete row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Lines Toolbar */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-gray-900/30 border border-gray-800/80 rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                    Add Lines:
                  </span>
                  <button
                    type="button"
                    onClick={() => addRows(1)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> +1 Line
                  </button>
                  <button
                    type="button"
                    onClick={() => addRows(5)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 transition-all"
                  >
                    +5 Lines
                  </button>
                  <button
                    type="button"
                    onClick={() => addRows(10)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 transition-all"
                  >
                    +10 Lines
                  </button>

                  {/* Custom Number Adder */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-gray-700/80">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customAddCount}
                      onChange={(e) => setCustomAddCount(e.target.value)}
                      className="w-16 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => addRows(customAddCount)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold border border-gray-700 flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" /> Add Custom
                    </button>
                  </div>
                </div>

                {rows.length > validRows.length && (
                  <button
                    type="button"
                    onClick={clearEmptyRows}
                    className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                  >
                    Clean Up Empty Rows ({rows.length - validRows.length})
                  </button>
                )}
              </div>
            </div>

            {/* Footer Summary & Action Bar */}
            <div className="p-5 border-t border-gray-800 bg-gray-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Stats Breakdown */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-400">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {validRows.length} valid {validRows.length === 1 ? 'item' : 'items'} ready
                  <span className="text-gray-500 font-normal">({rows.length} total rows)</span>
                </span>
                {totalMarket > 0 && (
                  <span>
                    Est. Market: <span className="font-mono text-emerald-400 font-bold">${totalMarket.toFixed(2)}</span>
                  </span>
                )}
                {totalRetail > 0 && (
                  <span>
                    Total Retail: <span className="font-mono text-blue-400 font-bold">${totalRetail.toFixed(2)}</span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || validRows.length === 0}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all text-sm ${
                    validRows.length === 0 || isSubmitting
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:-translate-y-0.5 border border-emerald-500/30'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Items...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save {validRows.length > 0 ? `${validRows.length} Items` : 'Items'}
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
