'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Key, Save, Loader2, Mail, User, Store, CreditCard, QrCode, Printer, Gamepad2, Film } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import TenantSalesReport from '@/components/TenantSalesReport';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mallName, setMallName] = useState('Antique Mall');
  const [mallAddress, setMallAddress] = useState('123 Main Street, Suite A');
  const [mallPhone, setMallPhone] = useState('(555) 019-2834');
  const [receiptFooter, setReceiptFooter] = useState('THANK YOU FOR SHOPPING!\nALL SALES FINAL ON ANTIQUES');
  const [receiptLogo, setReceiptLogo] = useState('');
  const [activeTier, setActiveTier] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [enabledGameSystems, setEnabledGameSystems] = useState([]);
  const [enabledMovieFormats, setEnabledMovieFormats] = useState([]);
  


  const [apiKeys, setApiKeys] = useState({
    googleVisionKey: '',
    googleBooksKey: '',
    serpApiKey: '',
    priceChartingKey: '',
    searxngUrl: '',
    ebayClientId: '',
    ebayClientSecret: '',
    ebayMarketplaceId: 'EBAY_US',
    marketValuationProvider: 'searxng'
  });
  const [paymentConfig, setPaymentConfig] = useState({
    provider: 'none',
    stripeApiKey: '',
    stripeReaderId: '',
    squareAccessToken: '',
    squareLocationId: '',
    squareDeviceId: '',
    venmoHandle: '',
    paypalEmail: ''
  });
  const [tunnelConfig, setTunnelConfig] = useState({
    method: 'none',
    licenseKey: '',
    customToken: '',
    activeToken: '',
    subdomain: '',
    isConnected: false
  });
  const [tunnelStatus, setTunnelStatus] = useState({ status: 'stopped', error: null, subdomain: '', loading: true });
  const [tunnelActionLoading, setTunnelActionLoading] = useState(false);
  const [tunnelMessage, setTunnelMessage] = useState('');
  const [tunnelError, setTunnelError] = useState('');
  const [printerConfig, setPrinterConfig] = useState({
    connectionType: 'browser',
    networkIp: '',
    networkPort: '9100',
    paperWidth: '80mm',
    cashDrawerKick: true,
    paperCut: true
  });
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

  const [searxngStatus, setSearxngStatus] = useState({
    platform: '',
    dockerInstalled: false,
    containerStatus: 'not_created',
    endpointActive: false,
    loading: true
  });
  const [searxngActionLoading, setSearxngActionLoading] = useState(false);
  const [searxngMessage, setSearxngMessage] = useState('');
  const [searxngError, setSearxngError] = useState('');

  const [logoUploading, setLogoUploading] = useState(false);
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.imagePath) {
        setReceiptLogo(data.imagePath);
      } else {
        alert(data.error || 'Failed to upload logo.');
      }
    } catch (err) {
      alert('Network error uploading logo.');
    } finally {
      setLogoUploading(false);
    }
  };

  const fetchSearxngStatus = async () => {
    try {
      const res = await fetch('/api/admin/searxng');
      if (res.ok) {
        const data = await res.json();
        setSearxngStatus({ ...data, loading: false });
      }
    } catch (e) {}
  };

  const handleSearxngAction = async (action) => {
    setSearxngActionLoading(true);
    setSearxngMessage('');
    setSearxngError('');
    try {
      const res = await fetch('/api/admin/searxng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setSearxngMessage(data.message);
        if (action === 'install') {
          setApiKeys(prev => ({ ...prev, searxngUrl: 'http://localhost:8080' }));
        }
        await fetchSearxngStatus();
      } else {
        setSearxngError(data.error || 'Operation failed.');
      }
    } catch (e) {
      setSearxngError('Network error occurred.');
    } finally {
      setSearxngActionLoading(false);
    }
  };

  const fetchTunnelStatus = async () => {
    try {
      const res = await fetch('/api/settings/tunnel');
      if (res.ok) {
        const data = await res.json();
        setTunnelStatus({
          status: data.status,
          error: data.error,
          subdomain: data.subdomain,
          loading: false
        });
        setTunnelConfig(prev => ({
          ...prev,
          method: data.method || 'none',
          isConnected: data.isConnected || false,
          subdomain: data.subdomain || ''
        }));
      }
    } catch (e) {}
  };

  const handleConnectTunnel = async () => {
    setTunnelActionLoading(true);
    setTunnelMessage('');
    setTunnelError('');
    try {
      const res = await fetch('/api/settings/tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tunnelConfig)
      });
      const data = await res.json();
      if (res.ok) {
        setTunnelMessage('Tunnel connection initiated successfully!');
        await fetchTunnelStatus();
      } else {
        setTunnelError(data.error || 'Failed to start tunnel.');
      }
    } catch (e) {
      setTunnelError('Network error while starting tunnel.');
    } finally {
      setTunnelActionLoading(false);
    }
  };

  const handleDisconnectTunnel = async () => {
    setTunnelActionLoading(true);
    setTunnelMessage('');
    setTunnelError('');
    try {
      const res = await fetch('/api/settings/tunnel', {
        method: 'DELETE'
      });
      if (res.ok) {
        setTunnelMessage('Tunnel disconnected successfully!');
        await fetchTunnelStatus();
      } else {
        const data = await res.json();
        setTunnelError(data.error || 'Failed to stop tunnel.');
      }
    } catch (e) {
      setTunnelError('Network error while stopping tunnel.');
    } finally {
      setTunnelActionLoading(false);
    }
  };

  useEffect(() => {
    let statusInterval = null;
    if (tunnelStatus.status === 'connecting') {
      statusInterval = setInterval(() => {
        fetchTunnelStatus();
      }, 3000);
    }
    return () => {
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [tunnelStatus.status]);

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
            setProfilePicUrl(`/api/file/${data.user.profilePicture}`);
          }
          
          if (data.user.isAdmin || data.user.isRoot) {
            fetch('/api/settings')
              .then(res => res.json())
              .then(settings => {
                if (settings.apiKeys) setApiKeys(settings.apiKeys);
                if (settings.activeTier) setActiveTier(settings.activeTier);
                if (settings.smtpConfig) setSmtpConfig(settings.smtpConfig);
                if (settings.mallName) setMallName(settings.mallName);
                if (settings.mallAddress !== undefined) setMallAddress(settings.mallAddress);
                if (settings.mallPhone !== undefined) setMallPhone(settings.mallPhone);
                if (settings.receiptFooter !== undefined) setReceiptFooter(settings.receiptFooter);
                if (settings.receiptLogo !== undefined) setReceiptLogo(settings.receiptLogo);
                if (settings.paymentConfig) setPaymentConfig(settings.paymentConfig);
                if (settings.tunnelConfig) setTunnelConfig(settings.tunnelConfig);
                if (settings.printerConfig) setPrinterConfig(settings.printerConfig);
                if (settings.enabledGameSystems) setEnabledGameSystems(settings.enabledGameSystems);
                if (settings.enabledMovieFormats) setEnabledMovieFormats(settings.enabledMovieFormats);
              });
            fetchSearxngStatus();
            fetchTunnelStatus();

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
          body: JSON.stringify({ activeTier, apiKeys, smtpConfig, mallName, mallAddress, mallPhone, receiptFooter, receiptLogo, paymentConfig, tunnelConfig, printerConfig, enabledGameSystems, enabledMovieFormats })
        });
        if (res.ok) {
          setMessage('Global Settings saved successfully!');
          fetchSearxngStatus();
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
          setProfilePicUrl(`/api/file/${data.profilePicture}`);
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Store Phone Number</label>
                <input 
                  type="text"
                  value={mallPhone}
                  onChange={(e) => setMallPhone(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. (555) 019-2834"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Store Street Address</label>
              <input 
                type="text"
                value={mallAddress}
                onChange={(e) => setMallAddress(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. 123 Main Street, Suite A"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Receipt Footer Message</label>
              <textarea 
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                placeholder="e.g. THANK YOU FOR SHOPPING!&#10;ALL SALES FINAL ON ANTIQUES"
              />
            </div>

            <div className="mt-6 bg-gray-950 border border-gray-850 p-5 rounded-2xl">
              <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider text-xs">Receipt Header Company Logo</label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {receiptLogo ? (
                  <div className="relative w-24 h-24 bg-white border border-gray-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    <img src={receiptLogo} alt="Receipt Logo" className="object-contain w-full h-full p-1" />
                    <button
                      type="button"
                      onClick={() => setReceiptLogo('')}
                      className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-red-400 font-bold transition-opacity text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center text-gray-500 text-xs shrink-0">
                    No Logo
                  </div>
                )}
                
                <div className="flex-1 space-y-2">
                  <p className="text-gray-400 text-xs">
                    Upload a square or wide logo (JPEG or PNG). This logo will appear at the top of printed and digital customer receipts.
                  </p>
                  <label className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/10">
                    {logoUploading ? 'Uploading Logo...' : 'Choose Logo Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoChange} 
                      className="hidden" 
                      disabled={logoUploading}
                    />
                  </label>
                </div>
              </div>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Google Cloud Vision API Key (AI Image Scan)</label>
            <input 
              type="password"
              value={apiKeys.googleVisionKey || ''}
              onChange={(e) => setApiKeys({...apiKeys, googleVisionKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="AIzaSy..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Google Books API Key (Optional)</label>
            <input 
              type="password"
              value={apiKeys.googleBooksKey || ''}
              onChange={(e) => setApiKeys({...apiKeys, googleBooksKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="AIzaSy... (Falls back to Vision Key or OpenLibrary if blank)"
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

          <div className="border-t border-gray-800 pt-6 mt-6">
            <h3 className="text-md font-semibold text-white mb-2">Market Valuation Source</h3>
            <p className="text-gray-400 text-sm mb-4">
              Select which backend engine retrieves item market prices during scans and valuation lookups.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <label 
                className={`relative flex items-start p-4 rounded-2xl border cursor-pointer transition-all ${
                  (apiKeys.marketValuationProvider || 'searxng') === 'searxng'
                    ? 'bg-blue-950/40 border-blue-500 text-white'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <input 
                  type="radio" 
                  name="marketValuationProvider"
                  value="searxng"
                  checked={(apiKeys.marketValuationProvider || 'searxng') === 'searxng'}
                  onChange={(e) => setApiKeys({...apiKeys, marketValuationProvider: e.target.value})}
                  className="mt-1 mr-3 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    SearXNG (Default)
                    <span className="text-[10px] bg-green-900/60 text-green-300 px-2 py-0.5 rounded-full font-mono">100% FREE</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Self-hosted search engine querying live web listings across eBay, Walmart, and Google.
                  </div>
                </div>
              </label>

              <label 
                className={`relative flex items-start p-4 rounded-2xl border transition-all ${
                  (apiKeys.ebayClientId && apiKeys.ebayClientSecret)
                    ? (apiKeys.marketValuationProvider === 'ebay'
                        ? 'bg-blue-950/40 border-blue-500 text-white cursor-pointer'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 cursor-pointer')
                    : 'bg-gray-900/50 border-gray-800 text-gray-500 cursor-not-allowed opacity-75'
                }`}
              >
                <input 
                  type="radio" 
                  name="marketValuationProvider"
                  value="ebay"
                  disabled={!apiKeys.ebayClientId || !apiKeys.ebayClientSecret}
                  checked={apiKeys.marketValuationProvider === 'ebay' && Boolean(apiKeys.ebayClientId && apiKeys.ebayClientSecret)}
                  onChange={(e) => setApiKeys({...apiKeys, marketValuationProvider: e.target.value})}
                  className="mt-1 mr-3 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                />
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    eBay REST API
                    {(!apiKeys.ebayClientId || !apiKeys.ebayClientSecret) ? (
                      <span className="text-[10px] bg-yellow-900/60 text-yellow-300 px-2 py-0.5 rounded-full font-mono">Requires eBay Keys Below</span>
                    ) : (
                      <span className="text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full font-mono">Official API</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Direct eBay REST API integration for high-accuracy barcode GTIN/UPC and keyword market values.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 mt-4">
            <h3 className="text-md font-semibold text-white mb-1">eBay API Configuration (Free Developer Account)</h3>
            <p className="text-xs text-gray-400 mb-3">
              Obtain your free Client ID (App ID) and Client Secret (Cert ID) at <a href="https://developer.ebay.com" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">developer.ebay.com</a>.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">eBay App ID (Client ID)</label>
            <input 
              type="text"
              value={apiKeys.ebayClientId || ''}
              onChange={(e) => setApiKeys({...apiKeys, ebayClientId: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. YourName-Inventory-PRD-123456789-abcdef"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">eBay Cert ID (Client Secret)</label>
            <input 
              type="password"
              value={apiKeys.ebayClientSecret || ''}
              onChange={(e) => setApiKeys({...apiKeys, ebayClientSecret: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="PRD-123456789abc-def0-1234-5678-9abc"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">eBay Marketplace ID (Optional)</label>
            <input 
              type="text"
              value={apiKeys.ebayMarketplaceId || 'EBAY_US'}
              onChange={(e) => setApiKeys({...apiKeys, ebayMarketplaceId: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="EBAY_US (Default), EBAY_GB, EBAY_CA, etc."
            />
          </div>

          <div className="border-t border-gray-800 pt-4 mt-4">
            <h3 className="text-md font-semibold text-white mb-3">SearXNG Search Configuration (Free Self-Hosted Alternative)</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">SearXNG Instance URL</label>
            <input 
              type="text"
              value={apiKeys.searxngUrl || ''}
              onChange={(e) => setApiKeys({...apiKeys, searxngUrl: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. http://localhost:8080 or http://192.168.1.100:8080"
            />
          </div>

          <div className="bg-gray-950 border border-gray-850 rounded-2xl p-4 sm:p-5 mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    searxngStatus.endpointActive ? 'bg-green-400' :
                    searxngStatus.containerStatus === 'running' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    searxngStatus.endpointActive ? 'bg-green-500' :
                    searxngStatus.containerStatus === 'running' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
                </span>
                SearXNG Self-Hosting Assistant
              </h4>
              <button
                type="button"
                onClick={fetchSearxngStatus}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-bold focus:outline-none cursor-pointer"
              >
                Re-check Status
              </button>
            </div>

            {searxngStatus.loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                <span>Checking host system environment...</span>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {searxngStatus.endpointActive ? (
                  <div className="text-green-400 bg-green-950/20 border border-green-900/30 p-3.5 rounded-xl text-xs">
                    <strong>Service Active</strong>: SearXNG instance is responding and active at <code>{apiKeys.searxngUrl || 'http://localhost:8080'}</code>.
                  </div>
                ) : (
                  <>
                    {/* Docker Status */}
                    {!searxngStatus.dockerInstalled ? (
                      <div className="space-y-3">
                        <div className="text-red-400 bg-red-950/20 border border-red-900/30 p-3.5 rounded-xl">
                          <strong>Docker Not Found</strong>: Docker must be running on the host system to auto-install SearXNG.
                        </div>
                        {searxngStatus.platform === 'linux' ? (
                          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                            <p className="text-gray-300 text-xs font-semibold">Detected Server OS: Linux (Raspberry Pi). Run the following commands to install Docker:</p>
                            <pre className="bg-black/40 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap select-all">
{`curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER`}
                            </pre>
                            <p className="text-gray-500 text-[11px] italic">Note: Reboot or run 'newgrp docker' after commands finish, then refresh this page.</p>
                          </div>
                        ) : (
                          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                            <p className="text-gray-300 text-xs font-semibold">Detected Server OS: {searxngStatus.platform === 'win32' ? 'Windows' : 'macOS'}</p>
                            <p className="text-gray-400 text-xs">Docker Desktop is required to host SearXNG locally. Please download it from the official site:</p>
                            <a 
                              href="https://www.docker.com/products/docker-desktop/" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors mt-1"
                            >
                              Download Docker Desktop
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Docker Installed */}
                        {searxngStatus.containerStatus === 'not_created' && (
                          <div className="space-y-3">
                            <p className="text-gray-400 text-xs">
                              Docker is active. Click below to automatically create and launch a local **SearXNG** container on port **8080**.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleSearxngAction('install')}
                              disabled={searxngActionLoading}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50"
                            >
                              {searxngActionLoading ? (
                                <>
                                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                  Installing SearXNG...
                                </>
                              ) : 'Install & Start SearXNG via Docker'}
                            </button>
                          </div>
                        )}

                        {searxngStatus.containerStatus === 'stopped' && (
                          <div className="space-y-3">
                            <p className="text-gray-400 text-xs">
                              The local SearXNG container exists but is currently stopped.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleSearxngAction('start')}
                              disabled={searxngActionLoading}
                              className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-green-500/10 flex items-center gap-2 disabled:opacity-50"
                            >
                              {searxngActionLoading ? (
                                <>
                                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                  Starting...
                                </>
                              ) : 'Start SearXNG Container'}
                            </button>
                          </div>
                        )}

                        {searxngStatus.containerStatus === 'running' && (
                          <div className="space-y-2">
                            <div className="text-yellow-400 bg-yellow-950/20 border border-yellow-900/30 p-3.5 rounded-xl text-xs flex items-center gap-2">
                              <span className="animate-spin h-3.5 w-3.5 border-2 border-yellow-400 border-t-transparent rounded-full"></span>
                              <span>Container is running. Waiting for SearXNG service to initialize...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {/* Messages */}
                {searxngMessage && (
                  <div className="text-green-400 bg-green-950/10 border border-green-900/20 p-3.5 rounded-xl text-xs">
                    {searxngMessage}
                  </div>
                )}
                {searxngError && (
                  <div className="text-red-400 bg-red-950/10 border border-red-900/20 p-3.5 rounded-xl text-xs">
                    {searxngError}
                  </div>
                )}
              </div>
            )}
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

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <CreditCard className="w-5 h-5 text-blue-400" />
          POS Card Reader Integration
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Select and configure your countertop card reader terminal provider for in-person transactions.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Active Provider</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPaymentConfig({ ...paymentConfig, provider: 'none' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentConfig.provider === 'none' ? 'border-blue-500 bg-blue-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                None (QR / Cash Only)
              </button>
              <button
                type="button"
                onClick={() => setPaymentConfig({ ...paymentConfig, provider: 'stripe' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentConfig.provider === 'stripe' ? 'border-indigo-500 bg-indigo-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Stripe Terminal
              </button>
              <button
                type="button"
                onClick={() => setPaymentConfig({ ...paymentConfig, provider: 'square' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${paymentConfig.provider === 'square' ? 'border-purple-500 bg-purple-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Square Terminal
              </button>
            </div>
          </div>

          {paymentConfig.provider === 'stripe' && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <h3 className="text-md font-semibold text-white">Stripe Terminal Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stripe Secret Key (sk_live_...)</label>
                <input
                  type="password"
                  value={paymentConfig.stripeApiKey || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeApiKey: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Target Reader ID (tmr_...)</label>
                <input
                  type="text"
                  value={paymentConfig.stripeReaderId || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, stripeReaderId: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. tmr_F9B2A8E1"
                />
              </div>
            </div>
          )}

          {paymentConfig.provider === 'square' && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <h3 className="text-md font-semibold text-white">Square Terminal Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Square Sandbox/Access Token (EAAA...)</label>
                <input
                  type="password"
                  value={paymentConfig.squareAccessToken || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, squareAccessToken: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Square Location ID</label>
                  <input
                    type="text"
                    value={paymentConfig.squareLocationId || ''}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, squareLocationId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. L-1234..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Square Device ID</label>
                  <input
                    type="text"
                    value={paymentConfig.squareDeviceId || ''}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, squareDeviceId: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. 421-eq..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* QR Code Dynamic Checkouts Configuration */}
          <div className="space-y-4 border-t border-gray-800 pt-6 mt-6">
            <h3 className="text-md font-semibold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-500" />
              Dynamic Mobile Payments (QR Codes)
            </h3>
            <p className="text-xs text-gray-400">
              Enter credentials to generate dynamic checkout QR codes for Venmo and PayPal on the POS Register screen.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Venmo Username / Handle</label>
                <input
                  type="text"
                  value={paymentConfig.venmoHandle || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, venmoHandle: e.target.value })}
                  className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="e.g. @MyStoreName"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">PayPal Email / Merchant ID</label>
                <input
                  type="text"
                  value={paymentConfig.paypalEmail || ''}
                  onChange={(e) => setPaymentConfig({ ...paymentConfig, paypalEmail: e.target.value })}
                  className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="e.g. billing@mystore.com"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remote Sync & Dynamic Cloud Tunnels Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <QrCode className="w-5 h-5 text-amber-500" />
          Remote Sync & Dynamic Cloud Tunnels
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Securely sync your local register database to the cloud to aggregate sales and access sync APIs.
        </p>

        <div className="space-y-6">
          {/* Connection Status Banner */}
          {!tunnelStatus.loading && (
            <div className={`p-4 rounded-2xl flex items-center justify-between border ${
              tunnelStatus.status === 'connected'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : tunnelStatus.status === 'connecting'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : 'bg-gray-850 border-gray-800 text-gray-400'
            }`}>
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    tunnelStatus.status === 'connected'
                      ? 'bg-green-400'
                      : tunnelStatus.status === 'connecting'
                        ? 'bg-amber-400'
                        : 'bg-gray-500'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    tunnelStatus.status === 'connected'
                      ? 'bg-green-500'
                      : tunnelStatus.status === 'connecting'
                        ? 'bg-amber-500'
                        : 'bg-gray-650'
                  }`}></span>
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {tunnelStatus.status === 'connected'
                      ? 'Tunnel Active & Online'
                      : tunnelStatus.status === 'connecting'
                        ? 'Establishing Tunnel connection...'
                        : 'Sync Tunnel Offline'}
                  </p>
                  {tunnelStatus.status === 'connected' && tunnelStatus.subdomain && (
                    <a
                      href={tunnelStatus.subdomain}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 underline font-mono block mt-1 hover:text-blue-300"
                    >
                      {tunnelStatus.subdomain}
                    </a>
                  )}
                </div>
              </div>

              <div>
                {tunnelStatus.status !== 'stopped' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectTunnel}
                    disabled={tunnelActionLoading}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectTunnel}
                    disabled={tunnelActionLoading || tunnelConfig.method === 'none'}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-4 rounded-xl text-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          )}

          {tunnelError && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-3 rounded-xl select-text">
              {tunnelError}
            </p>
          )}

          {tunnelMessage && (
            <p className="text-xs text-green-400 bg-green-950/20 border border-green-900/30 p-3 rounded-xl">
              {tunnelMessage}
            </p>
          )}

          {/* Sync Configuration Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sync Method</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setTunnelConfig({ ...tunnelConfig, method: 'none' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${tunnelConfig.method === 'none' ? 'border-blue-500 bg-blue-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                None
              </button>
              <button
                type="button"
                onClick={() => setTunnelConfig({ ...tunnelConfig, method: 'managed' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${tunnelConfig.method === 'managed' ? 'border-amber-500 bg-amber-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Managed Cloud Sync
              </button>
              <button
                type="button"
                onClick={() => setTunnelConfig({ ...tunnelConfig, method: 'self-hosted' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${tunnelConfig.method === 'self-hosted' ? 'border-purple-500 bg-purple-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Self-Hosted Tunnel
              </button>
            </div>
          </div>

          {tunnelConfig.method === 'managed' && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <h3 className="text-md font-semibold text-white">Managed Sync Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stripe Subscription License Key</label>
                <input
                  type="text"
                  value={tunnelConfig.licenseKey || ''}
                  onChange={(e) => setTunnelConfig({ ...tunnelConfig, licenseKey: e.target.value })}
                  className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="e.g. STOR-1234..."
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Your license key connects to Stripe to verify your store's cloud provisioning status.
                </p>
              </div>
            </div>
          )}

          {tunnelConfig.method === 'self-hosted' && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              <h3 className="text-md font-semibold text-white">Self-Hosted Tunnel Settings</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Cloudflare Tunnel Token</label>
                <input
                  type="password"
                  value={tunnelConfig.customToken || ''}
                  onChange={(e) => setTunnelConfig({ ...tunnelConfig, customToken: e.target.value })}
                  className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  placeholder="••••••••"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Enter the connection token from your Cloudflare Zero Trust console.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Game Console Settings Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          Video Game Console Settings
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Customize which video game systems appear in the catalog dropdown selection list. Uncheck systems you do not sell or collect to keep the list clean and compact.
        </p>

        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
          <button
            type="button"
            onClick={() => setEnabledGameSystems(enabledGameSystems.map(s => ({ ...s, enabled: true })))}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setEnabledGameSystems(enabledGameSystems.map(s => ({ ...s, enabled: false })))}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 bg-gray-950/40 p-4 rounded-2xl border border-gray-800/60 custom-scrollbar">
          {enabledGameSystems.map((sys, idx) => (
            <label key={sys.name} className="flex items-center gap-3 cursor-pointer group hover:bg-gray-800/20 p-1.5 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={sys.enabled}
                onChange={(e) => {
                  const updated = [...enabledGameSystems];
                  updated[idx] = { ...sys, enabled: e.target.checked };
                  setEnabledGameSystems(updated);
                }}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors select-none">{sys.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Movie Format Settings Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Film className="w-5 h-5 text-indigo-400" />
          Movie Format Settings
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Customize which movie formats appear in the catalog dropdown selection list. Uncheck formats you do not sell or collect to keep the list clean and compact.
        </p>

        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
          <button
            type="button"
            onClick={() => setEnabledMovieFormats(enabledMovieFormats.map(s => ({ ...s, enabled: true })))}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setEnabledMovieFormats(enabledMovieFormats.map(s => ({ ...s, enabled: false })))}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 bg-gray-950/40 p-4 rounded-2xl border border-gray-800/60 custom-scrollbar">
          {enabledMovieFormats.map((form, idx) => (
            <label key={form.name} className="flex items-center gap-3 cursor-pointer group hover:bg-gray-800/20 p-1.5 rounded-lg transition-colors">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => {
                  const updated = [...enabledMovieFormats];
                  updated[idx] = { ...form, enabled: e.target.checked };
                  setEnabledMovieFormats(updated);
                }}
                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors select-none">{form.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Receipt Printer Configuration Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Printer className="w-5 h-5 text-indigo-400" />
          Receipt Printer Configuration
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Configure how receipts are printed when checkout payments are completed at the register.
        </p>

        <div className="space-y-6">
          {/* Connection Type Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Printer Connection Type</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setPrinterConfig({ ...printerConfig, connectionType: 'browser' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${printerConfig.connectionType === 'browser' ? 'border-indigo-500 bg-indigo-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Regular Printer (Browser)
              </button>
              <button
                type="button"
                onClick={() => setPrinterConfig({ ...printerConfig, connectionType: 'network' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${printerConfig.connectionType === 'network' ? 'border-blue-500 bg-blue-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                Network Thermal Printer
              </button>
              <button
                type="button"
                onClick={() => setPrinterConfig({ ...printerConfig, connectionType: 'usb' })}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${printerConfig.connectionType === 'usb' ? 'border-purple-500 bg-purple-900/10 text-white' : 'border-gray-800 text-gray-400 bg-gray-900'}`}
              >
                USB Thermal Printer (WebUSB)
              </button>
            </div>
          </div>

          {/* Network configurations */}
          {printerConfig.connectionType === 'network' && (
            <div className="space-y-4 border-t border-gray-800 pt-4 animate-fade-in">
              <h3 className="text-md font-semibold text-white">Network Printer Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Printer IP Address</label>
                  <input
                    type="text"
                    value={printerConfig.networkIp || ''}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, networkIp: e.target.value })}
                    className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    placeholder="e.g. 192.168.1.100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Printer TCP Port</label>
                  <input
                    type="text"
                    value={printerConfig.networkPort || '9100'}
                    onChange={(e) => setPrinterConfig({ ...printerConfig, networkPort: e.target.value })}
                    className="w-full bg-gray-850 border border-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    placeholder="9100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hardware Triggers */}
          {printerConfig.connectionType !== 'browser' && (
            <div className="space-y-4 border-t border-gray-800 pt-4 animate-fade-in">
              <h3 className="text-md font-semibold text-white">Thermal Hardware Triggers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-gray-850 border border-gray-800 p-4 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-white">Automatic Paper Cut</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Feeds and triggers partial print cutting</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrinterConfig({ ...printerConfig, paperCut: !printerConfig.paperCut })}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${printerConfig.paperCut ? 'bg-indigo-600' : 'bg-gray-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${printerConfig.paperCut ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-gray-850 border border-gray-800 p-4 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-white">Kick Cash Drawer</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Sends drawer kick pulse signal to printer port</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrinterConfig({ ...printerConfig, cashDrawerKick: !printerConfig.cashDrawerKick })}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${printerConfig.cashDrawerKick ? 'bg-indigo-600' : 'bg-gray-700'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${printerConfig.cashDrawerKick ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}
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
