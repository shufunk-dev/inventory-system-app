'use client';

import { useState, useEffect } from 'react';
import { Store, Loader2, Plus, Trash2 } from 'lucide-react';

export default function AdminStoreProfilesSection() {
  const [stores, setStores] = useState([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeMessage, setStoreMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/stores')
      .then(res => res.json())
      .then(sData => {
        if (sData.stores) setStores(sData.stores);
      })
      .catch(err => console.error('Error fetching stores:', err));
  }, []);

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    setStoresLoading(true);
    setStoreMessage('');
    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStoreName })
      });
      const data = await res.json();
      if (res.ok) {
        setStores([data.store, ...stores]);
        setNewStoreName('');
        setStoreMessage('Store profile created successfully!');
      } else {
        setStoreMessage(`Error: ${data.error || 'Failed to create store'}`);
      }
    } catch (e) {
      setStoreMessage('Network error creating store.');
    } finally {
      setStoresLoading(false);
    }
  };

  const handleDeleteStore = async (storeId) => {
    if (!confirm('Are you sure you want to delete this store profile? All items, categories, and inventory counts inside this store will be permanently deleted.')) return;
    setStoreMessage('');
    try {
      const res = await fetch(`/api/admin/stores?id=${storeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setStores(stores.filter(s => s.id !== storeId));
        setStoreMessage('Store profile deleted successfully.');
      } else {
        const data = await res.json();
        setStoreMessage(`Error: ${data.error || 'Failed to delete store'}`);
      }
    } catch (e) {
      setStoreMessage('Network error deleting store.');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
      <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Store className="w-5 h-5 text-blue-400" />
        Store Profiles Manager
      </h2>
      <p className="text-gray-400 mb-6 text-sm">
        Create and manage multiple physical store contexts (e.g. booths or sections within an antique mall). Switch between them instantly from the top-right navigation header.
      </p>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800">
          <span>Store Name</span>
          <span>Status / Actions</span>
        </div>

        <div className="flex justify-between items-center bg-gray-950/40 border border-gray-800 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-300 font-medium">Default Catalog (Built-in)</span>
          </div>
          <span className="text-xs text-gray-500 italic">System Default</span>
        </div>

        {stores.map((s) => (
          <div key={s.id} className="flex justify-between items-center bg-gray-900/60 border border-gray-800 px-4 py-3 rounded-xl hover:border-gray-700 transition-colors">
            <span className="text-sm text-white font-medium">{s.name}</span>
            <button
              onClick={() => handleDeleteStore(s.id)}
              className="text-red-450 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 hover:border-red-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Delete Store Profile"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreateStore} className="space-y-4 pt-4 border-t border-gray-800">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Add New Store profile</label>
          <div className="flex gap-3">
            <input 
              type="text"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              placeholder="e.g. Tenant Booth A-12"
              required
            />
            <button
              type="submit"
              disabled={storesLoading || !newStoreName.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-5 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              {storesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Store
            </button>
          </div>
        </div>
        {storeMessage && (
          <p className={`text-sm ${storeMessage.includes('success') || storeMessage.includes('successfully') ? 'text-green-450' : 'text-red-400'}`}>
            {storeMessage}
          </p>
        )}
      </form>
    </div>
  );
}
