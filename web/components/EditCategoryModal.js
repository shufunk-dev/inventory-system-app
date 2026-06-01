'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Trash2, Loader2 } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function EditCategoryModal({ category, onClose }) {
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
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
      alert('Failed to rename category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the category "${category.name}"? All items in this category will become uncategorized.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-white mb-6">Edit Category</h2>
        
        <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Category Name</label>
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 mb-6"
          autoFocus
        />

        <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Parent Category (Optional)</label>
        <select 
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none mb-8"
        >
          <option value="">-- None (Top Level) --</option>
          {categories.filter(c => c.id !== category.id).map(c => (
            <option key={c.id} value={c.id}>{c.displayName}</option>
          ))}
        </select>

        <div className="flex justify-between items-center">
          <button 
            onClick={handleDelete}
            disabled={isLoading || isDeleting}
            className="p-2 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete Category"
          >
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isLoading || isDeleting}
              className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isLoading || isDeleting || !name.trim()}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
