'use client';

import { useState } from 'react';
import { Printer, X, Tag, Calendar, Sparkles, Layers, Scissors } from 'lucide-react';

export default function PrintableSaleSignModal({ promotion, storeName, boothNumber, isOpen, onClose }) {
  const [format, setFormat] = useState('poster'); // 'poster' (8.5x11) or 'shelftalkers' (4 per page)
  const [customNote, setCustomNote] = useState('');

  if (!isOpen || !promotion) return null;

  const handlePrint = () => {
    window.print();
  };

  const discountDisplay = promotion.discountType === 'percentage'
    ? `${promotion.discountValue}% OFF`
    : `$${parseFloat(promotion.discountValue).toFixed(2)} OFF`;

  const startDateFormatted = new Date(promotion.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  const endDateFormatted = new Date(promotion.endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const getScopeDescription = () => {
    if (promotion.targetType === 'booth' || promotion.targetType === 'all') {
      return 'ENTIRE BOOTH INVENTORY';
    }
    if (promotion.targetType === 'category') {
      return 'FEATURED CATEGORIES';
    }
    if (promotion.targetType === 'tag') {
      return 'ALL TAGGED ITEMS';
    }
    return 'SELECTED SPECIAL ITEMS';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden no-print">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Print Physical Sale Signage</h2>
              <p className="text-xs text-gray-400">Generate print-ready posters and shelf-talkers for your antique booth</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector and Controls */}
        <div className="px-6 py-4 bg-gray-950/40 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormat('poster')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                format === 'poster' 
                  ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
              }`}
            >
              <Layers className="w-4 h-4" />
              Booth Poster (8.5&quot; x 11&quot;)
            </button>
            <button
              onClick={() => setFormat('shelftalkers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                format === 'shelftalkers' 
                  ? 'bg-amber-500 text-gray-950 shadow-lg shadow-amber-500/20' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-750'
              }`}
            >
              <Scissors className="w-4 h-4" />
              Shelf-Talkers (4 per page)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Optional tagline (e.g. Red Tag Only)..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="bg-gray-900 border border-gray-800 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 w-64"
            />
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Now
            </button>
          </div>
        </div>

        {/* Signage Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-950 flex justify-center items-start">
          <div className="w-full max-w-[620px] bg-white text-gray-900 shadow-2xl rounded-lg p-8 border-4 border-gray-900 font-sans transition-all">
            
            {format === 'poster' ? (
              /* Full Page Poster (8.5 x 11) */
              <div className="text-center space-y-6 py-4">
                {/* Header banner */}
                <div className="border-b-4 border-gray-900 pb-4">
                  <div className="inline-block bg-gray-900 text-white text-xs uppercase tracking-widest font-black px-4 py-1 rounded-full mb-2">
                    {storeName || 'ANTIQUE MALL'} {boothNumber ? `• BOOTH #${boothNumber}` : ''}
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-gray-900">
                    LIMITED TIME SALE
                  </h1>
                </div>

                {/* Giant Discount callout */}
                <div className="my-6 py-6 bg-amber-50 border-4 border-dashed border-amber-500 rounded-3xl">
                  <div className="text-6xl sm:text-7xl font-black text-amber-600 tracking-tighter">
                    {discountDisplay}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-gray-800 uppercase tracking-wide mt-2">
                    {getScopeDescription()}
                  </div>
                  {customNote && (
                    <div className="text-sm font-bold text-amber-700 italic mt-1">
                      &ldquo;{customNote}&rdquo;
                    </div>
                  )}
                </div>

                {/* Promotion Name & Dates */}
                <div className="space-y-2 border-t-2 border-b-2 border-gray-200 py-4">
                  <h3 className="text-2xl font-black text-gray-900 uppercase">
                    {promotion.name}
                  </h3>
                  <div className="flex justify-center items-center gap-2 text-sm font-bold text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span>Valid {startDateFormatted} through {endDateFormatted}</span>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Discount applied automatically at checkout register • All antique sales final
                </div>
              </div>
            ) : (
              /* 4 Shelf-Talkers Layout */
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="border-2 border-dashed border-gray-400 p-4 rounded-xl text-center bg-amber-50/50 flex flex-col justify-between h-56">
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-600">
                        {boothNumber ? `BOOTH #${boothNumber}` : (storeName || 'SPECIAL SALE')}
                      </div>
                      <div className="text-3xl font-black text-amber-600 mt-1">
                        {discountDisplay}
                      </div>
                      <div className="text-xs font-extrabold text-gray-800 uppercase mt-0.5 line-clamp-1">
                        {getScopeDescription()}
                      </div>
                      {customNote && (
                        <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                          {customNote}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-300 pt-2 text-[10px] text-gray-600 font-medium">
                      <div>Ends {endDateFormatted}</div>
                      <div className="text-[8px] text-gray-400 mt-0.5">✂ Cut along dashed line</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Hidden print container with print-specific layout */}
      <div id="printable-sale-sign" className="hidden print:block fixed inset-0 bg-white text-black p-8">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-sale-sign, #printable-sale-sign * {
              visibility: visible;
            }
            #printable-sale-sign {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              height: 100%;
              padding: 2cm;
              background: white;
            }
          }
        `}} />

        {format === 'poster' ? (
          <div className="text-center space-y-8 border-4 border-black p-10 h-full flex flex-col justify-between">
            <div className="border-b-4 border-black pb-6">
              <p className="text-lg uppercase tracking-widest font-black mb-2">
                {storeName || 'ANTIQUE STORE'} {boothNumber ? `• BOOTH #${boothNumber}` : ''}
              </p>
              <h1 className="text-6xl font-black uppercase tracking-tight">
                SPECIAL SALE
              </h1>
            </div>

            <div className="my-8 py-10 border-4 border-dashed border-black">
              <div className="text-8xl font-black tracking-tight">
                {discountDisplay}
              </div>
              <div className="text-3xl font-black uppercase mt-4">
                {getScopeDescription()}
              </div>
              {customNote && (
                <div className="text-xl font-bold mt-2">
                  &ldquo;{customNote}&rdquo;
                </div>
              )}
            </div>

            <div className="border-t-2 border-b-2 border-black py-6">
              <h2 className="text-3xl font-black uppercase">{promotion.name}</h2>
              <p className="text-lg font-bold mt-2">
                Sale Period: {startDateFormatted} to {endDateFormatted}
              </p>
            </div>

            <p className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Discount applied automatically at register checkout
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 h-full p-4">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="border-2 border-dashed border-black p-6 text-center flex flex-col justify-between rounded-lg">
                <div>
                  <p className="text-xs uppercase font-black">
                    {boothNumber ? `BOOTH #${boothNumber}` : (storeName || 'SPECIAL SALE')}
                  </p>
                  <h2 className="text-5xl font-black my-3">{discountDisplay}</h2>
                  <p className="text-sm font-extrabold uppercase">{getScopeDescription()}</p>
                  {customNote && <p className="text-xs font-bold mt-1">&ldquo;{customNote}&rdquo;</p>}
                </div>
                <div className="border-t border-black pt-3 text-xs font-bold">
                  <div>Valid {startDateFormatted} - {endDateFormatted}</div>
                  <div className="text-[10px] text-gray-600 mt-1">✂ Cut along dashed line</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

