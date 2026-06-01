'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Loader2 } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function CreateCategoryModal({ onClose }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => setCategories(buildCategoryTree(data)))
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: parentId || null })
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Failed to create category');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Category</h2>
        
        <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Category Name</label>
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 mb-6"
          autoFocus
          placeholder="e.g. Media, Hardware, Tools"
        />

        <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Parent Category (Optional)</label>
        <select 
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none mb-8"
        >
          <option value="">-- None (Top Level) --</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
