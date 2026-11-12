'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Clock, Tag, ChevronLeft, ChevronRight, Maximize2, Minimize2, ArrowLeft, Store, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function PromotionsDisplayPage() {
  const [data, setData] = useState({ activePromotions: [], saleItems: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [inGrace, setInGrace] = useState(false);
  const containerRef = useRef(null);

  // Fetch promotions display data
  const fetchData = async () => {
    try {
      const res = await fetch('/api/promotions/display');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load promotions display data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s for updates
    return () => clearInterval(interval);
  }, []);

  // Live countdown timer clock
  useEffect(() => {
    if (!data.activePromotions || data.activePromotions.length === 0) {
      setTimeLeft('');
      return;
    }

    const timer = setInterval(() => {
      // Find the soonest ending active promotion
      const now = Date.now();
      let soonestEnd = Infinity;
      let soonestPromo = null;

      for (const p of data.activePromotions) {
        const baseEnd = new Date(p.endDate).getTime();
        const graceMs = (parseInt(p.gracePeriodMinutes, 10) || 0) * 60 * 1000;
        const totalEnd = baseEnd + graceMs;
        if (totalEnd > now && totalEnd < soonestEnd) {
          soonestEnd = totalEnd;
          soonestPromo = p;
        }
      }

      if (!soonestPromo || soonestEnd === Infinity) {
        setTimeLeft('Sale Ended');
        setInGrace(false);
        return;
      }

      const diff = soonestEnd - now;
      const baseEnd = new Date(soonestPromo.endDate).getTime();
      const isGraceNow = now > baseEnd && diff > 0;
      setInGrace(isGraceNow);

      const totalSeconds = Math.max(0, Math.floor(diff / 1000));
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`);
      } else {
        setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data.activePromotions]);

  // Auto-play slideshow for sale items
  useEffect(() => {
    if (!isAutoPlay || !data.saleItems || data.saleItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % data.saleItems.length);
    }, 6000); // 6 seconds per slide
    return () => clearInterval(interval);
  }, [isAutoPlay, data.saleItems]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const currentItem = data.saleItems?.[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono tracking-widest text-sm uppercase">Loading Sale Showcase...</p>
      </div>
    );
  }

  if (!data.saleItems || data.saleItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-3xl mb-4">
          <Tag className="w-12 h-12 text-gray-600" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-wide">No Active Sale Items</h1>
        <p className="text-gray-500 text-sm max-w-md mt-2">
          There are currently no active promotions with discounted items configured for this store. Set up a sale in the Sales & Promotions dashboard.
        </p>
        <Link 
          href="/promotions"
          className="mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20"
        >
          Manage Promotions
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#070709] text-white flex flex-col select-none overflow-hidden relative">
      
      {/* Top Floating Controls Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-850/60 bg-black/40 backdrop-blur z-20">
        <div className="flex items-center gap-4">
          <Link 
            href="/promotions"
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-gray-900/80 hover:bg-gray-800 px-3 py-2 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Display</span>
          </Link>
          <div className="flex items-center gap-2 text-amber-400 font-black tracking-widest text-xs uppercase bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>LIVE BOOTH SALE SHOWCASE</span>
          </div>
        </div>

        {/* Live Countdown Clock Badge */}
        {timeLeft && (
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border font-mono font-bold text-sm shadow-xl transition-all ${
            inGrace 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase font-sans tracking-wide text-gray-400">
              {inGrace ? 'Grace Window:' : 'Ends In:'}
            </span>
            <span className="tracking-wider">{timeLeft}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isAutoPlay ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'bg-gray-900 text-gray-400 border-gray-800'
            }`}
          >
            {isAutoPlay ? 'Autoplay: ON' : 'Autoplay: PAUSED'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Showcase Hero Section */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 gap-8 lg:gap-16 max-w-7xl mx-auto w-full">
        
        {/* Left: Product Image Card with Discount Badge */}
        <div className="w-full lg:w-1/2 flex justify-center items-center relative">
          <div className="relative w-full max-w-md aspect-square bg-gray-900/60 border-2 border-gray-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.15)] flex items-center justify-center">
            {currentItem?.imagePath ? (
              <img 
                src={`/api/file/${currentItem.imagePath}`} 
                alt={currentItem.name} 
                className="w-full h-full object-contain p-4 transition-all duration-700"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-700">
                <Tag className="w-24 h-24 stroke-1 mb-2" />
                <span className="text-xs font-mono uppercase tracking-widest text-gray-600">Featured Antique Item</span>
              </div>
            )}

            {/* Giant Savings Badge */}
            <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-gray-950 font-black px-4 py-2 rounded-2xl shadow-xl flex items-center gap-1.5 text-lg uppercase tracking-tight">
              <Sparkles className="w-5 h-5 fill-current" />
              <span>{currentItem?.savingsPercent}% OFF</span>
            </div>

            {/* Category tag */}
            {currentItem?.categoryName && (
              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-gray-300 font-semibold px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
                {currentItem.categoryName}
              </div>
            )}
          </div>
        </div>

        {/* Right: Product Details & Dynamic Price Strike */}
        <div className="w-full lg:w-1/2 space-y-6 text-left">
          
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>{currentItem?.promotionName || 'Special Markdown'}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {currentItem?.name}
            </h1>
            {currentItem?.description && (
              <p className="text-gray-400 text-sm sm:text-base line-clamp-3 leading-relaxed">
                {currentItem.description}
              </p>
            )}
          </div>

          {/* Pricing Highlight Box */}
          <div className="p-6 bg-gray-900/80 border border-gray-800 rounded-3xl space-y-3 shadow-2xl backdrop-blur">
            <div className="flex items-baseline gap-4">
              <span className="text-gray-500 line-through text-2xl sm:text-3xl font-extrabold font-mono">
                ${currentItem?.originalPrice?.toFixed(2)}
              </span>
              <span className="text-emerald-400 text-5xl sm:text-6xl font-black font-mono tracking-tight">
                ${currentItem?.salePrice?.toFixed(2)}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <span>You save ${currentItem?.discountAmount?.toFixed(2)} ({currentItem?.savingsPercent}%)</span>
              <span>•</span>
              <span className="text-gray-400">Discount applied automatically at register</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + data.saleItems.length) % data.saleItems.length)}
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-white transition-all cursor-pointer shadow-lg hover:scale-105"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-sm font-mono text-gray-400 font-bold">
              {currentIndex + 1} of {data.saleItems.length} Featured Items
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % data.saleItems.length)}
              className="p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-white transition-all cursor-pointer shadow-lg hover:scale-105"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

        </div>

      </main>

      {/* Bottom Thumbnail Strip */}
      <footer className="px-6 py-4 border-t border-gray-850/60 bg-black/60 backdrop-blur flex items-center gap-3 overflow-x-auto no-scrollbar z-20">
        {data.saleItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentIndex(idx);
              setIsAutoPlay(false);
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all shrink-0 cursor-pointer text-left ${
              currentIndex === idx
                ? 'bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
                : 'bg-gray-900/50 border-gray-800/80 hover:bg-gray-850'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gray-950 overflow-hidden flex items-center justify-center shrink-0 border border-gray-800">
              {item.imagePath ? (
                <img src={`/api/file/${item.imagePath}`} alt="" className="w-full h-full object-cover" />
              ) : (
                <Tag className="w-4 h-4 text-gray-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white line-clamp-1 max-w-[120px]">{item.name}</p>
              <p className="text-[10px] font-mono text-emerald-400 font-bold">${item.salePrice.toFixed(2)}</p>
            </div>
          </button>
        ))}
      </footer>

    </div>
  );
}

