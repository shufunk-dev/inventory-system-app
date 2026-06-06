'use client';

import { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Search, Plus, Minus, Trash2, FileText, Check, ShoppingCart, Info } from 'lucide-react';
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
  }, []);

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

  const filteredItems = catalogItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    String(item.itemNum).includes(searchQuery) ||
    item.storeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = receiptItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

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
            <button 
              onClick={handlePrint}
              disabled={receiptItems.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all text-sm"
            >
              <Printer className="w-4 h-4" /> Print Customer Receipt
            </button>
          </div>
        </div>
      </header>

      {/* Main Work Area (Split Panel) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel: Receipt Builder & Custom Selections (Hidden on Print) */}
        <div className="lg:col-span-7 space-y-6 no-print">
          
          {/* Section 1: Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-white text-md flex items-center gap-2">
              Receipt Configuration
            </h2>
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

          {/* Section 2: Selected Items (Receipt Basket) */}
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
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">POS Scanned Catalog</h3>
              <div className="relative w-64">
                <input 
                  type="text" 
                  placeholder="Search catalog by name/UPC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-850 border border-gray-800 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              </div>
            </div>

            {isLoading ? (
              <p className="text-xs text-gray-500 py-4 text-center">Loading registry items...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No matching register items found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredItems.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => handleAddItem(item)}
                    className="flex justify-between items-center bg-gray-950/20 border border-gray-850 p-3 rounded-xl hover:border-gray-700 cursor-pointer transition-all hover:bg-gray-800/10 group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors">{item.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{item.itemNum}</p>
                      <p className="text-[10px] text-blue-400/80 font-bold mt-0.5">{item.storeName}</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Panel: Live Receipt Preview Container */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 no-print flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" /> Live Print Preview
          </p>

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
        </div>

      </div>
    </div>
  );
}
