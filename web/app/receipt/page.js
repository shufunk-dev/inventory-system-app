'use client';

import { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Search, Plus, Minus, Trash2, FileText, Check, ShoppingCart, Info, CreditCard, Loader2, QrCode, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

export default function ReceiptPage() {
  const [catalogItems, setCatalogItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptItems, setReceiptItems] = useState([]);
  const [printMode, setPrintMode] = useState('thermal'); // 'thermal' or 'letter'
  const [taxRate, setTaxRate] = useState(7.0); // 7.0%
  const [receiptNo, setReceiptNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mallName, setMallName] = useState('Antique Mall & Cooperatives');
  const [mallAddress, setMallAddress] = useState('123 Main Street, Suite A');
  const [mallPhone, setMallPhone] = useState('(555) 019-2834');
  const [isLoading, setIsLoading] = useState(true);

  // Custom ad-hoc item states
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customStore, setCustomStore] = useState('unattributed');
  const [stores, setStores] = useState([]);

  // Payment states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('idle'); // 'idle' | 'initializing' | 'waiting' | 'authorizing' | 'completed' | 'failed' | 'canceled'
  const [checkoutError, setCheckoutError] = useState('');
  const [activeTxId, setActiveTxId] = useState('');
  const [activeProvider, setActiveProvider] = useState('');
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [selectedBoothFilter, setSelectedBoothFilter] = useState('all');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrProvider, setQrProvider] = useState('venmo'); // 'venmo' | 'paypal'
  const [qrIsMarkingPaid, setQrIsMarkingPaid] = useState(false);

  const [isTabletMode, setIsTabletMode] = useState(false);
  const [configCollapsed, setConfigCollapsed] = useState(true);
  const [printerConfig, setPrinterConfig] = useState(null);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [printError, setPrintError] = useState('');
  const [printSuccess, setPrintSuccess] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_tablet_mode');
      if (saved === 'true') {
        setIsTabletMode(true);
      }
    }
  }, []);

  const toggleTabletMode = () => {
    const nextVal = !isTabletMode;
    setIsTabletMode(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_tablet_mode', String(nextVal));
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const itemRes = await fetch('/api/receipt-items');
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          setCatalogItems(itemData.items || []);
        }

        const storeRes = await fetch('/api/admin/stores');
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          setStores(storeData.stores || []);
        }

        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setPaymentConfig(settingsData.paymentConfig || null);
          setPrinterConfig(settingsData.printerConfig || null);
        }
      } catch (e) {
        console.error('Error seeding receipt page:', e);
      } finally {
        setIsLoading(false);
      }
    }

    // Set a random receipt number on load
    const randNo = 'R-' + Math.floor(100000 + Math.random() * 900000);
    setReceiptNo(randNo);
    loadData();

    return () => {
      if (window.activePollInterval) {
        clearInterval(window.activePollInterval);
      }
    };
  }, []);

  const startCardCheckout = async () => {
    setCheckoutError('');
    setCheckoutStatus('initializing');
    setCheckoutModalOpen(true);

    try {
      const res = await fetch('/api/pos/checkout/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total, receiptNo, isTraining: isTrainingMode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize terminal');
      }

      setActiveTxId(data.transactionId);
      setActiveProvider(data.provider);
      setCheckoutStatus('waiting');

      pollCheckoutStatus(data.transactionId);
    } catch (e) {
      setCheckoutStatus('failed');
      setCheckoutError(e.message);
    }
  };

  const handleQrPaymentComplete = async () => {
    setQrIsMarkingPaid(true);
    try {
      const res = await fetch('/api/pos/checkout/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: total,
          receiptNo,
          isTraining: isTrainingMode,
          provider: qrProvider
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setQrIsMarkingPaid(false);
      setQrModalOpen(false);
      
      // Auto trigger print receipt
      handlePrint();
    } catch (e) {
      setQrIsMarkingPaid(false);
      alert(`Error saving payment: ${e.message}`);
    }
  };

  const pollCheckoutStatus = async (txId) => {
    if (window.activePollInterval) clearInterval(window.activePollInterval);
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes
    
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        setCheckoutStatus('failed');
        setCheckoutError('Payment timed out. Please try again.');
        return;
      }

      try {
        const res = await fetch(`/api/pos/checkout/status?id=${txId}`);
        const data = await res.json();
        
        if (res.ok) {
          if (data.status === 'completed') {
            clearInterval(interval);
            setCheckoutStatus('completed');
          } else if (data.status === 'canceled') {
            clearInterval(interval);
            setCheckoutStatus('canceled');
          } else if (data.status === 'failed') {
            clearInterval(interval);
            setCheckoutStatus('failed');
            setCheckoutError('Payment was declined or failed on terminal.');
          }
        }
      } catch (e) {
        console.error('Error polling checkout status:', e);
      }
    }, 5000);

    window.activePollInterval = interval;
  };

  const cancelCardCheckout = async () => {
    if (window.activePollInterval) {
      clearInterval(window.activePollInterval);
    }

    if (!activeTxId) {
      setCheckoutModalOpen(false);
      return;
    }

    setCheckoutStatus('initializing');

    try {
      await fetch('/api/pos/checkout/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeTxId })
      });
      setCheckoutStatus('canceled');
      setTimeout(() => {
        setCheckoutModalOpen(false);
      }, 1000);
    } catch (e) {
      console.error('Failed to cancel payment:', e);
      setCheckoutModalOpen(false);
    }
  };

  const handleAddItem = (item) => {
    const existing = receiptItems.find(r => r.itemNum === item.itemNum);
    if (existing) {
      setReceiptItems(receiptItems.map(r => 
        r.itemNum === item.itemNum ? { ...r, qty: r.qty + 1 } : r
      ));
    } else {
      setReceiptItems([...receiptItems, { ...item, qty: 1 }]);
    }
  };

  const handleRemoveItem = (itemNum) => {
    const existing = receiptItems.find(r => r.itemNum === itemNum);
    if (existing && existing.qty > 1) {
      setReceiptItems(receiptItems.map(r => 
        r.itemNum === itemNum ? { ...r, qty: r.qty - 1 } : r
      ));
    } else {
      setReceiptItems(receiptItems.filter(r => r.itemNum !== itemNum));
    }
  };

  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customName.trim() || !customPrice) return;
    
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum)) return;

    const matchedStore = customStore === 'default' 
      ? 'Default Catalog' 
      : customStore === 'unattributed'
        ? 'Direct Mall Sale'
        : stores.find(s => s.id === customStore)?.name || 'Direct Mall Sale';

    const customObj = {
      itemNum: 'custom-' + Date.now(),
      name: customName.trim(),
      price: priceNum,
      storeId: customStore,
      storeName: matchedStore,
      catalogName: customName.trim(),
      qty: 1
    };

    setReceiptItems([...receiptItems, customObj]);
    setCustomName('');
    setCustomPrice('');
  };

  const filteredItems = catalogItems.filter(item => {
    if (selectedBoothFilter !== 'all' && item.storeId !== selectedBoothFilter) {
      return false;
    }
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return item.name.toLowerCase().includes(query) || 
           String(item.itemNum).toLowerCase().includes(query) ||
           item.storeName.toLowerCase().includes(query);
  });

  const subtotal = receiptItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handlePrint = async () => {
    setPrintError('');
    setPrintSuccess('');

    const receiptPayload = {
      mallName,
      mallAddress,
      mallPhone,
      receiptNo,
      customerName,
      receiptItems,
      subtotal,
      taxRate,
      taxAmount,
      total
    };

    if (printerConfig && printerConfig.connectionType !== 'browser') {
      setIsPrintingDirect(true);
      try {
        const res = await fetch('/api/pos/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiptPayload)
        });
        const data = await res.json();
        if (res.ok) {
          setPrintSuccess(data.message || 'Printed successfully.');
        } else {
          setPrintError(data.error || 'Failed to print receipt.');
        }
      } catch (err) {
        setPrintError('Network error occurred attempting to print.');
      } finally {
        setIsPrintingDirect(false);
      }
    } else {
      window.print();
    }
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  const getQrValue = () => {
    if (!paymentConfig) return '';
    if (qrProvider === 'venmo') {
      const handle = paymentConfig.venmoHandle || '';
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(cleanHandle)}&amount=${total.toFixed(2)}&note=${encodeURIComponent(`Receipt ${receiptNo} at ${mallName}`)}`;
    } else {
      const email = paymentConfig.paypalEmail || '';
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(email)}&amount=${total.toFixed(2)}&currency_code=USD&item_name=${encodeURIComponent(`Receipt ${receiptNo} at ${mallName}`)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* CSS overrides for print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, .no-print {
            display: none !important;
          }
          .print-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print-thermal-font {
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 13px !important;
            line-height: 1.3 !important;
            width: 80mm !important;
            max-width: 80mm !important;
          }
          .print-letter-font {
            font-family: ui-sans-serif, system-ui, sans-serif !important;
            font-size: 14px !important;
          }
        }
      `}} />

      {/* Main Header / Editor panel (Hidden on Print) */}
      <header className="bg-gray-900 border-b border-gray-800 no-print py-4 px-6 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-400" />
              Receipt printing Hub
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Training Mode Toggle Switch */}
            <div className="flex items-center gap-2.5 bg-gray-850/50 border border-gray-850 px-3.5 py-2 rounded-xl">
              <span className="text-xs font-bold text-gray-400">Training Mode</span>
              <button
                type="button"
                onClick={() => setIsTrainingMode(!isTrainingMode)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isTrainingMode ? 'bg-amber-600' : 'bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isTrainingMode ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            {/* Tablet Mode Toggle Switch */}
            <div className="flex items-center gap-2.5 bg-gray-850/50 border border-gray-850 px-3.5 py-2 rounded-xl">
              <span className="text-xs font-bold text-gray-400">Tablet Layout</span>
              <button
                type="button"
                onClick={toggleTabletMode}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isTabletMode ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isTabletMode ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <button 
              onClick={startCardCheckout}
              disabled={receiptItems.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all text-sm cursor-pointer"
            >
              <CreditCard className="w-4 h-4" /> Pay via Card Reader
            </button>

            <button 
              onClick={() => setQrModalOpen(true)}
              disabled={receiptItems.length === 0}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-450 hover:to-orange-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all text-sm cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Pay via QR Code
            </button>

            <button 
              onClick={handlePrint}
              disabled={receiptItems.length === 0}
              className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 border border-gray-700 disabled:opacity-50 transition-all text-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
          </div>
        </div>
      </header>

      {isTrainingMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 no-print">
          <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 text-amber-400 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider">
              Training Mode Active — Terminal payments are simulated locally and records are isolated from active sales.
            </p>
          </div>
        </div>
      )}

      {/* Main Work Area (Split Panel) */}
      <div className={`mx-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 ${isTabletMode ? 'max-w-[100%] px-4' : 'max-w-7xl px-4 sm:px-6 lg:px-8'}`}>
        
        {/* Left Panel: Receipt Builder & Custom Selections (Hidden on Print) */}
        <div className={`lg:col-span-7 no-print ${isTabletMode ? 'space-y-4' : 'space-y-6'}`}>
          
          {/* Section 1: Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-white text-md flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                Receipt Configuration
              </h2>
              <button
                type="button"
                onClick={() => setConfigCollapsed(!configCollapsed)}
                className="text-xs text-blue-400 font-bold hover:underline cursor-pointer flex items-center gap-1.5 bg-gray-850 px-3 py-1.5 rounded-xl border border-gray-800/80 transition-colors hover:bg-gray-800"
              >
                {configCollapsed ? 'Expand Details' : 'Collapse Details'}
              </button>
            </div>

            {!configCollapsed && (
              <div className="space-y-4 pt-4 border-t border-gray-800/60 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Receipt Number</label>
                    <input 
                      type="text" 
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Customer Name (Opt)</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Cash Customer"
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Tax Rate (%)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Mall Name</label>
                    <input 
                      type="text" 
                      value={mallName}
                      onChange={(e) => setMallName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Address</label>
                    <input 
                      type="text" 
                      value={mallAddress}
                      onChange={(e) => setMallAddress(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Phone</label>
                    <input 
                      type="text" 
                      value={mallPhone}
                      onChange={(e) => setMallPhone(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Receipt Style Mode</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPrintMode('thermal')}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${printMode === 'thermal' ? 'border-blue-500 bg-blue-900/10 text-white' : 'border-gray-800 hover:border-gray-700 text-gray-400 bg-gray-900'}`}
                    >
                      <ShoppingCart className="w-4 h-4 text-blue-400" /> Thermal Paper Roll (80mm)
                    </button>
                    <button
                      onClick={() => setPrintMode('letter')}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${printMode === 'letter' ? 'border-purple-500 bg-purple-900/10 text-white' : 'border-gray-800 hover:border-gray-700 text-gray-400 bg-gray-900'}`}
                    >
                      <FileText className="w-4 h-4 text-purple-400" /> Standard Letter Invoice (A4)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Selected Items (Receipt Basket - Hidden on Tablet Mode) */}
          {!isTabletMode && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-bold text-white text-md mb-4 flex items-center gap-2">
                Receipt Items ({receiptItems.length})
              </h3>

              {receiptItems.length === 0 ? (
                <div className="border border-dashed border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
                  No items added to the receipt yet. Search POS catalog below or add a custom item.
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {receiptItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-950/50 border border-gray-800 px-4 py-3 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-blue-500/80 rounded-full"></span>
                          {item.storeName}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono text-gray-400">${item.price.toFixed(2)}</span>
                        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg p-1">
                          <button 
                            onClick={() => handleRemoveItem(item.itemNum)}
                            className="p-1 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-bold w-6 text-center">{item.qty}</span>
                          <button 
                            onClick={() => handleAddItem(item)}
                            className="p-1 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => setReceiptItems(receiptItems.filter(r => r.itemNum !== item.itemNum))}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Add Custom Item Form */}
          <form onSubmit={handleAddCustomItem} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm">Add Custom Line Item</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <input 
                  type="text" 
                  required
                  placeholder="Item description..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="Price ($)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={customStore}
                  onChange={(e) => setCustomStore(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 appearance-none"
                >
                  <option value="unattributed">Direct Mall Sale</option>
                  <option value="default">Default Catalog</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!customName.trim() || !customPrice}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>

          {/* Section 4: Search POS Catalog */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-white text-sm">POS Scanned Catalog</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={selectedBoothFilter}
                    onChange={(e) => setSelectedBoothFilter(e.target.value)}
                    className="w-full bg-gray-850 border border-gray-800 text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer font-bold text-blue-400"
                  >
                    <option value="all">All Booths / Catalogs</option>
                    <option value="default">Default Catalog</option>
                    <option value="unattributed">Direct Mall Sales</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
                <div className="relative flex-1 sm:flex-initial w-full sm:w-64">
                  <input 
                    type="text" 
                    placeholder="Search by name/UPC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-850 border border-gray-800 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            {isLoading ? (
              <p className="text-xs text-gray-500 py-4 text-center">Loading registry items...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No matching register items found.</p>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 ${isTabletMode ? 'max-h-[550px]' : 'max-h-[300px]'}`}>
                {filteredItems.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleAddItem(item)}
                    className={`flex justify-between items-center bg-gray-950/20 border p-3 rounded-xl hover:border-gray-700 cursor-pointer transition-all hover:bg-gray-800/10 active:scale-[0.98] active:bg-blue-600/5 group ${isTabletMode ? 'border-gray-800/60 py-4 shadow-sm' : 'border-gray-850'}`}
                  >
                    <div>
                      <p className={`font-semibold text-white group-hover:text-blue-400 transition-colors ${isTabletMode ? 'text-sm' : 'text-xs'}`}>{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.itemNum}</p>
                      <p className="text-[10px] text-blue-400/80 font-bold mt-0.5">{item.storeName}</p>
                    </div>
                    <span className={`font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md ${isTabletMode ? 'text-sm' : 'text-xs'}`}>
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Live Receipt Preview Container / Tablet Touch Cart */}
        <div className="lg:col-span-5 flex flex-col items-center">
          {isTabletMode ? (
            /* Tablet Touch Cart Workspace */
            <div className="w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col no-print" style={{ minHeight: '620px' }}>
              <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-white text-md">Active POS Cart</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptItems([])}
                  disabled={receiptItems.length === 0}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 font-semibold flex items-center gap-1 cursor-pointer bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-900/30 transition-all active:scale-95 animate-fade-in"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              </div>

              {/* Scrollable Cart Items List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px] max-h-[300px]">
                {receiptItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-12">
                    <ShoppingCart className="w-10 h-10 text-gray-800 mb-3 animate-pulse" />
                    <p className="text-sm">POS Cart is empty</p>
                    <p className="text-xs text-gray-600 mt-1">Tap items on the left to add them</p>
                  </div>
                ) : (
                  receiptItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-950/40 border border-gray-850 px-4 py-3 rounded-2xl">
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.itemNum}</p>
                        <p className="text-[10px] text-blue-400 font-semibold mt-0.5">{item.storeName}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-extrabold text-white">${(item.price * item.qty).toFixed(2)}</span>
                        <div className="flex items-center gap-1.5 bg-gray-850 border border-gray-800 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.itemNum)}
                            className="p-1.5 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-mono font-bold w-6 text-center text-white">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="p-1.5 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Summary Billing Breakdown */}
              <div className="border-t border-gray-800 pt-4 mt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Sales Tax ({taxRate.toFixed(1)}%)</span>
                  <span className="font-mono text-white">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-lg text-white border-t border-gray-800 pt-3">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-400 text-xl font-black">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Bold Touch Payment Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  onClick={startCardCheckout}
                  disabled={receiptItems.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 text-xs transition-colors cursor-pointer active:scale-95"
                >
                  <CreditCard className="w-4 h-4" /> Pay via Card
                </button>

                <button
                  type="button"
                  onClick={() => setQrModalOpen(true)}
                  disabled={receiptItems.length === 0}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/15 text-xs transition-colors cursor-pointer active:scale-95"
                >
                  <QrCode className="w-4 h-4" /> Pay via QR
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={receiptItems.length === 0}
                  className="col-span-1 sm:col-span-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4 text-blue-400" /> Print Customer Receipt
                </button>
              </div>
              {isPrintingDirect && (
                <p className="text-xs text-blue-400 mt-2 text-center animate-pulse">Printing receipt direct to thermal device...</p>
              )}
              {printSuccess && (
                <p className="text-xs text-green-400 mt-2 text-center">{printSuccess}</p>
              )}
              {printError && (
                <p className="text-xs text-red-400 mt-2 text-center select-text">{printError}</p>
              )}
            </div>
          ) : (
            /* Classic Desktop View (Live Print Preview) */
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 no-print flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" /> Live Print Preview
              </p>
              {isPrintingDirect && (
                <p className="text-xs text-blue-400 mb-2 text-center animate-pulse font-bold">Printing receipt direct to thermal device...</p>
              )}
              {printSuccess && (
                <p className="text-xs text-green-400 mb-2 text-center font-bold">{printSuccess}</p>
              )}
              {printError && (
                <p className="text-xs text-red-400 mb-2 text-center select-text font-bold">{printError}</p>
              )}

              {/* Thermal Paper Roll style preview */}
              {printMode === 'thermal' ? (
                <div className="print-container print-thermal-font w-full max-w-[320px] bg-white border border-gray-200 text-gray-850 p-5 shadow-2xl rounded-none text-left select-none relative overflow-hidden" style={{ minHeight: '520px' }}>
                  
                  {/* Paper Top Jagged Edge decoration (screen only) */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 via-white to-gray-200 no-print"></div>

                  {/* Mall Header */}
                  <div className="text-center font-mono space-y-1">
                    <h4 className="font-extrabold text-sm uppercase tracking-wide">{mallName}</h4>
                    <p className="text-[11px] text-gray-600">{mallAddress}</p>
                    <p className="text-[11px] text-gray-600">{mallPhone}</p>
                  </div>

                  {/* Divider */}
                  <p className="font-mono text-center my-3 text-gray-600">--------------------------------</p>

                  {/* Metadata */}
                  <div className="font-mono text-[11px] space-y-1 text-gray-700">
                    <p>RECEIPT: {receiptNo}</p>
                    <p>DATE   : {currentDateStr}</p>
                    {customerName && <p>CLIENT : {customerName.toUpperCase()}</p>}
                  </div>

                  <p className="font-mono text-center my-3 text-gray-600">--------------------------------</p>

                  {/* Line Items */}
                  <div className="font-mono text-xs space-y-3">
                    {receiptItems.map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between font-bold">
                          <span>{item.qty}x {item.name.slice(0, 18)}</span>
                          <span>${(item.price * item.qty).toFixed(2)}</span>
                        </div>
                        {/* Booth attribution */}
                        <div className="flex justify-between text-[10px] text-gray-600 italic pl-3">
                          <span>&gt; BOOTH: {item.storeName}</span>
                          <span>(${item.price.toFixed(2)} ea)</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="font-mono text-center my-3 text-gray-600">--------------------------------</p>

                  {/* Totals */}
                  <div className="font-mono text-xs space-y-1 text-right">
                    <div className="flex justify-between">
                      <span>SUBTOTAL:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TAX ({taxRate.toFixed(1)}%):</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-600 pt-1.5">
                      <span>TOTAL:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="font-mono text-center my-4 text-gray-600">--------------------------------</p>

                  {/* Footer */}
                  <div className="text-center font-mono text-[11px] text-gray-600 space-y-1 pb-4">
                    <p>THANK YOU FOR SHOPPING!</p>
                    <p>ALL SALES FINAL ON ANTIQUES</p>
                    <p className="text-[9px] mt-2">SYS v1.5.1</p>
                  </div>

                </div>
              ) : (
                /* Standard Letter Invoice Preview */
                <div className="print-container print-letter-font w-full max-w-[650px] bg-white border border-gray-200 text-gray-800 p-8 shadow-2xl rounded-none text-left select-none" style={{ minHeight: '800px' }}>
                  
                  {/* Logo / Header */}
                  <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
                    <div>
                      <h2 className="text-xl font-extrabold uppercase text-gray-900 tracking-wider">{mallName}</h2>
                      <p className="text-xs text-gray-500 mt-1">{mallAddress}</p>
                      <p className="text-xs text-gray-500">{mallPhone}</p>
                    </div>
                    <div className="text-right">
                      <h3 className="text-2xl font-bold text-gray-400 uppercase tracking-widest">Receipt</h3>
                      <p className="text-xs text-gray-600 mt-1 font-mono">Invoice #: {receiptNo}</p>
                      <p className="text-xs text-gray-600 font-mono">Date: {currentDateStr}</p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Customer / Transaction Details</h4>
                    <p className="text-sm font-semibold text-gray-800">{customerName || 'Walk-in Cash Customer'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Paid In Full - Receipt of Payment</p>
                  </div>

                  {/* Table */}
                  <table className="w-full text-left text-xs mb-8 border-collapse">
                    <thead>
                      <tr className="border-b border-gray-300 text-gray-700 font-bold uppercase tracking-wider bg-gray-50">
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Booth / Merchant</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-700">
                      {receiptItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-gray-900">{item.name}</p>
                          </td>
                          <td className="py-3 px-3 text-blue-600 font-medium">{item.storeName}</td>
                          <td className="py-3 px-3 text-right font-mono">${item.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-right font-mono">{item.qty}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">${(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Subtotals & Taxes */}
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <div className="w-64 space-y-2 text-xs text-right">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Sales Tax ({taxRate.toFixed(1)}%):</span>
                        <span className="font-mono">${taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total Amount Paid:</span>
                        <span className="font-mono">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms / Thank you */}
                  <div className="mt-16 text-center border-t border-gray-100 pt-6 text-[10px] text-gray-500 space-y-1">
                    <p className="font-semibold">Thank you for your business!</p>
                    <p>Return policy: Exchanges only within 7 days with original tag attached.</p>
                    <p>Mall operator payout records updated. Scans compiled on server.</p>
                  </div>

                </div>
              )}
            </>
          )}
        </div>

      </div>

      {checkoutModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in no-print">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden text-center">
            {/* Background design glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <h3 className="text-xl font-bold text-white mb-2">
              {activeProvider === 'simulated' ? 'Simulated Payment' : 'Terminal Payment'}
            </h3>
            {activeProvider === 'simulated' && (
              <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold mb-3">
                Training Mode
              </span>
            )}
            <p className="text-sm text-gray-400 mb-6">Order total: <span className="text-emerald-400 font-bold">${total.toFixed(2)}</span></p>

            <div className="py-6 flex flex-col items-center justify-center min-h-[160px]">
              {checkoutStatus === 'initializing' && (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  <p className="text-sm text-gray-300">Communicating with terminal...</p>
                </div>
              )}

              {checkoutStatus === 'waiting' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 mx-auto animate-pulse">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-white">Waiting for Card Input...</p>
                  <p className="text-xs text-gray-400">Please swipe, insert or tap card on your {activeProvider === 'stripe' ? 'Stripe' : 'Square'} Terminal.</p>
                </div>
              )}

              {checkoutStatus === 'completed' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center justify-center text-green-400 mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-green-450">Payment Approved!</p>
                  <p className="text-xs text-gray-400">Transaction completed successfully.</p>
                  <button
                    onClick={() => {
                      setCheckoutModalOpen(false);
                      handlePrint(); // Auto-open print layout
                    }}
                    className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Print Receipt
                  </button>
                </div>
              )}

              {checkoutStatus === 'failed' && (
                <div className="space-y-4 w-full">
                  <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-400 mx-auto">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-red-400">Transaction Failed</p>
                  {checkoutError && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg select-text">{checkoutError}</p>}
                  <button
                    onClick={startCardCheckout}
                    className="mt-4 bg-gray-850 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-xl text-xs border border-gray-750 transition-colors cursor-pointer"
                  >
                    Retry Checkout
                  </button>
                </div>
              )}

              {checkoutStatus === 'canceled' && (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-800 border border-gray-750 rounded-2xl flex items-center justify-center text-gray-450 mx-auto">
                    <CreditCard className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm font-semibold text-gray-300">Transaction Canceled</p>
                </div>
              )}
            </div>

            {checkoutStatus !== 'completed' && (
              <button
                onClick={cancelCardCheckout}
                className="mt-6 text-gray-400 hover:text-white text-xs font-bold transition-colors hover:underline cursor-pointer"
              >
                Cancel Checkout
              </button>
            )}
          </div>
        </div>
      )}

      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in no-print">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden text-center">
            {/* Background design glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl"></div>

            <h3 className="text-xl font-bold text-white mb-2">Mobile Scan to Pay</h3>
            {isTrainingMode && (
              <span className="inline-block bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold mb-3">
                Training Mode (Simulated)
              </span>
            )}
            <p className="text-sm text-gray-400 mb-6">Order total: <span className="text-emerald-400 font-bold">${total.toFixed(2)}</span></p>

             {/* Provider Tabs */}
            <div className="flex gap-2 p-1 bg-gray-950 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setQrProvider('venmo')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${qrProvider === 'venmo' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Venmo
              </button>
              <button
                type="button"
                onClick={() => setQrProvider('paypal')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${qrProvider === 'paypal' ? 'bg-blue-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                PayPal
              </button>
            </div>

            <div className="py-4 flex flex-col items-center justify-center min-h-[220px]">
              {(() => {
                const handle = paymentConfig?.venmoHandle;
                const email = paymentConfig?.paypalEmail;
                const isConfigured = qrProvider === 'venmo' ? !!handle : !!email;

                if (!paymentConfig || !isConfigured) {
                  return (
                    <div className="space-y-4 text-center max-w-xs">
                      <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 mx-auto animate-pulse">
                        <Info className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">Not Configured</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Please enter your {qrProvider === 'venmo' ? 'Venmo Handle' : 'PayPal Email'} inside settings to generate checkout QR codes.
                      </p>
                    </div>
                  );
                }

                const qrValue = getQrValue();

                return (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-xl border border-gray-800">
                      <QRCodeSVG value={qrValue} size={160} />
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed max-w-xs mt-2">
                      Scan with mobile camera or app to pay <span className="text-blue-400 font-bold font-mono">{qrProvider === 'venmo' ? handle : email}</span> exactly <span className="text-emerald-400 font-bold">${total.toFixed(2)}</span>.
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={handleQrPaymentComplete}
                disabled={qrIsMarkingPaid || (qrProvider === 'venmo' ? !paymentConfig?.venmoHandle : !paymentConfig?.paypalEmail)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-green-600/15"
              >
                {qrIsMarkingPaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Mark as Paid & Print
              </button>
              
              <button
                onClick={() => setQrModalOpen(false)}
                className="text-gray-400 hover:text-white text-xs font-bold transition-colors hover:underline cursor-pointer"
              >
                Cancel Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
