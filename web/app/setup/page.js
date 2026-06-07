'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupWizard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [keyInfo, setKeyInfo] = useState({ isValid: false, type: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchronous client-side check to provide immediate visual feedback as they type
  useEffect(() => {
    const key = licenseKey.toUpperCase().trim().replace(/\s/g, '');
    const parts = key.split('-');
    
    if (parts.length === 4) {
      const [prefix, salt, hash1, hash2] = parts;
      if (['COLL', 'STOR', 'UPGR', 'TRIA', 'TR5M'].includes(prefix) && salt.length === 4 && hash1.length === 4 && hash2.length === 4) {
        // Mock validation on client just for UI badges; actual verification is cryptographic on the API
        const typeMap = { 
          'COLL': 'collector', 
          'STOR': 'store', 
          'UPGR': 'upgrade',
          'TRIA': 'store',
          'TR5M': 'store'
        };
        setKeyInfo({ isValid: true, type: typeMap[prefix] });
        return;
      }
    }
    setKeyInfo({ isValid: false, type: null });
  }, [licenseKey]);

  const handleKeyChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Automatically insert dashes to make inputting license keys easier
    const rawVal = val.replace(/-/g, '');
    if (rawVal.length > 0) {
      const segments = [];
      for (let i = 0; i < rawVal.length && i < 16; i += 4) {
        segments.push(rawVal.substring(i, i + 4));
      }
      val = segments.join('-');
    }
    setLicenseKey(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, licenseKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Setup failed.');
      }

      // Success, route to dashboard home page
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="setup-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        
        .setup-wrapper {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', sans-serif;
          background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
          color: #f1f5f9;
        }

        .setup-card {
          width: 100%;
          max-width: 480px;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          box-sizing: border-box;
        }

        .logo-title {
          font-weight: 800;
          font-size: 1.8rem;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 5px 0;
          text-align: center;
        }

        .subtitle {
          font-size: 0.9rem;
          color: #94a3b8;
          margin: 0 0 30px 0;
          text-align: center;
          font-weight: 400;
        }

        .form-group {
          margin-bottom: 22px;
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .form-input {
          background: rgba(2, 6, 23, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 0.95rem;
          color: #f8fafc;
          font-family: inherit;
          transition: all 0.25s ease;
          box-sizing: border-box;
          outline: none;
        }

        .form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
          background: rgba(2, 6, 23, 0.85);
        }

        /* Interactive Badge Styles */
        .license-badge {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.85rem;
          margin-bottom: 25px;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .badge-awaiting {
          background: rgba(71, 85, 105, 0.15);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #94a3b8;
        }

        .badge-collector {
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.08);
        }

        .badge-store {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.08);
        }

        .badge-upgrade {
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #6366f1;
        }

        .badge-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 10px;
          flex-shrink: 0;
        }

        .indicator-awaiting { background-color: #64748b; }
        .indicator-collector { background-color: #f59e0b; animation: pulse 2s infinite; }
        .indicator-store { background-color: #10b981; animation: pulse 2s infinite; }
        .indicator-upgrade { background-color: #6366f1; }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        .submit-btn {
          width: 100%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: none;
          color: white;
          padding: 14px;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.25s ease;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.85rem;
          margin-bottom: 20px;
          text-align: center;
        }

        .loader-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      ` }} />

      <div className="setup-card">
        <h1 className="logo-title">INVENTORY SYSTEM</h1>
        <p className="subtitle">First-Boot Platform Configuration</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@store.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Setup Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Product License Key</label>
            <input
              type="text"
              className="form-input"
              value={licenseKey}
              onChange={handleKeyChange}
              placeholder="COLL-XXXX-XXXX-XXXX"
              maxLength={19}
              required
              disabled={loading}
            />
          </div>

          {/* DYNAMIC BADGE */}
          {!keyInfo.isValid ? (
            <div className="license-badge badge-awaiting">
              <span className="badge-indicator indicator-awaiting" />
              <span>Awaiting Valid Product Key...</span>
            </div>
          ) : keyInfo.type === 'collector' ? (
            <div className="license-badge badge-collector">
              <span className="badge-indicator indicator-collector" style={{ animationName: 'pulse' }} />
              <div>
                <strong>Collector Mode Detected</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                  Activates asset cataloging, condition grading, and net worth charts.
                </span>
              </div>
            </div>
          ) : keyInfo.type === 'store' ? (
            <div className="license-badge badge-store">
              <span className="badge-indicator indicator-store" style={{ animationName: 'pulse' }} />
              <div>
                <strong>Store POS Mode Detected</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                  Unlocks registers, shifts, printing, taxes, and supplier management.
                </span>
              </div>
            </div>
          ) : (
            <div className="license-badge badge-upgrade">
              <span className="badge-indicator indicator-upgrade" />
              <div>
                <strong>Upgrade Key Detected</strong>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                  Upgrade licenses cannot be used for initial setup onboarding.
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !keyInfo.isValid || keyInfo.type === 'upgrade'}
          >
            {loading ? (
              <>
                <span className="loader-spinner" />
                Configuring System...
              </>
            ) : (
              'Complete Setup & Launch'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
