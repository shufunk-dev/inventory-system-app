'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StandardDetailsWidget({ item }) {
  const router = useRouter();
  const [isRecalculating, setIsRecalculating] = useState(false);

  return (
    <div className="mb-12">
      {isRecalculating ? (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-blue-500/30 flex flex-col items-center justify-center min-h-[160px]">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
          <p className="text-sm font-bold text-gray-300 animate-pulse">Recalculating Market Value...</p>
          <p className="text-xs text-gray-500 mt-2">Searching Google Shopping for item prices</p>
        </div>
      ) : item.valueAvg ? (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="w-16 h-16 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Estimated Market Value</h3>
            <span className="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-300">Private</span>
          </div>
          
          <div className="mb-4">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
              ${item.valueAvg.toFixed(2)}
            </span>
            <span className="text-gray-400 text-sm ml-2 font-medium">est.</span>
          </div>

          <div className="flex justify-between items-end border-t border-gray-700/50 pt-4 mt-2 mb-4">
            <div>
              <p className="text-xs text-gray-500 font-bold mb-1">LOW</p>
              <p className="text-sm text-gray-300 font-mono">${(item.valueLow || 0).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-bold mb-1">HIGH</p>
              <p className="text-sm text-gray-300 font-mono">${(item.valueHigh || 0).toFixed(2)}</p>
            </div>
          </div>

          <button 
            onClick={async () => {
              setIsRecalculating(true);
              try {
                await fetch(`/api/item/${item.id}/fetch`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ forceTier: 'market_value_only' })
                });
              } catch (e) {
                console.error(e);
              }
              setIsRecalculating(false);
              router.refresh();
            }}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Refresh Market Value
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <div className="w-16 h-16 bg-gray-500 rounded-full blur-3xl"></div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Estimated Market Value</h3>
            <span className="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-300">Private</span>
          </div>
          
          <div className="mb-4">
            <span className="text-2xl font-black text-gray-500">
              Not Calculated
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4">Market value estimates have not been calculated yet.</p>
          
          <button 
            onClick={async () => {
              setIsRecalculating(true);
              try {
                await fetch(`/api/item/${item.id}/fetch`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ forceTier: 'market_value_only' })
                });
              } catch (e) {
                console.error(e);
              }
              setIsRecalculating(false);
              router.refresh();
            }}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Calculate Market Value
          </button>
        </div>
      )}
      <hr className="border-gray-800 my-12" />
    </div>
  );
}
