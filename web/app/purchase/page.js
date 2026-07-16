'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  Printer, 
  Coins, 
  Database,
  Info
} from 'lucide-react';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'test';

export default function PurchasePage() {
  const [selectedPlan, setSelectedPlan] = useState(null); // 'collector', 'store'
  const [activeTab, setActiveTab] = useState('mobile'); // 'mobile', 'web', 'auditor'
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [checkoutState, setCheckoutState] = useState('plans'); // 'plans', 'checkout', 'success'
  const [successData, setSuccessData] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  const paypalRef = useRef(null);

  // Tabs for Mockup showcase
  const mockups = {
    mobile: {
      title: 'Handheld Mobile Scanner App',
      description: 'Run the mobile app directly on your handheld scanner or phone. Features double-vibration scanner guides, high-speed camera barcode scanning, and multi-photo capture modes.',
      image: '/images/mobile_scanner_mockup.png',
      features: [
        'Optimized for handheld inventory scan terminals',
        'Coin Mode: capture double-sided photos (obverse & reverse)',
        'Card & Toy Scanner: automatic photo cropping',
        'Highly compressed ZIP exports to minimize file sizes'
      ]
    },
    web: {
      title: 'Desktop Catalog Dashboard',
      description: 'Upload ZIP archives from your scanner directly to your database. Access detailed search and filtration, aggregate valuation, and local-first database tools.',
      image: '/images/web_catalog_mockup.png',
      features: [
        'Local-First SQL database: fast, private, and always available',
        'Auto-valuation aggregation across catalog',
        'CSV/Excel inventory export and backup',
        'Comprehensive categorization and subcategory trees'
      ]
    },
    auditor: {
      title: 'Receipts & Variance Auditor',
      description: 'Unlock enterprise-grade retail POS features. Setup hardware thermal printers, trace receipt records, and audit inventory variance discrepancies easily.',
      image: '/images/auditor_pos_mockup.png',
      features: [
        'Hardware ESC/POS receipt printer setup panel',
        'Detailed receipt scanning and cashier history',
        'Auditor console: trace actual vs recorded inventory counts',
        'Audit deviation reports & cost-variance breakdown'
      ]
    }
  };

  // Load PayPal SDK when selectedPlan changes or checkout starts
  useEffect(() => {
    if (checkoutState !== 'checkout' || !selectedPlan) return;

    // Reset payment errors and button render status
    setPaymentError(null);
    setIsRendered(false);

    // If script is already in the document, delete it so we can reload with correct script params or re-run initialization
    const existingScript = document.getElementById('paypal-sdk-script');
    if (existingScript) {
      existingScript.remove();
    }

    // Load PayPal script
    const script = document.createElement('script');
    script.id = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.async = true;

    script.onload = () => {
      setSdkLoaded(true);
    };

    script.onerror = () => {
      console.error('PayPal SDK load failed');
      setPaymentError('Failed to load PayPal Payment SDK. Please check your internet connection and refresh.');
    };

    document.body.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('paypal-sdk-script');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [checkoutState, selectedPlan]);

  // Render PayPal buttons once SDK is loaded and container is available
  useEffect(() => {
    if (!sdkLoaded || !paypalRef.current || isRendered || checkoutState !== 'checkout') return;

    if (window.paypal) {
      // Clear container just in case
      paypalRef.current.innerHTML = '';
      
      const price = selectedPlan === 'collector' ? '29.00' : '99.00';
      const planName = selectedPlan === 'collector' ? 'Collector License' : 'Retail Store POS License';

      window.paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              description: `Inventory & POS System - ${planName} (Licensed to: ${ownerName})`,
              amount: {
                value: price,
                currency_code: 'USD'
              }
            }]
          });
        },
        onApprove: async (data, actions) => {
          return actions.order.capture().then((details) => {
            setSuccessData({
              transactionId: details.id,
              payerEmail: details.payer.email_address,
              amount: price,
              licenseName: ownerName,
              licenseEmail: email,
              plan: selectedPlan === 'collector' ? 'Collector License (Offline)' : 'Retail Store POS License (Offline)'
            });
            setCheckoutState('success');
          });
        },
        onError: (err) => {
          console.error('PayPal button error:', err);
          setPaymentError('Payment could not be completed. Please check your credentials or try another method.');
        },
        style: {
          layout: 'vertical',
          color: 'blue',
          shape: 'pill',
          label: 'pay'
        }
      }).render(paypalRef.current);
      
      setIsRendered(true);
    }
  }, [sdkLoaded, isRendered, selectedPlan, checkoutState, ownerName, email]);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setCheckoutState('checkout');
    setOwnerName('');
    setEmail('');
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!email) {
      errors.email = 'Email address is required to deliver your license key.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!ownerName) {
      errors.ownerName = 'License Name is required to sign the license key.';
    } else if (ownerName.length < 3) {
      errors.ownerName = 'License Name must be at least 3 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Form is valid, the PayPal buttons container is already loaded and will show below the form
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30 font-sans pb-24">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-blue-600/10 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
        
        {/* ========================================================
            PLANS STATE (MAIN LANDING PAGE)
           ======================================================== */}
        {checkoutState === 'plans' && (
          <>
            {/* Hero Section */}
            <div className="text-center max-w-4xl mx-auto mb-20">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6 shadow-sm shadow-blue-500/5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Now Available for Offline Setup</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-8">
                The Ultimate Local-First <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">
                  Inventory & POS System
                </span>
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-3xl mx-auto">
                Scan, inventory, and audit physical goods, coins, trading cards, or store items. A fully offline database built for privacy, safety, and speed, synced via handheld scanner logs.
              </p>
            </div>

            {/* App Mockups & Tab Showcase */}
            <div className="mb-28">
              <div className="border border-gray-800 rounded-3xl bg-gray-900/20 backdrop-blur p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  {/* Left Column: Interactive Navigation & Description */}
                  <div className="lg:col-span-5 flex flex-col justify-between h-full">
                    <div>
                      <h2 className="text-3xl font-extrabold mb-6 tracking-tight">Experience the Interface</h2>
                      <div className="flex flex-col gap-3 mb-8">
                        {Object.keys(mockups).map((key) => (
                          <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-4 text-left p-4 rounded-2xl transition-all border ${
                              activeTab === key
                                ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                                : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800/40 hover:text-white'
                            }`}
                          >
                            {key === 'mobile' && <Smartphone className={`w-5 h-5 ${activeTab === 'mobile' ? 'text-blue-400' : 'text-gray-500'}`} />}
                            {key === 'web' && <Monitor className={`w-5 h-5 ${activeTab === 'web' ? 'text-indigo-400' : 'text-gray-500'}`} />}
                            {key === 'auditor' && <Printer className={`w-5 h-5 ${activeTab === 'auditor' ? 'text-emerald-400' : 'text-gray-500'}`} />}
                            <div>
                              <div className="font-bold text-sm">{mockups[key].title}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-900/60 border border-gray-800/50 p-6 rounded-2xl">
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {mockups[activeTab].description}
                      </p>
                      <ul className="space-y-2">
                        {mockups[activeTab].features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-gray-400">
                            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Screenshot display */}
                  <div className="lg:col-span-7 flex justify-center items-center">
                    <div className="relative group rounded-2xl overflow-hidden border border-gray-800 bg-[#0d0d0d] shadow-2xl transition-transform duration-700 hover:scale-[1.01] w-full aspect-[16/10]">
                      <img
                        src={mockups[activeTab].image}
                        alt={mockups[activeTab].title}
                        className="w-full h-full object-cover transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/50 to-transparent pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Section Grid */}
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Flexible, Transparent Pricing</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                No recurring fees, no mandatory cloud subscriptions. Own your data fully with our one-time purchase offline licenses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20 max-w-6xl mx-auto">
              
              {/* Collector Plan Card */}
              <div className="flex flex-col justify-between border border-gray-800 bg-gray-900/20 backdrop-blur rounded-3xl p-8 hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.05)] transition-all flex-1 relative overflow-hidden group">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-blue-400 tracking-wide uppercase">
                    <Coins className="w-4 h-4" /> For Collectors
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Collector License</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Best for organizing coins, cards, toy collections, and home inventories.
                  </p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black">$29</span>
                    <span className="text-gray-500 text-sm">one-time</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Local-First SQL database storage</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Unlimited item scans and entries</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Handheld barcode, coin, card capture</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Export inventory logs as CSV</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan('collector')}
                  className="w-full bg-gray-800 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md group-hover:shadow-blue-500/10 text-center flex items-center justify-center gap-2 border border-gray-700 hover:border-transparent cursor-pointer"
                >
                  Purchase Collector Key <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Retail Store POS Plan Card */}
              <div className="flex flex-col justify-between border-2 border-indigo-500/50 bg-gradient-to-b from-indigo-550/5 via-gray-900/30 to-gray-900/10 backdrop-blur rounded-3xl p-8 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-all flex-1 relative overflow-hidden">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase py-1.5 px-4 rounded-bl-2xl shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Retail POS
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-indigo-400 tracking-wide uppercase">
                    <Printer className="w-4 h-4" /> For Businesses
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Store POS License</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Designed for commercial inventory networks and hardware printing cashiers.
                  </p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">$99</span>
                    <span className="text-gray-500 text-sm">one-time</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 text-sm">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300 font-medium">Everything in Collector key</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Multi-Store and Branch Selector</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Hardware ESC/POS thermal printing</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Variance Auditor tracking console</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300">Priority security setup support</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan('store')}
                  className="w-full bg-gradient-to-r from-indigo-650 to-blue-650 hover:from-indigo-550 hover:to-blue-550 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-center flex items-center justify-center gap-2 cursor-pointer"
                >
                  Purchase Store Key <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Cloud Host Plan Card (Placeholder) */}
              <div className="flex flex-col justify-between border border-gray-800 bg-gray-900/10 rounded-3xl p-8 opacity-65 flex-1 relative overflow-hidden">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-500 tracking-wide uppercase">
                    <Database className="w-4 h-4" /> Coming Soon
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-gray-400">Cloud Sync Plan</h3>
                  <p className="text-gray-500 text-sm mb-6">
                    Connect multiple devices together securely over our hosted cloud infrastructure.
                  </p>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-black text-gray-500">Pricing TBD</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 text-sm text-gray-500">
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-gray-650 shrink-0 mt-0.5" />
                      <span>Automatic cloud backups & sync</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-gray-650 shrink-0 mt-0.5" />
                      <span>Web browser portal lookup</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-gray-650 shrink-0 mt-0.5" />
                      <span>Real-time inventory triggers</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-gray-650 shrink-0 mt-0.5" />
                      <span>API access tokens for integrations</span>
                    </li>
                  </ul>
                </div>

                <div
                  className="w-full bg-gray-950 text-gray-500 font-semibold py-3.5 rounded-xl border border-gray-850 text-center cursor-not-allowed select-none"
                >
                  Subscription Placeholder
                </div>
              </div>

            </div>

            {/* License Explanation Banner */}
            <div className="bg-gray-900/30 border border-gray-800 p-6 rounded-2xl max-w-4xl mx-auto flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm mb-1 text-gray-200">How offline key delivery works:</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Our system runs entirely offline inside your network for maximum database speed and privacy. When you purchase, you will provide a license name (your name or business). A secure cryptographic license key is manually generated using your license name as a signature seed, then emailed directly to you. Enter the key in the settings panel to activate the app forever.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ========================================================
            CHECKOUT STATE (PAYPAL BILLING FORM)
           ======================================================== */}
        {checkoutState === 'checkout' && (
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setCheckoutState('plans')}
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors cursor-pointer"
            >
              ← Back to Pricing
            </button>

            {/* Billing Card */}
            <div className="border border-gray-800 bg-gray-900/30 backdrop-blur rounded-3xl p-8 shadow-2xl relative">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

              <h2 className="text-3xl font-black mb-2">License Information</h2>
              <p className="text-gray-400 text-sm mb-8">
                Provide your details below. The owner name will be encoded directly into your secure cryptographic license key.
              </p>

              {/* Selected Plan Summary */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 mb-8 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Product Selection</div>
                  <div className="font-extrabold text-lg text-white">
                    {selectedPlan === 'collector' ? 'Collector License' : 'Store POS License'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Permanent offline registration</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-blue-400">
                    {selectedPlan === 'collector' ? '$29.00' : '$99.00'}
                  </div>
                  <div className="text-xs text-gray-500">One-time payment</div>
                </div>
              </div>

              {/* Billing Form */}
              <form onSubmit={handleProceedToPayment} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    License Owner Name / Business Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => {
                      setOwnerName(e.target.value);
                      if (formErrors.ownerName) {
                        setFormErrors(prev => ({ ...prev, ownerName: null }));
                      }
                      setIsRendered(false); // Reset buttons to force rebuild with new owner name
                    }}
                    className={`w-full bg-gray-800 border ${formErrors.ownerName ? 'border-red-500/70' : 'border-gray-700'} text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm`}
                    placeholder="e.g. John Doe / Super Scanners LLC"
                  />
                  {formErrors.ownerName ? (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {formErrors.ownerName}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1.5">
                      This identifier matches the custom ID you will use during local-first client registration.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    Email Address (Delivery Destination)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors(prev => ({ ...prev, email: null }));
                      }
                      setIsRendered(false); // Reset buttons to force rebuild
                    }}
                    className={`w-full bg-gray-800 border ${formErrors.email ? 'border-red-500/70' : 'border-gray-700'} text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm`}
                    placeholder="you@example.com"
                  />
                  {formErrors.email ? (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {formErrors.email}
                    </p>
                  ) : (
                    <p className="text-gray-500 text-xs mt-1.5">
                      Double check. Your manual license activation key will be delivered to this inbox.
                    </p>
                  )}
                </div>

                {/* Submit button to lock-in credentials and trigger PayPal checkouts */}
                {!isRendered && (
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    Confirm Credentials & Display Payment Options
                  </button>
                )}
              </form>

              {/* PayPal Container Section */}
              {isRendered && ownerName && email && (
                <div className="mt-8 pt-8 border-t border-gray-800">
                  <div className="text-center mb-6">
                    <p className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" /> Secure payment processed by PayPal.
                    </p>
                    <div className="text-xs text-blue-400">
                      Payment signed to owner: <span className="font-extrabold">{ownerName}</span>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {/* PayPal buttons anchor container */}
                  <div ref={paypalRef} id="paypal-button-container" className="w-full min-h-[150px]" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            SUCCESS STATE (CHECKOUT COMPLETED)
           ======================================================== */}
        {checkoutState === 'success' && successData && (
          <div className="max-w-2xl mx-auto">
            <div className="border border-emerald-500/30 bg-emerald-500/5 backdrop-blur rounded-3xl p-8 sm:p-12 shadow-2xl text-center relative overflow-hidden">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-8 animate-pulse">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <h2 className="text-3xl font-black text-emerald-400 mb-4 tracking-tight">
                Checkout Successful!
              </h2>
              <p className="text-gray-300 max-w-md mx-auto mb-8 text-sm sm:text-base leading-relaxed">
                Thank you for your purchase. We have received your payment of <span className="font-extrabold text-white">${successData.amount}</span>.
              </p>

              {/* Order summary card */}
              <div className="bg-[#0b0c0b] border border-gray-800 rounded-2xl p-6 text-left mb-10 max-w-lg mx-auto font-mono text-xs text-gray-400 space-y-3">
                <div className="text-center font-bold text-gray-300 border-b border-gray-850 pb-3 mb-2 uppercase tracking-widest text-[10px]">
                  Receipt & License Details
                </div>
                <div className="flex justify-between">
                  <span>Transaction ID:</span>
                  <span className="text-white font-semibold select-all">{successData.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Plan Purchased:</span>
                  <span className="text-white font-semibold">{successData.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span>License Owner ID:</span>
                  <span className="text-white font-semibold select-all">{successData.licenseName}</span>
                </div>
                <div className="flex justify-between">
                  <span>License Owner Email:</span>
                  <span className="text-white font-semibold select-all">{successData.licenseEmail}</span>
                </div>
                <div className="flex justify-between border-t border-gray-850 pt-3 mt-2 text-sm">
                  <span className="font-bold text-gray-300">Total Paid:</span>
                  <span className="text-emerald-400 font-extrabold">${successData.amount} USD</span>
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="text-left bg-gray-950 border border-gray-850 p-6 rounded-2xl max-w-lg mx-auto mb-10">
                <h4 className="font-bold text-sm mb-3 text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  What happens next?
                </h4>
                <ol className="list-decimal list-inside space-y-3 text-xs text-gray-400 leading-relaxed">
                  <li>
                    Our system requires <span className="text-white font-semibold">manual key verification</span>. We will generate your custom key shortly.
                  </li>
                  <li>
                    The administrator is using your Owner ID <span className="text-white font-semibold">({successData.licenseName})</span> with our offline Generator tool to sign the cryptographic registration key.
                  </li>
                  <li>
                    We will send the license activation code along with setup files and mobile Android APK instructions to your email <span className="text-white font-semibold">({successData.licenseEmail})</span>.
                  </li>
                  <li>
                    Fulfillment window is usually within <span className="text-white font-semibold">12 to 24 hours</span>. Please check spam folders if you don't receive it by then.
                  </li>
                </ol>
              </div>

              {/* Finish Button */}
              <button
                onClick={() => setCheckoutState('plans')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white transition-all shadow-md cursor-pointer"
              >
                Back to Landing Page
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
