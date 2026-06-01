'use client';
import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';

export default function CardDetailsWidget({ item }) {
  const [isEditing, setIsEditing] = useState(false);
  const [agency, setAgency] = useState(item.cardGradingAgency || 'Raw');
  const [condition, setCondition] = useState(item.cardCondition || 'Unknown Condition');
  const [cert, setCert] = useState(item.cardCertNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);

  const agencyOptions = ['Raw', 'PSA', 'BGS', 'SGC', 'CGC', 'Other'];
  
  const conditionOptions = [
    'Unknown Condition',
    'Raw (Ungraded)',
    'Poor 1',
    'Good 2',
    'Very Good 3',
    'VG-EX 4',
    'EX 5',
    'EX-MT 6',
    'Near Mint 7',
    'NM-MT 8',
    'Mint 9',
    'Gem Mint 10',
    'Pristine 10'
  ];

  const handleSave = async () => {
    setIsSaving(true);
    await fetch(`/api/item/${item.id}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardGradingAgency: agency,
        cardCondition: condition,
        cardCertNumber: cert
      })
    });
    setIsSaving(false);
    setIsEditing(false);
    window.location.reload();
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
      <div className="bg-gray-800/50 px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h3 className="font-semibold flex items-center gap-2">
          🃏 Trading Card Details
        </h3>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-sm text-blue-400 hover:text-blue-300">
            Edit Details
          </button>
        ) : (
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      <div className="p-6">
        {isEditing && (agency !== item.cardGradingAgency || condition !== item.cardCondition) && (
          <div className="mb-4 flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Changing grading agency or condition will trigger an automatic market value recalculation.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Grading Agency</label>
              {isEditing ? (
                <select 
                  value={agency} 
                  onChange={e => setAgency(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {agencyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <div className="text-white font-medium">{item.cardGradingAgency || 'Raw'}</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Certification Number</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={cert} 
                  onChange={e => setCert(e.target.value)}
                  placeholder="e.g. 84123912"
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="text-white font-medium">{item.cardCertNumber || 'N/A'}</div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Condition Grade</label>
              {isEditing ? (
                <select 
                  value={condition} 
                  onChange={e => setCondition(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {conditionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <div className="text-white font-medium">{item.cardCondition || 'Unknown Condition'}</div>
              )}
            </div>
          </div>

          <div className="bg-black/50 rounded-lg p-5 border border-gray-800 flex flex-col justify-center">
            <div className="text-sm text-gray-400 mb-2">Estimated Market Value</div>
            {item.valueAvg ? (
              <>
                <div className="text-3xl font-bold text-green-400 mb-2">${item.valueAvg}</div>
                <div className="text-xs text-gray-500 flex justify-between">
                  <span>Low: ${item.valueLow}</span>
                  <span>High: ${item.valueHigh}</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 italic">
                {item.syncStatus === 'pending' ? 'Calculating value...' : 'Value not available'}
              </div>
            )}
            
            {(item.name && item.cardCondition) && !isEditing && !item.valueAvg && (
              <button 
                onClick={async () => {
                  setIsFetchingMarket(true);
                  await fetch(`/api/item/${item.id}/fetch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ forceTier: 'card' })
                  });
                  // Wait a few seconds for the background worker to crunch the math, then reload
                  setTimeout(() => window.location.reload(), 8000);
                }}
                disabled={isFetchingMarket}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded border border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingMarket ? 'Calculating... (Wait 8s)' : 'Fetch Live Market Value'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
