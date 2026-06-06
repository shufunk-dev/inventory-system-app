'use client';

import { useState, useEffect, useRef } from 'react';
import { Store, Loader2, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserBoothSelector({ user }) {
  const [stores, setStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  // Load stores from API
  useEffect(() => {
    fetch('/api/admin/stores')
      .then(res => res.json())
      .then(data => {
        if (data.stores) {
          setStores(data.stores);
        }
      })
      .catch(err => console.error('Error fetching stores for selector:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (user.isAdmin === 1 || user.isRoot === 1) {
    return (
      <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 text-[10px] sm:text-xs px-3 py-1.5 rounded-full uppercase tracking-wider font-bold" title="Admin has full access to all booth databases.">
        All Booths (Admin)
      </span>
    );
  }

  // Parse allowed store IDs from user record
  const allowedStoreIds = user.storeId 
    ? user.storeId.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const isAllBooths = allowedStoreIds.length === 0 || user.storeId === 'default' || !user.storeId;

  const handleToggleStore = async (storeId) => {
    setIsUpdating(true);
    let newStoreIds = [];

    if (storeId === 'default') {
      newStoreIds = []; // empty array means default (all stores)
    } else {
      if (allowedStoreIds.includes(storeId)) {
        // Remove from list
        newStoreIds = allowedStoreIds.filter(id => id !== storeId);
      } else {
        // Add to list
        newStoreIds = [...allowedStoreIds, storeId];
      }
    }

    const finalStoreId = newStoreIds.length === 0 ? 'default' : newStoreIds.join(',');

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: finalStoreId })
      });

      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Failed to update booth assignments: ${err.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Network error while updating booth assignments.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Build the text display for current assignments
  let buttonText = 'All Booths (Default)';
  if (!isAllBooths) {
    const names = allowedStoreIds.map(id => stores.find(s => s.id === id)?.name || id);
    buttonText = names.join(', ');
    if (buttonText.length > 28) {
      buttonText = buttonText.substring(0, 25) + '...';
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isUpdating}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all bg-gray-800/80 border border-gray-700 hover:border-gray-650 shadow-md focus:outline-none disabled:opacity-50 min-w-[140px] justify-between ${
          !isAllBooths ? 'text-blue-400 border-blue-500/20 bg-blue-500/5' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Store className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{buttonText}</span>
        </div>
        {isUpdating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-2xl bg-[#0d0d0d] border border-gray-800 shadow-2xl focus:outline-none overflow-hidden max-h-72 flex flex-col">
          <div className="p-3 border-b border-gray-800 bg-gray-950/40">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assign Booth Access</span>
          </div>

          <div className="overflow-y-auto py-1 flex-1">
            {/* Default Catalog Option */}
            <button
              onClick={() => handleToggleStore('default')}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-900 transition-colors flex items-center gap-2.5 font-medium"
            >
              {isAllBooths ? (
                <CheckSquare className="w-4 h-4 text-blue-500" />
              ) : (
                <Square className="w-4 h-4 text-gray-600" />
              )}
              <span>All Booths (Default)</span>
            </button>

            <div className="border-t border-gray-800/60 my-1"></div>

            {/* Individual stores list */}
            {isLoading ? (
              <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading booths...
              </div>
            ) : stores.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No custom store profiles found. Create them below first.
              </div>
            ) : (
              stores.map((store) => {
                const isChecked = allowedStoreIds.includes(store.id);
                return (
                  <button
                    key={store.id}
                    onClick={() => handleToggleStore(store.id)}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-gray-900 transition-colors flex items-center gap-2.5"
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="truncate">{store.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
