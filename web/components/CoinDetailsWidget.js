'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Check, X, Loader2 } from 'lucide-react';

const AGENCIES = ["Raw (Ungraded)", "PCGS", "NGC", "ANACS", "ICG", "Other"];
const CONDITIONS = [
  "Poor (PO-1)", 
  "Good (G-4)", 
  "Fine (F-12)", 
  "Very Fine (VF-20)", 
  "Extremely Fine (XF-40)", 
  "About Uncirculated (AU-50)", 
  "Mint State (MS-60)", 
  "Gem Brilliant Uncirculated (MS-65)", 
  "Perfect Uncirculated (MS-70)", 
  "Proof (PR)"
];

export default function CoinDetailsWidget({ item, isPrivate, isGuest = false }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // State for the fields
  const [coinCertNumber, setCoinCertNumber] = useState(item.coinCertNumber || '');
  
  const initialAgencyIsOther = !AGENCIES.includes(item.coinGradingAgency) && item.coinGradingAgency !== '' && item.coinGradingAgency !== null;
  const [agencyIsOther, setAgencyIsOther] = useState(initialAgencyIsOther);
  const [coinGradingAgency, setCoinGradingAgency] = useState(item.coinGradingAgency || '');

  const initialConditionIsOther = !CONDITIONS.includes(item.coinCondition) && item.coinCondition !== '' && item.coinCondition !== null;
  const [conditionIsOther, setConditionIsOther] = useState(initialConditionIsOther);
  const [coinCondition, setCoinCondition] = useState(item.coinCondition || '');

  useEffect(() => {
    if (!isEditing) {
      setCoinCertNumber(item.coinCertNumber || '');
      setCoinGradingAgency(item.coinGradingAgency || '');
      setCoinCondition(item.coinCondition || '');
      
      const updatedAgencyIsOther = !AGENCIES.includes(item.coinGradingAgency) && item.coinGradingAgency !== '' && item.coinGradingAgency !== null;
      setAgencyIsOther(updatedAgencyIsOther);
      
      const updatedConditionIsOther = !CONDITIONS.includes(item.coinCondition) && item.coinCondition !== '' && item.coinCondition !== null;
      setConditionIsOther(updatedConditionIsOther);
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
          coinGradingAgency,
          coinCertNumber,
          coinCondition
        })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      if (item.coinCondition !== coinCondition || item.coinGradingAgency !== coinGradingAgency) {
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
      alert('Failed to save coin details');
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
        <div className="bg-gray-900 border border-amber-500/50 p-6 rounded-2xl md:col-span-2 space-y-6 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">Edit Coin Details</h3>
            <span className="text-xs text-amber-400">Changes to condition will update Market Value</span>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Grading Agency</label>
                <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 mb-3 space-y-2">
                  <select 
                    value={agencyIsOther ? 'Other' : (coinGradingAgency || '')} 
                    onChange={e => {
                      if (e.target.value === 'Other') {
                        setAgencyIsOther(true);
                        setCoinGradingAgency('');
                      } else {
                        setAgencyIsOther(false);
                        setCoinGradingAgency(e.target.value);
                      }
                    }}
                    className="w-full bg-transparent text-white text-sm focus:outline-none"
                  >
                    <option value="" disabled>Select an agency...</option>
                    {AGENCIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {agencyIsOther && (
                  <input 
                    type="text" 
                    value={coinGradingAgency} 
                    onChange={e => setCoinGradingAgency(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                    placeholder="Enter custom agency..."
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Certification Number</label>
                <input 
                  type="text" 
                  value={coinCertNumber} 
                  onChange={e => setCoinCertNumber(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. 1234567-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sheldon Condition Grade</label>
              <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 mb-3">
                <select 
                  value={conditionIsOther ? 'Other' : (coinCondition || '')} 
                  onChange={e => {
                    if (e.target.value === 'Other') {
                      setConditionIsOther(true);
                      setCoinCondition('');
                    } else {
                      setConditionIsOther(false);
                      setCoinCondition(e.target.value);
                    }
                  }}
                  className="w-full bg-transparent text-white text-sm focus:outline-none"
                >
                  <option value="" disabled>Select condition grade...</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other (Specify)</option>
                </select>
              </div>
              {conditionIsOther && (
                <input 
                  type="text" 
                  value={coinCondition} 
                  onChange={e => setCoinCondition(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Type custom condition..."
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-800">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {isSaving ? 'Saving...' : 'Save Coin Details'}
            </button>
            <button 
              onClick={() => {
                setIsEditing(false);
                setCoinGradingAgency(item.coinGradingAgency || '');
                setCoinCertNumber(item.coinCertNumber || '');
                setCoinCondition(item.coinCondition || '');
                setAgencyIsOther(initialAgencyIsOther);
                setConditionIsOther(initialConditionIsOther);
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
          {item.coinGradingAgency && (
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
              <span className="text-gray-400 font-medium">Grading Agency</span>
              <span className="text-white font-bold">{item.coinGradingAgency}</span>
            </div>
          )}
          {item.coinCertNumber && (
            <div className="flex justify-between items-center border-b border-gray-700/50 pb-2">
              <span className="text-gray-400 font-medium">Cert Number</span>
              <span className="text-white font-bold">{item.coinCertNumber}</span>
            </div>
          )}
          {item.coinCondition && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-medium">Condition</span>
              <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-bold">
                {item.coinCondition}
              </span>
            </div>
          )}
          {!item.coinGradingAgency && !item.coinCertNumber && !item.coinCondition && (
            <div className="text-center text-gray-500 py-4 italic">
              No coin details entered yet.
            </div>
          )}
        </div>
      )}

      {/* Secure Market Value Estimator (Private) */}
      {!isEditing && isPrivate && (
        <>
          {isRecalculating ? (
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-6 rounded-2xl border border-amber-500/30 flex flex-col items-center justify-center min-h-[160px]">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
              <p className="text-sm font-bold text-gray-300 animate-pulse">Recalculating Market Value...</p>
              <p className="text-xs text-gray-500 mt-2">Searching live sales for new condition</p>
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

              <div className="flex justify-between items-end border-t border-gray-700/50 pt-4 mt-2">
                <div>
                  <p className="text-xs text-gray-500 font-bold mb-1">LOW</p>
                  <p className="text-sm text-gray-300 font-mono">${(item.valueLow || 0).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold mb-1">HIGH</p>
                  <p className="text-sm text-gray-300 font-mono">${(item.valueHigh || 0).toFixed(2)}</p>
                </div>
              </div>
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
