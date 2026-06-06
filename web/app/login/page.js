'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Key, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

function LoginContent() {
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot', 'reset', '2fa'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);
  const [temp2faToken, setTemp2faToken] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const verified = searchParams.get('verified');
  const urlError = searchParams.get('error');

  useEffect(() => {
    // Check if we are in password reset mode via URL token
    if (token) {
      setView('reset');
    }
    // Check if email was verified successfully
    if (verified === 'true') {
      setInfo('Email verified successfully! You can now log in.');
    }
    // Check if there was a verification error
    if (urlError) {
      setError(urlError);
    }

    // Check if registration is enabled
    fetch('/api/auth/register')
      .then(res => res.json())
      .then(data => setRegistrationEnabled(!!data.enabled))
      .catch(() => setRegistrationEnabled(false));
  }, [token, verified, urlError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.twoFactorRequired) {
          setTemp2faToken(data.tempToken);
          setView('2fa');
          setTotpCode('');
        } else if (data.forcePasswordReset) {
          setError('');
          setInfo('For security, you must set a new password before logging in.');
          router.push(`/login?token=${data.resetToken}`);
        } else if (data.pendingVerification) {
          setInfo(data.message || 'Check your email to verify your account.');
          setView('login');
          setPassword('');
        } else {
          window.location.href = '/?page=1';
        }
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: temp2faToken, code: totpCode }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = '/?page=1';
      } else {
        setError(data.error || 'Invalid verification code.');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo(data.message || 'If registered, a password reset link has been sent.');
        setView('login');
        setEmail('');
      } else {
        setError(data.error || 'Failed to request password reset.');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo('Password reset successfully! Please log in.');
        setView('login');
        setNewPassword('');
        // Clean URL params
        router.replace('/login');
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'reset' && 'Set New Password'}
            {view === '2fa' && '2FA Verification'}
          </h1>
          <p className="text-gray-400 mb-8 text-sm">
            {view === 'login' && 'Sign in to access your inventory'}
            {view === 'register' && 'Start tracking your collection today'}
            {view === 'forgot' && 'Enter your email to receive a password reset link'}
            {view === 'reset' && 'Choose a strong new password'}
            {view === '2fa' && 'Enter your 6-digit authenticator or recovery code'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {info && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl mb-6 text-sm">
              {info}
            </div>
          )}

          {/* LOGIN & REGISTER FORMS */}
          {(view === 'login' || view === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-400">Password</label>
                  {view === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setError(''); setInfo(''); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {view === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              {registrationEnabled && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); setInfo(''); }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {view === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Send Reset Link
              </button>
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setInfo(''); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {view === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Min 6 characters..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Set New Password
              </button>
            </form>
          )}

          {/* 2FA VERIFICATION FORM */}
          {view === '2fa' && (
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 text-center">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={9}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:border-purple-550 transition-colors text-center font-mono tracking-widest text-2xl font-bold uppercase"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Verify & Login
              </button>
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setView('login'); setError(''); setInfo(''); setTotpCode(''); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" /> Cancel & Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
