'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Save, X } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function EditItemForm({ item, initialCategories = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name || '');
  const [description, setDescription] = useState(item.description || '');
  const [categoryId, setCategoryId] = useState(item.categoryId || '');
  
  // Toy specific fields
  const [toyBrand, setToyBrand] = useState(item.toyBrand || '');
  const [toyYear, setToyYear] = useState(item.toyYear || '');
  
  const PRESET_CONDITIONS = ["Empty box", "Figure with missing part", "Opened but complete", "Mint in box", "Unknown Condition"];
  const [toyCondition, setToyCondition] = useState(item.toyCondition || 'Unknown Condition');
  const initialIsOther = !PRESET_CONDITIONS.includes(item.toyCondition) && item.toyCondition !== '' && item.toyCondition !== null;
  const [isOther, setIsOther] = useState(initialIsOther);
  const [customConditionText, setCustomConditionText] = useState(initialIsOther ? item.toyCondition : '');

  const [categories, setCategories] = useState(buildCategoryTree(initialCategories));
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isEditing && categories.length === 0) {
      fetch('/api/categories').then(r => r.json()).then(data => setCategories(buildCategoryTree(data))).catch(console.error);
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/item/${item.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, categoryId, toyBrand, toyYear, toyCondition })
      });

      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to save edits');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="relative group">
        <button 
          id="main-edit-button"
          onClick={() => setIsEditing(true)}
          className="absolute -top-4 -right-4 p-2 bg-blue-600 hover:bg-blue-500 rounded-full text-white transition-opacity shadow-lg"
          title="Edit Details"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight pr-8">
          {item.name || 'Unnamed Item'}
        </h1>
        
        {item.description && (
          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 mb-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description / Details</h3>
            <p className="text-gray-300 leading-relaxed text-sm">
              {item.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-blue-500/50 mb-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Item Name</label>
        <input 
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Enter item name..."
        />
      </div>
      
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description / Details</label>
        <textarea 
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[120px]"
          placeholder="Enter detailed description, plot summary, or notes..."
        />
      </div>

      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
        <select 
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        >
          <option value="">-- Uncategorized --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>
      </div>

      {item.itemType === 'toy' && (
        <div className="bg-fuchsia-900/10 border border-fuchsia-500/20 p-4 rounded-xl mb-6">
          <h3 className="text-sm font-bold text-fuchsia-400 mb-4 flex items-center gap-2">
            Toy Properties
            <span className="text-xs text-gray-400 font-normal ml-auto">Changes to Condition will recalculate Market Value</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brand / Manufacturer</label>
              <input 
                type="text"
                value={toyBrand}
                onChange={e => setToyBrand(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                placeholder="e.g. Hasbro"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Release Year</label>
              <input 
                type="text"
                value={toyYear}
                onChange={e => setToyYear(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                placeholder="e.g. 1984"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condition</label>
              <div className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                {["Empty box", "Figure with missing part", "Opened but complete", "Mint in box"].map(cond => (
                  <label key={cond} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${toyCondition === cond && !isOther ? 'border-fuchsia-500' : 'border-gray-600 group-hover:border-fuchsia-400'}`}>
                      {toyCondition === cond && !isOther && <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />}
                    </div>
                    <input 
                      type="radio" 
                      name="condition" 
                      value={cond}
                      checked={toyCondition === cond && !isOther}
                      onChange={() => { setIsOther(false); setToyCondition(cond); }}
                      className="hidden"
                    />
                    <span className={`text-sm transition-colors ${toyCondition === cond && !isOther ? 'text-fuchsia-400 font-bold' : 'text-gray-300'}`}>{cond}</span>
                  </label>
                ))}
                
                <label className="flex items-center gap-3 cursor-pointer group mt-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isOther ? 'border-fuchsia-500' : 'border-gray-600 group-hover:border-fuchsia-400'}`}>
                    {isOther && <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />}
                  </div>
                  <input 
                    type="radio" 
                    name="condition" 
                    checked={isOther}
                    onChange={() => { setIsOther(true); setToyCondition(customConditionText); }}
                    className="hidden"
                  />
                  <span className={`text-sm transition-colors ${isOther ? 'text-fuchsia-400 font-bold' : 'text-gray-300'}`}>Other (Specify):</span>
                </label>
                {isOther && (
                  <input 
                    type="text" 
                    value={customConditionText} 
                    onChange={e => { 
                      setCustomConditionText(e.target.value); 
                      setToyCondition(e.target.value); 
                    }} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-fuchsia-500 transition-colors mt-2" 
                    placeholder="Briefly describe the condition..." 
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button 
          onClick={() => setIsEditing(false)}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
