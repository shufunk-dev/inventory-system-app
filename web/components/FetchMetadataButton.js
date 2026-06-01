'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function FetchMetadataButton({ itemId, isAdmin, userTier }) {
  const [isFetching, setIsFetching] = useState(false);
  const [selectedTier, setSelectedTier] = useState('basic');
  const router = useRouter();
  
  const isPremium = userTier === 'premium' || isAdmin;

  const handleFetch = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`/api/item/${itemId}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceTier: selectedTier })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert('Success! Found metadata and updated the item.');
        } else {
          if (data.reason === 'rate_limited') {
            alert('Failed: Rate limit hit. Please try again later.');
          } else {
            alert('Failed: Could not find any metadata or image match for this item.');
          }
        }
        router.refresh();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to trigger fetch');
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full mt-8 bg-gray-900/40 p-5 rounded-2xl border border-gray-800/80">
      <div className="flex-1 relative">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">AI Pipeline Engine</label>
        <select 
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          disabled={isFetching}
          className="w-full bg-black/80 border border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 appearance-none font-medium outline-none transition-colors disabled:opacity-50 cursor-pointer"
        >
          <option value="basic">Standard Web Search</option>
          {isPremium && <option value="premium">Premium Image Lens</option>}
          <option disabled>──────────</option>
          <option value="coin">⚡ Coin AI Engine</option>
          <option value="toy">⚡ Action Figure Engine</option>
          <option value="video">⚡ VHS & Movie Engine</option>
          <option value="game">⚡ Video Game Engine</option>
          <option value="card">⚡ Trading Card Engine</option>
          <option value="comic">⚡ Comic Book Engine</option>
        </select>
        {/* Custom Chevron for select */}
        <div className="absolute right-4 top-[38px] pointer-events-none text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
      
      <div className="flex items-end flex-1 sm:flex-none">
        <button 
          onClick={handleFetch}
          disabled={isFetching}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)] border border-blue-500/50"
        >
          <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Processing...' : 'Run Pipeline'}
        </button>
      </div>
    </div>
  );
}
