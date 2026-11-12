'use client';

import { useState, useEffect } from 'react';
import { 
  Tag, Plus, Clock, Calendar, CheckCircle2, AlertCircle, Trash2, 
  Edit3, Printer, Tv, Sparkles, Filter, ChevronRight, X, Play, Pause, 
  HelpCircle, Shield, ShoppingCart, Percent, Layers
} from 'lucide-react';
import Link from 'next/link';
import PrintableSaleSignModal from '@/components/PrintableSaleSignModal';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [stats, setStats] = useState({ active: 0, scheduled: 0, expired: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed_amount'
  const [discountValue, setDiscountValue] = useState('40');
  const [targetType, setTargetType] = useState('booth'); // 'booth' | 'category' | 'tag' | 'items'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState([0, 6]); // Weekend default: Sun & Sat
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState('15');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Aux data for pickers
  const [categories, setCategories] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Printable signage modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintPromo, setSelectedPrintPromo] = useState(null);

  // Fetch promotions
  const fetchPromotions = async () => {
    try {
      const res = await fetch(`/api/promotions?status=${statusFilter}`);
      const data = await res.json();
      if (data.promotions) {
        setPromotions(data.promotions);
        setStats(data.stats || { active: 0, scheduled: 0, expired: 0, total: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    const interval = setInterval(fetchPromotions, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  // Load categories and items for the picker modal
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(console.error);

    fetch('/api/receipt-items')
      .then(res => res.json())
      .then(data => {
        if (data.items) setCatalogItems(data.items);
      })
      .catch(console.error);
  }, []);

  // Set default initial dates for new promotion (Now until 14 days from now)
  const resetForm = () => {
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, '0');
    const toInputFormat = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setName('');
    setDiscountType('percentage');
    setDiscountValue('40');
    setTargetType('booth');
    setSelectedCategory('');
    setSelectedTag('');
    setSelectedItemIds([]);
    setStartDate(toInputFormat(now));
    setEndDate(toInputFormat(twoWeeks));
    setIsRecurring(false);
    setRecurringDays([0, 6]);
    setGracePeriodMinutes('15');
    setEditingPromo(null);
    setErrorMessage('');
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (promo) => {
    setEditingPromo(promo);
    setName(promo.name);
    setDiscountType(promo.discountType || 'percentage');
    setDiscountValue(String(promo.discountValue));
    setTargetType(promo.targetType || 'booth');
    
    // Parse targetIds
    let targets = [];
    try {
      targets = typeof promo.targetIds === 'string' ? JSON.parse(promo.targetIds) : (promo.targetIds || []);
    } catch (e) {
      targets = String(promo.targetIds || '').split(',').map(s => s.trim()).filter(Boolean);
    }

    if (promo.targetType === 'category') {
      setSelectedCategory(targets[0] || '');
    } else if (promo.targetType === 'tag') {
      setSelectedTag(targets[0] || '');
    } else if (promo.targetType === 'items') {
      setSelectedItemIds(targets);
    }

    setStartDate(promo.startDate);
    setEndDate(promo.endDate);
    setIsRecurring(promo.isRecurring === 1);

    let days = [0, 6];
    try {
      days = typeof promo.recurringDays === 'string' ? JSON.parse(promo.recurringDays) : (promo.recurringDays || [0, 6]);
    } catch (e) {}
    setRecurringDays(days);

    setGracePeriodMinutes(String(promo.gracePeriodMinutes || 0));
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    let targetIds = [];
    if (targetType === 'category') {
      if (!selectedCategory) {
        setErrorMessage('Please select a category');
        setIsSaving(false);
        return;
      }
      targetIds = [selectedCategory];
    } else if (targetType === 'tag') {
      if (!selectedTag.trim()) {
        setErrorMessage('Please enter a tag or color code');
        setIsSaving(false);
        return;
      }
      targetIds = [selectedTag.trim()];
    } else if (targetType === 'items') {
      if (selectedItemIds.length === 0) {
        setErrorMessage('Please select at least one item');
        setIsSaving(false);
        return;
      }
      targetIds = selectedItemIds;
    }

    const payload = {
      name,
      discountType,
      discountValue: parseFloat(discountValue),
      targetType,
      targetIds,
      startDate,
      endDate,
      isRecurring: isRecurring ? 1 : 0,
      recurringDays,
      gracePeriodMinutes: parseInt(gracePeriodMinutes, 10) || 0
    };

    try {
      const url = editingPromo ? `/api/promotions/${editingPromo.id}` : '/api/promotions';
      const method = editingPromo ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save promotion');
      }

      setIsModalOpen(false);
      fetchPromotions();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      await fetch(`/api/promotions/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: promo.isActive ? 0 : 1 })
      });
      fetchPromotions();
    } catch (err) {
      console.error('Failed to toggle promotion active status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      fetchPromotions();
    } catch (err) {
      console.error('Failed to delete promotion:', err);
    }
  };

  const handleDayToggle = (dayIdx) => {
    if (recurringDays.includes(dayIdx)) {
      setRecurringDays(recurringDays.filter(d => d !== dayIdx));
    } else {
      setRecurringDays([...recurringDays, dayIdx].sort());
    }
  };

  const filteredCatalogItems = catalogItems.filter(item => 
    item.name?.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.itemNum?.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                <Percent className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Sales & Timed Promotions</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Automated timed sales, recurring weekend schedules, register discounts, and printable physical booth signage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/promotions/display"
              className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-xs font-bold text-amber-400 flex items-center gap-2 transition-all shadow-lg hover:border-amber-500/40"
            >
              <Tv className="w-4 h-4" />
              <span>Digital Display Kiosk</span>
            </Link>
            <button
              onClick={openNewModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Promotion</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-950/60 border border-gray-850 p-5 rounded-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Now</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{stats.active}</p>
          </div>
          <div className="bg-gray-950/60 border border-gray-850 p-5 rounded-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Scheduled Ahead</p>
            <p className="text-3xl font-black text-blue-400 mt-1">{stats.scheduled}</p>
          </div>
          <div className="bg-gray-950/60 border border-gray-850 p-5 rounded-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Expired / Concluded</p>
            <p className="text-3xl font-black text-gray-400 mt-1">{stats.expired}</p>
          </div>
          <div className="bg-gray-950/60 border border-gray-850 p-5 rounded-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Promotions</p>
            <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-850 pb-2">
          {['all', 'active', 'scheduled', 'expired'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filterKey
                  ? 'bg-amber-500 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>

        {/* Promotions List */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-mono">Loading promotions...</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20 bg-gray-950/40 border border-dashed border-gray-800 rounded-3xl p-8 space-y-4">
            <div className="p-3 bg-gray-900 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto text-gray-600">
              <Percent className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">No Promotions Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Get started by creating your first promotional sale to drive customer discounts and antique booth markdowns.
            </p>
            <button
              onClick={openNewModal}
              className="px-4 py-2 bg-amber-500 text-gray-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              + Create Promotion
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotions.map((promo) => {
              const isPercentage = promo.discountType === 'percentage';
              const discountText = isPercentage 
                ? `${promo.discountValue}% OFF` 
                : `$${parseFloat(promo.discountValue).toFixed(2)} OFF`;

              const status = promo.timeStatus?.status || 'expired';
              const isGrace = promo.timeStatus?.inGracePeriod;

              return (
                <div 
                  key={promo.id}
                  className={`bg-gray-950/60 border rounded-3xl p-6 flex flex-col justify-between transition-all hover:border-gray-700 shadow-xl relative overflow-hidden ${
                    promo.isActiveNow
                      ? isGrace 
                        ? 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                        : 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.1)]'
                      : 'border-gray-850 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="space-y-4">
                    
                    {/* Card Header: Discount Badge & Time status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black text-xl px-3.5 py-1.5 rounded-2xl shadow-lg">
                        {discountText}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {promo.isActiveNow ? (
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                            isGrace
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isGrace ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}></span>
                            {isGrace ? 'Grace Window' : 'Active'}
                          </span>
                        ) : status === 'scheduled' ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Scheduled
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                            Concluded
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Promo Name & Target Scope */}
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">{promo.name}</h3>
                      <p className="text-xs text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>
                          {promo.targetType === 'booth' && 'Entire Booth Inventory'}
                          {promo.targetType === 'category' && 'Category Targeted'}
                          {promo.targetType === 'tag' && 'Tagged / Color Tag'}
                          {promo.targetType === 'items' && 'Selected Specific Items'}
                        </span>
                      </p>
                    </div>

                    {/* Schedule & Recurring Info */}
                    <div className="bg-gray-900/60 border border-gray-850 rounded-2xl p-3 text-xs space-y-1.5 font-mono text-gray-300">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Schedule:</span>
                        <span className="text-white">
                          {new Date(promo.startDate).toLocaleDateString()} &rarr; {new Date(promo.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {promo.isRecurring === 1 && (
                        <div className="flex justify-between items-center text-blue-400">
                          <span>Recurring:</span>
                          <span>Select Days</span>
                        </div>
                      )}

                      {promo.gracePeriodMinutes > 0 && (
                        <div className="flex justify-between items-center text-amber-400">
                          <span>Grace Window:</span>
                          <span>+{promo.gracePeriodMinutes} mins</span>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-gray-800 flex justify-between items-center text-xs font-bold text-white">
                        <span>Timer:</span>
                        <span className="text-emerald-400 font-sans">{promo.timeStatus?.label}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-gray-850 mt-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        title={promo.isActive ? 'Pause Promotion' : 'Activate Promotion'}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          promo.isActive 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {promo.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPrintPromo(promo);
                          setPrintModalOpen(true);
                        }}
                        title="Print Signs & Shelf-Talkers"
                        className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(promo)}
                        title="Edit Details"
                        className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        title="Delete Promotion"
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-850">
              <h2 className="text-lg font-bold text-white">
                {editingPromo ? 'Edit Promotion' : 'Create New Promotion'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              {errorMessage && (
                <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-2xl text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Promotion Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 40% Off Vintage Glassware Blowout"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="fixed_amount">Fixed Dollar Off ($)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Discount Amount {discountType === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    max={discountType === 'percentage' ? '100' : '9999'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Target Scope (All 3 options) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventory Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('booth')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      targetType === 'booth' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850'
                    }`}
                  >
                    <p className="text-xs">Entire Booth</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('category')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      targetType === 'category' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850'
                    }`}
                  >
                    <p className="text-xs">Category</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('items')}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      targetType === 'items' 
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850'
                    }`}
                  >
                    <p className="text-xs">Select Items</p>
                  </button>
                </div>
              </div>

              {/* Scope Detail Pickers */}
              {targetType === 'category' && (
                <div className="space-y-1.5 p-4 bg-gray-900/60 border border-gray-850 rounded-2xl">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">Select Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'items' && (
                <div className="space-y-2 p-4 bg-gray-900/60 border border-gray-850 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Select Items ({selectedItemIds.length} Selected)
                    </label>
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-2.5 py-1 w-48 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCatalogItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.itemNum);
                      return (
                        <div
                          key={item.itemNum}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedItemIds(selectedItemIds.filter(id => id !== item.itemNum));
                            } else {
                              setSelectedItemIds([...selectedItemIds, item.itemNum]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-amber-500/20 border-amber-500/60 text-white' 
                              : 'bg-gray-950/40 border-gray-850 text-gray-400 hover:bg-gray-900'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{item.itemNum}</p>
                          </div>
                          <span className="font-mono font-bold">${parseFloat(item.price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Grace Period Buffer Setting */}
              <div className="p-4 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white">Grace Period Buffer</label>
                    <p className="text-[11px] text-gray-400">
                      Gives shoppers waiting in line extra minutes before prices revert back.
                    </p>
                  </div>
                  <select
                    value={gracePeriodMinutes}
                    onChange={(e) => setGracePeriodMinutes(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
                  >
                    <option value="0">None (0 mins)</option>
                    <option value="5">5 Minutes Extra</option>
                    <option value="10">10 Minutes Extra</option>
                    <option value="15">15 Minutes Extra</option>
                    <option value="20">20 Minutes Extra</option>
                    <option value="30">30 Minutes Extra</option>
                  </select>
                </div>
              </div>

              {/* Recurring Schedule */}
              <div className="p-4 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white">Recurring Day Schedule</label>
                    <p className="text-[11px] text-gray-400">Repeats the sale automatically on specific days of the week.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                {isRecurring && (
                  <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-1">
                    {DAY_LABELS.map((dayLabel, idx) => {
                      const isSelected = recurringDays.includes(idx);
                      return (
                        <button
                          key={dayLabel}
                          type="button"
                          onClick={() => handleDayToggle(idx)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-amber-500 text-gray-950 font-black' 
                              : 'bg-gray-950 text-gray-400 hover:bg-gray-900 border border-gray-800'
                          }`}
                        >
                          {dayLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-850 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl text-xs font-black text-gray-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
                >
                  {isSaving ? 'Saving...' : (editingPromo ? 'Update Promotion' : 'Activate Promotion')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Printable Signage Modal */}
      <PrintableSaleSignModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        promotion={selectedPrintPromo}
      />

    </div>
  );
}

