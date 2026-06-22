'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Save, Loader2, Mail, User, Store } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import TenantSalesReport from '@/components/TenantSalesReport';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mallName, setMallName] = useState('Antique Mall');
  const [activeTier, setActiveTier] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  


  const [apiKeys, setApiKeys] = useState({ googleVisionKey: '', serpApiKey: '', priceChartingKey: '', tmdbApiKey: '' });
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    from: ''
  });
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  // Profile customization states
  const [displayName, setDisplayName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // 2FA states
  const [totpCode, setTotpCode] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [enableLoading, setEnableLoading] = useState(false);
  const [enableError, setEnableError] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  // Change password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setDisplayName(data.user.displayName || '');
          if (data.user.profilePicture) {
            setProfilePicUrl(`/uploads/profiles/${data.user.profilePicture}`);
          }
          
          if (data.user.isAdmin || data.user.isRoot) {
            fetch('/api/settings')
              .then(res => res.json())
              .then(settings => {
                if (settings.apiKeys) setApiKeys(settings.apiKeys);
                if (settings.activeTier) setActiveTier(settings.activeTier);
                if (settings.smtpConfig) setSmtpConfig(settings.smtpConfig);
                if (settings.mallName) setMallName(settings.mallName);
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
          body: JSON.stringify({ activeTier, apiKeys, smtpConfig, mallName })
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

  const handleTestSmtp = async () => {
    setTestLoading(true);
    setTestMessage('');
    try {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setTestMessage(data.message || 'SMTP Connection succeeded!');
      } else {
        setTestMessage(`Error: ${data.error || 'SMTP Connection failed'}`);
      }
    } catch (e) {
      setTestMessage('Network error while testing SMTP.');
    } finally {
      setTestLoading(false);
    }
  };

  const getInitialsAvatar = (u) => {
    if (!u) return '';
    const name = u.displayName || u.email || '';
    return name.slice(0, 2).toUpperCase();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setProfilePicUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const formData = new FormData();
      formData.append('displayName', displayName);
      if (avatarFile) {
        formData.append('profilePicture', avatarFile);
      }
      
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMessage('Profile updated successfully!');
        if (data.profilePicture) {
          setProfilePicUrl(`/uploads/profiles/${data.profilePicture}`);
        }
        // Force refresh layout headers
        router.refresh();
      } else {
        setProfileMessage(`Error: ${data.error || 'Failed to update profile'}`);
      }
    } catch (e) {
      setProfileMessage('Network error updating profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleInit2fa = async () => {
    setInitLoading(true);
    setEnableError('');
    try {
      const res = await fetch('/api/user/2fa/init', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
        setShowQr(true);
      } else {
        setEnableError(data.error || 'Failed to initialize 2FA');
      }
    } catch (e) {
      setEnableError('Network error initializing 2FA.');
    } finally {
      setInitLoading(false);
    }
  };

  const handleEnable2fa = async () => {
    setEnableLoading(true);
    setEnableError('');
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveryCodes(data.recoveryCodes || []);
        setUser({ ...user, twoFactorEnabled: 1 });
        setTotpCode('');
        setShowQr(false);
      } else {
        setEnableError(data.error || 'Failed to verify code.');
      }
    } catch (e) {
      setEnableError('Network error verifying code.');
    } finally {
      setEnableLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    setDisableLoading(true);
    setDisableError('');
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...user, twoFactorEnabled: 0 });
        setTotpCode('');
        setRecoveryCodes([]);
      } else {
        setDisableError(data.error || 'Failed to disable 2FA.');
      }
    } catch (e) {
      setDisableError('Network error disabling 2FA.');
    } finally {
      setDisableLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage('');

    if (newPassword.length < 6) {
      setPasswordMessage('Error: New password must be at least 6 characters long.');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Error: New password and confirmation password do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage(`Error: ${data.error || 'Failed to change password'}`);
      }
    } catch (err) {
      setPasswordMessage('Network error updating password.');
    } finally {
      setPasswordSaving(false);
    }
  };



  if (!user) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-white mb-8">Account Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-400" />
          Edit Profile
        </h2>
        
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-white text-3xl font-bold relative">
              {profilePicUrl ? (
                <img src={profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitialsAvatar(user)
              )}
            </div>
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center text-xs text-white font-medium cursor-pointer transition-opacity">
              Change
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input 
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter display name..."
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update Profile Details
            </button>
            {profileMessage && (
              <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {profileMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-purple-400" />
          Two-Factor Authentication (2FA)
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Add an extra layer of security to your account.
        </p>

        {user.twoFactorEnabled === 1 ? (
          <div className="space-y-4">
            <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-xl text-purple-300 text-sm flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <span>Two-Factor Authentication is currently <strong>enabled</strong> on your account.</span>
            </div>
            
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Enter 6-digit code to disable 2FA</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-red-500 transition-colors w-40 text-center font-mono tracking-widest text-lg"
                  placeholder="000000"
                />
                <button
                  onClick={handleDisable2fa}
                  disabled={disableLoading || totpCode.length !== 6}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 text-sm"
                >
                  Disable 2FA
                </button>
              </div>
              {disableError && (
                <p className="text-sm text-red-400 mt-2">{disableError}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!showQr ? (
              <button
                onClick={handleInit2fa}
                disabled={initLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 text-sm"
              >
                {initLoading ? 'Initializing...' : 'Set Up 2FA'}
              </button>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-gray-300 leading-relaxed">
                  1. Scan this QR code with your authenticator app (e.g. Google Authenticator, Microsoft Authenticator):
                </p>
                
                <div className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto border-4 border-gray-200">
                  <QRCodeSVG value={otpauthUrl} size={180} />
                </div>

                <div className="bg-gray-800 p-4 rounded-xl text-center">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Manual Entry Code</span>
                  <code className="text-lg font-mono text-purple-300 select-all font-bold tracking-wider">{twoFactorSecret}</code>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-300">
                    2. Enter the 6-digit verification code from your authenticator app to confirm:
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500 transition-colors w-40 text-center font-mono tracking-widest text-lg"
                      placeholder="000000"
                    />
                    <button
                      onClick={handleEnable2fa}
                      disabled={enableLoading || totpCode.length !== 6}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 text-sm"
                    >
                      Verify & Enable
                    </button>
                    <button
                      onClick={() => setShowQr(false)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-400 font-bold py-2.5 px-6 rounded-xl transition-all text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {enableError && (
                    <p className="text-sm text-red-400">{enableError}</p>
                  )}
                </div>
              </div>
            )}

            {recoveryCodes.length > 0 && (
              <div className="bg-gray-950 p-6 rounded-2xl border border-purple-500/30 space-y-4">
                <h3 className="text-md font-bold text-green-450 flex items-center gap-2">
                  Save Your Offline Recovery Codes!
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  These codes can be used to log in if you lose access to your authenticator device.
                  Each code is **one-time use**. Store them securely (e.g. print them or copy them to a password manager).
                </p>
                <div className="grid grid-cols-2 gap-3 font-mono text-sm text-purple-300 bg-gray-900 p-4 rounded-xl border border-gray-800">
                  {recoveryCodes.map((code, idx) => (
                    <span key={idx} className="select-all block font-bold text-center tracking-wide">{code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-green-400" />
          Change Password
        </h2>
        
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Current Password</label>
            <input 
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New Password (min 6 characters)</label>
            <input 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update Password
          </button>
          {passwordMessage && (
            <p className={`text-sm mt-3 ${passwordMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
              {passwordMessage}
            </p>
          )}
        </form>
      </div>

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
              <Store className="w-5 h-5 text-blue-400" />
              Central Store Configuration
            </h2>
            <p className="text-gray-400 mb-6 text-sm">
              Configure the name of the central register system. This name will appear on printed customer receipts and item price tag barcode labels.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Central Mall / Store Name</label>
              <input 
                type="text"
                value={mallName}
                onChange={(e) => setMallName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Antique Mall & Cooperatives"
                required
              />
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">PriceCharting API Token (For Video Games)</label>
            <input 
              type="password"
              value={apiKeys.priceChartingKey || ''}
              onChange={(e) => setApiKeys({...apiKeys, priceChartingKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your 40-character PriceCharting token"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">The Movie Database (TMDB) API Key (Free Movie Metadata)</label>
            <input 
              type="password"
              value={apiKeys.tmdbApiKey || ''}
              onChange={(e) => setApiKeys({...apiKeys, tmdbApiKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter your TMDB API v3 key"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Mail className="w-5 h-5 text-blue-400" />
          SMTP Email Configuration (For Registrations & Resets)
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Configure SMTP settings to enable user self-registrations and email verification. <br/>
          <span className="text-yellow-500/80 italic">If left blank, user self-registration is disabled and new employees must be added manually.</span>
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Host</label>
              <input 
                type="text"
                value={smtpConfig.host || ''}
                onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="smtp.mailgun.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Port</label>
              <input 
                type="text"
                value={smtpConfig.port || ''}
                onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="587"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 py-2">
            <input 
              type="checkbox"
              id="smtp-secure"
              checked={smtpConfig.secure === true}
              onChange={(e) => setSmtpConfig({...smtpConfig, secure: e.target.checked})}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="smtp-secure" className="text-sm font-medium text-gray-300 select-none cursor-pointer">
              Use SSL/TLS Connection (Secure port 465)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Username</label>
              <input 
                type="text"
                value={smtpConfig.user || ''}
                onChange={(e) => setSmtpConfig({...smtpConfig, user: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="postmaster@yourdomain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SMTP Password</label>
              <input 
                type="password"
                value={smtpConfig.pass || ''}
                onChange={(e) => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Sender Email Address (From)</label>
            <input 
              type="email"
              value={smtpConfig.from || ''}
              onChange={(e) => setSmtpConfig({...smtpConfig, from: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="no-reply@yourdomain.com"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testLoading}
              className="bg-gray-800 hover:bg-gray-750 border border-gray-750 text-white font-bold py-2.5 px-6 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Test SMTP Connection
            </button>
            {testMessage && (
              <p className={`text-sm font-medium ${testMessage.includes('succeeded') || testMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                {testMessage}
              </p>
            )}
          </div>
        </div>
      </div>


      </>
      )}

      {user.storeId && user.storeId !== 'default' && (
        <TenantSalesReport />
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
