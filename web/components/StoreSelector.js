'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Store, ChevronDown } from 'lucide-react';

export default function StoreSelector({ stores = [], activeStoreId = 'default', showDefault = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStore = async (storeId) => {
    setIsOpen(false);
    try {
      const response = await fetch('/api/user/active-store', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId }),
      });

      if (response.ok) {
        // Force reload to completely refresh db connection contexts
        window.location.reload();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to switch store');
      }
    } catch (error) {
      console.error('Error switching store:', error);
      alert('Error switching store');
    }
  };

  const activeStoreName = activeStoreId === 'default' 
    ? (showDefault ? 'Default Catalog' : (stores[0]?.name || 'Default Catalog'))
    : (stores.find(s => s.id === activeStoreId)?.name || (showDefault ? 'Default Catalog' : (stores[0]?.name || 'Default Catalog')));

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all bg-gray-900 border border-gray-800 hover:border-gray-700 shadow-md focus:outline-none"
          id="menu-button"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Store className="w-3.5 h-3.5 text-blue-400" />
          <span>{activeStoreName}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-2xl bg-[#0d0d0d] border border-gray-800 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden transition-all duration-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
        >
          <div className="py-1" role="none">
            {showDefault && (
              <button
                onClick={() => handleSelectStore('default')}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                  activeStoreId === 'default'
                    ? 'bg-blue-600/10 text-blue-400 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
                role="menuitem"
              >
                <span>Default Catalog</span>
                {activeStoreId === 'default' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
              </button>
            )}
            
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelectStore(store.id)}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                  activeStoreId === store.id
                    ? 'bg-blue-600/10 text-blue-400 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
                role="menuitem"
              >
                <span className="truncate">{store.name}</span>
                {activeStoreId === store.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
