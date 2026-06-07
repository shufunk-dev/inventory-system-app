'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, Trash2, CheckSquare, Square, FolderInput, X, Loader2, Printer } from 'lucide-react';
import { buildCategoryTree } from '@/lib/categories';

export default function CatalogGrid({ items }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk Move State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    if (isMoveModalOpen && categories.length === 0) {
      fetch('/api/categories')
        .then(r => r.json())
        .then(data => setCategories(buildCategoryTree(data)))
        .catch(console.error);
    }
  }, [isMoveModalOpen]);

  const toggleSelect = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(items.map(item => item.id))); // Select all on page
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/item/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });

      if (res.ok) {
        setSelectedIds(new Set());
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to delete items');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.size === 0) return;
    setIsMoving(true);
    
    let finalCategoryId = selectedCategoryId;

    try {
      // If the user typed a new category, create it first
      if (newCategoryName.trim()) {
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: newCategoryName.trim(),
            parentId: selectedCategoryId || null // If a category is selected, make the new one a child of it!
          })
        });
        
        if (!catRes.ok) throw new Error('Failed to create new category');
        
        const newCat = await catRes.json();
        finalCategoryId = newCat.id;
      }

      const res = await fetch('/api/item/bulk-category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedIds), categoryId: finalCategoryId })
      });
      
      if (res.ok) {
        setSelectedIds(new Set());
        setIsMoveModalOpen(false);
        setNewCategoryName('');
        setSelectedCategoryId('');
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert(e.message || 'Failed to move items');
    } finally {
      setIsMoving(false);
    }
  };

  const handleBulkPrint = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(',');
    window.open(`/item/print?ids=${ids}`, '_blank');
  };

  return (
    <div>
      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between bg-blue-900/20 border border-blue-500/30 p-4 rounded-2xl animate-in slide-in-from-top-2 gap-4">
          <span className="text-blue-200 font-medium">
            {selectedIds.size} item(s) selected
          </span>
          <div className="flex gap-3">
            <button 
              onClick={handleBulkPrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print Barcodes
            </button>
            <button 
              onClick={() => setIsMoveModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors"
            >
              <FolderInput className="w-4 h-4" />
              Move Selected
            </button>
            <button 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-3xl p-8 max-w-md w-full border border-gray-700 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-white mb-6">Move {selectedIds.size} Items</h2>
            
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Select Destination</label>
            <select 
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 appearance-none mb-4"
            >
              <option value="">-- Uncategorized (Root) --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-sm font-medium text-gray-500 uppercase tracking-widest">OR</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
              Create New {selectedCategoryId ? 'Subcategory' : 'Category'}
            </label>
            <input 
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={selectedCategoryId ? "Nested inside selected..." : "New top-level category..."}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 mb-8"
            />

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsMoveModalOpen(false)}
                disabled={isMoving}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button 
                onClick={handleBulkMove}
                disabled={isMoving}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
                {isMoving ? 'Moving...' : 'Confirm Move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="mb-4 flex items-center justify-between">
        <button 
          onClick={handleSelectAll}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
        >
          {selectedIds.size === items.length && items.length > 0 ? (
            <><CheckSquare className="w-4 h-4" /> Deselect All</>
          ) : (
            <><Square className="w-4 h-4" /> Select All ({items.length})</>
          )}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {items.map(item => {
          const isSelected = selectedIds.has(item.id);
          return (
            <Link href={`/item/${item.id}`} key={item.id} className="group block relative">
              <div className={`bg-gray-900 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 border ${isSelected ? 'border-red-500 bg-red-900/10' : 'border-gray-800 hover:border-blue-500/50'}`}>
                
                {/* Checkbox Overlay */}
                <button 
                  onClick={(e) => toggleSelect(e, item.id)}
                  className="absolute top-4 right-4 z-10 text-white drop-shadow-md bg-black/40 rounded p-1 hover:bg-black/60 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-red-500" />
                  ) : (
                    <Square className="w-5 h-5 text-white/70" />
                  )}
                </button>

                <div className="aspect-square rounded-xl overflow-hidden bg-gray-800 mb-3 relative">
                  {item.imagePath ? (
                    <img 
                      src={item.imagePath} 
                      alt={item.name || 'Inventory item'} 
                      className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'opacity-50' : 'group-hover:scale-110'}`}
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center text-gray-600 ${isSelected ? 'opacity-50' : ''}`}>
                      <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                      <span className="text-xs font-medium">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                <div className="px-1 pb-1">
                  <h3 className="text-sm md:text-base font-bold text-gray-100 mb-1 truncate">
                    {item.name || 'Unnamed Item'}
                  </h3>
                  <p className="text-xs font-mono text-blue-400 truncate">
                    {item.barcode || 'Manual'}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
