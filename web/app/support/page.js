'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Copy, Check, ArrowLeft, Loader2, Key, HelpCircle } from 'lucide-react';

export default function SupportPortal() {
  const [machineId, setMachineId] = useState('');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMachineId, setLoadingMachineId] = useState(true);

  const router = useRouter();

  useEffect(() => {
    // Fetch machine ID
    fetch('/api/support/machine-id')
      .then(res => res.json())
      .then(data => {
        if (data.machineId) {
          setMachineId(data.machineId);
        } else {
          setError('Could not retrieve Machine ID.');
        }
      })
      .catch(() => setError('Failed to connect to local server support API.'))
      .finally(() => setLoadingMachineId(false));
  }, []);

  const handleCopy = () => {
    if (!machineId) return;
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/support/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setInfo('Support token verified successfully! Granting access...');
        setTimeout(() => {
          window.location.href = '/?page=1';
        }, 1500);
      } else {
        setError(data.error || 'Token validation failed. Verify that it was generated for this Machine ID.');
      }
    } catch (err) {
      setError('Network error: failed to submit verification request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/login')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
            <Shield className="w-6 h-6 text-blue-500" />
          </div>

          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Remote Support Portal
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Generate and input an offline support token to authorize secure, temporary developer support access.
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-6 text-sm">
              {info}
            </div>
          )}

          {/* Machine ID Box */}
          <div className="bg-gray-950 border border-gray-850 p-5 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Local Machine ID (Client Node)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={loadingMachineId || !machineId}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy ID
                  </>
                )}
              </button>
            </div>
            
            {loadingMachineId ? (
              <div className="flex items-center gap-2 text-gray-500 py-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Calculating hardware identifier...</span>
              </div>
            ) : (
              <div className="font-mono text-sm break-all select-all text-gray-300 py-1.5 tracking-wider bg-black/45 px-3 rounded-lg border border-gray-900">
                {machineId}
              </div>
            )}
            
            <p className="text-xs text-gray-600 mt-3 flex items-start gap-1">
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Provide this ID to the technical support team. They will sign a support token mapped exclusively to this machine.
            </p>
          </div>

          {/* Token Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">
                Paste Support Token
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
                <textarea
                  required
                  rows={4}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-blue-500 transition-colors font-mono text-xs leading-relaxed disabled:opacity-50"
                  placeholder="eyJhbGciOiJFUzI1NiIsImtpZCI6IiJ9.ey..."
                />
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl text-xs text-blue-400 leading-relaxed">
              <strong>Support Access Notice:</strong> Ephemeral sessions bypass local user logins and grant temporary support privileges. Sessions are capped at <strong>24 hours</strong> from token generation and leave no backdoor modifications in your database.
            </div>

            <button
              type="submit"
              disabled={loading || !token || !machineId}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Verify & Grant Access
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
