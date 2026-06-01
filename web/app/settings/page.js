'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [activeTier, setActiveTier] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [apiKeys, setApiKeys] = useState({ googleVisionKey: '', serpApiKey: '' });

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          
          if (data.user.isAdmin || data.user.isRoot) {
            fetch('/api/settings')
              .then(res => res.json())
              .then(settings => {
                if (settings.apiKeys) setApiKeys(settings.apiKeys);
                if (settings.activeTier) setActiveTier(settings.activeTier);
              });
          } else {
            setActiveTier(data.user.activeTier || 'basic');
          }
        }
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    
    try {
      if (user?.isAdmin || user?.isRoot) {
        // Admin updates global settings
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeTier, apiKeys })
        });
        if (res.ok) {
          setMessage('Global Settings saved successfully!');
        } else {
          setMessage('Failed to save settings.');
        }
      } else {
        // Normal user updating nothing right now (activeTier is global)
        setMessage('Settings saved.');
      }
    } catch (e) {
      setMessage('Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

      {(user?.isAdmin || user?.isRoot) && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-blue-400" />
              Global Subscription Tier
            </h2>
            <p className="text-gray-400 mb-6">
              As the Store Owner, your selected tier applies to all employee accounts on this system.
            </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <button 
            onClick={() => setActiveTier('basic')}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${activeTier === 'basic' ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 hover:border-gray-600 bg-gray-800'}`}
          >
            <h3 className="text-lg font-bold text-white mb-2">Basic (Free)</h3>
            <p className="text-sm text-gray-400">Uses standard Google Cloud Vision API. Fast, free, but struggles with stylized fonts.</p>
          </button>
          
          <button 
            onClick={() => setActiveTier('premium')}
            disabled={user?.tier !== 'premium'}
            className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${activeTier === 'premium' ? 'border-purple-500 bg-purple-900/20' : 'border-gray-700 bg-gray-800'} ${user?.tier === 'premium' ? 'hover:border-gray-600' : 'opacity-70 cursor-not-allowed'}`}
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-lg font-bold text-white mb-2">Premium (SerpApi)</h3>
            <p className="text-sm text-gray-400 mb-4">Uses exact Google Lens matches. Highly accurate for games, cards, and collectibles.</p>
            {user?.tier !== 'premium' && (
              <div className="inline-block bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Coming Soon
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-green-400" />
          Global API Configuration (BYOK)
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Enter your own API keys below. All employee scans will use these keys. <br/>
          <span className="text-yellow-500/80 italic">If you are the developer and these are left blank, the system will fall back to using your local .env keys.</span>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Google Cloud Vision API Key</label>
            <input 
              type="password"
              value={apiKeys.googleVisionKey}
              onChange={(e) => setApiKeys({...apiKeys, googleVisionKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="AIzaSy..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">SerpApi Key (For Premium)</label>
            <input 
              type="password"
              value={apiKeys.serpApiKey}
              onChange={(e) => setApiKeys({...apiKeys, serpApiKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your SerpApi private key"
            />
          </div>
        </div>
      </div>
      </>
      )}

      {(!user?.isAdmin && !user?.isRoot) && (
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            Subscription Plan
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            You are currently inheriting the <span className="text-purple-400 font-bold">Premium Plan</span> capabilities from the Store Owner.
            All your uploads and item scans will utilize the highest available tier automatically!
          </p>
        </div>
      )}

      <div className="mb-6">
        {message && (
          <p className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            Account Details
            {user?.isAdmin ? (
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-1 rounded-full uppercase tracking-wider">
                Admin
              </span>
            ) : null}
          </h2>
          <p className="text-gray-400 mt-1">Logged in as: <span className="text-white font-medium">{user?.email}</span></p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Settings
        </button>
      </div>

    </div>
  );
}
