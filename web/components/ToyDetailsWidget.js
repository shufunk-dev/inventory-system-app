'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

const PRESET_CONDITIONS = ["Empty box", "Figure with missing part", "Opened but complete", "Mint in box"];

export default function ToyDetailsWidget({ item, isPrivate, isGuest = false }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for the fields
  const [toyBrand, setToyBrand] = useState(item.toyBrand || '');
  const [toyYear, setToyYear] = useState(item.toyYear || '');
  
  const initialIsOther = !PRESET_CONDITIONS.includes(item.toyCondition) && item.toyCondition !== '' && item.toyCondition !== null;
  const [isOther, setIsOther] = useState(initialIsOther);
  const [toyCondition, setToyCondition] = useState(item.toyCondition || '');

  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setToyBrand(item.toyBrand || '');
      setToyYear(item.toyYear || '');
      setToyCondition(item.toyCondition || '');
      const updatedIsOther = !PRESET_CONDITIONS.includes(item.toyCondition) && item.toyCondition !== '' && item.toyCondition !== null;
      setIsOther(updatedIsOther);
    }
  }, [item, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/item/${item.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          toyBrand,
          toyYear,
          toyCondition
        })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      if (item.toyCondition !== toyCondition) {
        setIsRecalculating(true);
        setIsEditing(false);
        try {
          await fetch(`/api/item/${item.id}/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forceTier: 'market_value_only' })
          });
        } catch (e) {
          console.error("Recalculation failed", e);
        }
        setIsRecalculating(false);
      } else {
        setIsEditing(false);
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save toy details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`grid grid-cols-1 ${(!isPrivate || isGuest) ? '' : 'md:grid-cols-2'} gap-8 relative group`}>
      {/* Edit Overlay Button */}
      {!isEditing && !isGuest && (
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute -top-12 right-0 p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-full transition-all border border-gray-700 shadow-lg z-10 flex items-center gap-2 px-4"
        >
          <Edit2 className="w-4 h-4" />
          <span className="text-sm font-medium">Quick Edit</span>
        </button>
      )}

      {isEditing ? (
        <div className="bg-gray-900 border border-fuchsia-500/50 p-6 rounded-2xl md:col-span-2 space-y-6 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">Edit Toy Details</h3>
            <span className="text-xs text-fuchsia-400">Changes to condition will update Market Value</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Brand</label>
              <input 
                type="text" 
                value={toyBrand} 
                onChange={e => setToyBrand(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
                placeholder="e.g. Hasbro"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Release Year</label>
              <input 
                type="text" 
                value={toyYear} 
                onChange={e => setToyYear(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500"
                placeholder="e.g. 1984"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Condition</label>
              <div className="space-y-3 bg-gray-950 p-4 rounded-xl border border-gray-800">
                {PRESET_CONDITIONS.map(cond => (
                  <label key={cond} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${toyCondition === cond && !isOther ? 'border-fuchsia-500' : 'border-gray-600 group-hover:border-fuchsia-400'}`}>
                      {toyCondition === cond && !isOther && <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />}
                    </div>
                    <input 
                      type="radio" 
                      name="quick-condition" 
                      value={cond}
                      checked={toyCondition === cond && !isOther}
                      onChange={() => { setIsOther(false); setToyCondition(cond); }}
                      className="hidden"
                    />
                    <span className={`text-sm transition-colors ${toyCondition === cond && !isOther ? 'text-fuchsia-400 font-bold' : 'text-gray-300'}`}>{cond}</span>
                  </label>
                ))}
                
                <label className="flex items-center gap-3 cursor-pointer group mt-4 pt-4 border-t border-gray-800/50">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isOther ? 'border-fuchsia-500' : 'border-gray-600 group-hover:border-fuchsia-400'}`}>
                    {isOther && <div className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />}
                  </div>
                  <input 
                    type="radio" 
                    name="quick-condition" 
                    checked={isOther}
                    onChange={() => { setIsOther(true); setToyCondition(''); }}
                    className="hidden"
                  />
                  <span className={`text-sm transition-colors ${isOther ? 'text-fuchsia-400 font-bold' : 'text-gray-300'}`}>Other (Specify)</span>
                </label>
                
                {isOther && (
                  <div className="pl-8 mt-3">
                    <input 
                      type="text" 
                      value={toyCondition} 
                      onChange={e => setToyCondition(e.target.value)}
                      placeholder="Type custom condition..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {isSaving ? 'Saving...' : 'Save Toy Details'}
            </button>
            <button 
              onClick={() => {
                setIsEditing(false);
                setToyBrand(item.toyBrand || '');
                setToyYear(item.toyYear || '');
                setToyCondition(item.toyCondition || '');
                setIsOther(initialIsOther);
              }}
              disabled={isSaving}
              className="px-6 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/30 p-6 rounded-2xl border border-gray-700/50 flex flex-col justify-center gap-4 relative">
          {item.toyBrand && (
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
              <span className="text-gray-400 font-medium">Brand</span>
              <span className="text-white font-bold">{item.toyBrand}</span>
            </div>
          )}
          {item.toyYear && (
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
              <span className="text-gray-400 font-medium">Release Year</span>
              <span className="text-white font-bold">{item.toyYear}</span>
            </div>
          )}
          {item.toyCondition && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Condition</span>
              <span className="bg-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full text-sm font-bold">
                {item.toyCondition}
              </span>
            </div>
          )}
          {!item.toyBrand && !item.toyYear && !item.toyCondition && (
            <div className="text-center text-gray-500 py-4 italic">
              No toy details entered yet.
            </div>
          )}
        </div>
      )}

      {/* Secure Market Value Estimator (Private) */}
      {!isEditing && isPrivate && (
        <>
          {isRecalculating ? (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-fuchsia-500/30 flex flex-col items-center justify-center min-h-[160px]">
              <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-300 animate-pulse">Recalculating Market Value...</p>
              <p className="text-xs text-gray-500 mt-2">Searching Google Shopping for new condition</p>
            </div>
          ) : item.valueAvg ? (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <div className="w-16 h-16 bg-green-500 rounded-full blur-3xl"></div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Current Market Value</h3>
                <span className="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-300">Private</span>
              </div>
              
              <div className="mb-4">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">
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
                className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Recalculate Market Value
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-gray-700/50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                <div className="w-16 h-16 bg-gray-500 rounded-full blur-3xl"></div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Current Market Value</h3>
                <span className="bg-gray-700 text-xs px-2 py-0.5 rounded text-gray-300">Private</span>
              </div>
              
              <div className="mb-4">
                <span className="text-2xl font-black text-gray-500">
                  Not Calculated
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-4">Condition and market value have not been fetched yet.</p>
              
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
                className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                Calculate Market Value
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
