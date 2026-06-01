'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Settings2, Edit2, Plus } from 'lucide-react';
import EditCategoryModal from './EditCategoryModal';
import CreateCategoryModal from './CreateCategoryModal';

export default function CatalogFilters({ initialCategories }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [advanced, setAdvanced] = useState(searchParams.get('advanced') === 'true');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [isEditCatModalOpen, setIsEditCatModalOpen] = useState(false);
  const [isCreateCatModalOpen, setIsCreateCatModalOpen] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (query) params.set('q', query);
      else params.delete('q');
      
      if (advanced) params.set('advanced', 'true');
      else params.delete('advanced');
      
      if (category) params.set('category', category);
      else params.delete('category');

      params.set('page', '1'); // reset page on filter change
      
      router.push(`/?${params.toString()}`);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, advanced, category, router]);

  const selectedCatObj = initialCategories.find(c => c.id === category);

  return (
    <div className="mb-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg"
            placeholder="Search items by name..."
          />
        </div>

        {/* Category Dropdown */}
        <div className="relative md:w-64 flex items-center gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-lg cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {initialCategories.map(c => (
              <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
            ))}
          </select>
          
          {category && category !== 'uncategorized' && selectedCatObj && (
            <button 
              onClick={() => setIsEditCatModalOpen(true)}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors shrink-0"
              title="Edit Category Name"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}

          <button 
            onClick={() => setIsCreateCatModalOpen(true)}
            className="p-3 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-xl transition-colors shrink-0"
            title="Create New Category"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={() => setAdvanced(!advanced)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            advanced ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gray-900/50 text-gray-500 hover:text-gray-300 border border-transparent'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Advanced Search (Include Metadata)
        </button>
      </div>

      {isEditCatModalOpen && selectedCatObj && (
        <EditCategoryModal 
          category={selectedCatObj} 
          onClose={() => setIsEditCatModalOpen(false)} 
        />
      )}

      {isCreateCatModalOpen && (
        <CreateCategoryModal 
          onClose={() => setIsCreateCatModalOpen(false)} 
        />
      )}
    </div>
  );
}
