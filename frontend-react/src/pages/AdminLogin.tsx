// src/pages/AdminLogin.tsx — Secure Operator & Admin Authentication for MALAI VIZHI
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Logo } from '../components/UI/Logo';
import {
  login,
  logout,
  forgotPassword,
  resetPassword,
  getStoredToken,
  getStoredUser,
} from '../services/api';
import { DemoPanel } from '../components/UI/DemoPanel';
import { AuthorityOverviewPanel } from '../components/Risk/AuthorityOverviewPanel';
import type { AuthUser } from '../types';

type Mode = 'login' | 'forgot_request' | 'forgot_reset';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();

  // Current session state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Form mode
  const [mode, setMode] = useState<Mode>('login');

  // Input states
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset states
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devResetCode, setDevResetCode] = useState<string | null>(null);

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if session is already active
    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user) {
      setCurrentUser(user);
    }
  }, []);

  // Clear messages when inputs change
  const handleUserIdChange = (val: string) => {
    setUserId(val);
    if (error) setError(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (error) setError(null);
  };

  // ─── LOGIN HANDLER ──────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUserId = userId.trim();
    if (!cleanUserId) {
      setError('Please enter your User ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanUserId, password);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setSuccessMessage(`Welcome back, ${res.user.name}!`);
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      } else {
        setError(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check network connection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── LOGOUT HANDLER ─────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setCurrentUser(null);
      setPassword('');
      setSuccessMessage('Logged out successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD: STEP 1 (REQUEST CODE) ──────────────────────────────────
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUserId = userId.trim();
    if (!cleanUserId) {
      setError('Please enter your User ID or registered Email.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(cleanUserId);
      if (res.success) {
        setSuccessMessage(res.message || 'Verification code generated.');
        if (res.reset_code) {
          setDevResetCode(res.reset_code);
          setResetCode(res.reset_code);
        }
        setMode('forgot_reset');
      } else {
        setError(res.error || 'Unable to process reset request.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed. Please check your connection.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── FORGOT PASSWORD: STEP 2 (VERIFY CODE & SET NEW PASSWORD) ───────────────
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanUserId = userId.trim();
    const cleanCode = resetCode.trim();

    if (!cleanUserId) {
      setError('User ID is required.');
      return;
    }
    if (!cleanCode) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(cleanUserId, cleanCode, newPassword);
      if (res.success) {
        setSuccessMessage('Password reset successfully! You can now log in with your new password.');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setResetCode('');
        setDevResetCode(null);
        setMode('login');
      } else {
        setError(res.error || 'Failed to reset password. The verification code may have expired.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] flex flex-col justify-between overflow-y-auto">
      {/* Header Bar */}
      <header className="bg-[#071A2B] px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <Logo size="sm" variant="light" />
        <span className="text-xs text-white/50 font-medium tracking-wide">
          Official Access Gateway
        </span>
      </header>

      {/* Main Login Card / Command Center */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 py-8">
        <div className={`w-full ${currentUser ? 'max-w-5xl' : 'max-w-md'} bg-white rounded-2xl border border-slate-200/80 shadow-xl p-5 sm:p-8 space-y-6 transition-all duration-300`}>
          
          {/* Brand & Badge Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#071A2B] text-[#14B8A6] flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck size={26} />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-[#071A2B] tracking-wider uppercase">
                MALAI VIZHI
              </h1>
              <p className="text-xs font-bold tracking-widest uppercase text-[#0F766E]">
                {currentUser ? 'AUTHORITY COMMAND CENTER' : mode === 'login' ? 'AUTHORIZED ACCESS' : 'PASSWORD RECOVERY'}
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 flex items-start gap-2.5 text-xs animate-fadeIn"
              role="alert"
            >
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 flex items-start gap-2.5 text-xs animate-fadeIn"
              role="status"
            >
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* ────────────────── STATE 1: ALREADY AUTHENTICATED ────────────────── */}
          {currentUser ? (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-[#071A2B]">{currentUser.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#14B8A6]/15 text-[#0F766E] uppercase tracking-wide">
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">Operator ID: {currentUser.user_id}</p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#071A2B] hover:bg-[#0B3948] active:bg-[#040f1a] text-white text-xs font-bold tracking-widest uppercase transition-all shadow-md min-h-[40px]"
                  >
                    LIVE MAP DASHBOARD
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 text-xs font-bold tracking-wider uppercase transition-all disabled:opacity-50 min-h-[40px]"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                    LOGOUT
                  </button>
                </div>
              </div>

              {/* Authority Operational Command Center */}
              <DemoPanel
                title="Review and escalate reports"
                description="Review a citizen report, verify it, escalate it and track the response."
              />
              <AuthorityOverviewPanel
                onSelectLocation={(lat, lon) => {
                  navigate(`/dashboard?lat=${lat}&lon=${lon}`);
                }}
              />
            </div>
          ) : mode === 'login' ? (
            /* ────────────────── STATE 2: LOGIN FORM ────────────────── */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="user-id-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  User ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    id="user-id-input"
                    type="text"
                    value={userId}
                    onChange={(e) => handleUserIdChange(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter your User ID (e.g. admin)"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-colors disabled:bg-slate-50 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setMode('forgot_request');
                    }}
                    className="text-xs font-semibold text-[#0F766E] hover:text-[#14B8A6] active:text-[#071A2B] hover:underline focus:outline-none py-1 px-1 -mr-1"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-colors disabled:bg-slate-50 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-r-xl"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#071A2B] hover:bg-[#0B3948] active:bg-[#040f1a] text-white text-xs font-bold tracking-widest uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    LOGIN
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : mode === 'forgot_request' ? (
            /* ────────────────── STATE 3: FORGOT PASSWORD REQUEST ────────────────── */
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed border border-slate-200">
                Enter your authorized <strong>User ID</strong> or registered email address. A 6-digit verification code will be generated to reset your credentials.
              </div>

              <div>
                <label
                  htmlFor="forgot-user-id"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  User ID / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    id="forgot-user-id"
                    type="text"
                    value={userId}
                    onChange={(e) => handleUserIdChange(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Enter your User ID"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] transition-colors min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#071A2B] hover:bg-[#0B3948] active:bg-[#040f1a] text-white text-xs font-bold tracking-widest uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    GENERATING CODE...
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    SEND RESET CODE
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
              >
                <ArrowLeft size={14} />
                Back to Login
              </button>
            </form>
          ) : (
            /* ────────────────── STATE 4: FORGOT PASSWORD RESET SUBMISSION ──────── */
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 text-[#0F766E] rounded-xl p-3.5 text-xs leading-relaxed">
                Verification code generated for <strong>{userId}</strong>. Enter the code and choose a new password.
              </div>

              {devResetCode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs flex items-center justify-between flex-wrap gap-2">
                  <span>Code: <strong>{devResetCode}</strong></span>
                  <button
                    type="button"
                    onClick={() => setResetCode(devResetCode)}
                    className="px-2.5 py-1 rounded bg-amber-200 text-amber-900 font-bold hover:bg-amber-300 active:bg-amber-400 transition-colors text-xs"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div>
                <label
                  htmlFor="reset-code-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  6-Digit Verification Code
                </label>
                <input
                  id="reset-code-input"
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={10}
                  placeholder="Enter 6-digit code"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-mono tracking-wider text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="At least 6 characters"
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 active:bg-slate-100 rounded-r-xl"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#102A43] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 focus:border-[#14B8A6] min-h-[44px]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#071A2B] hover:bg-[#0B3948] active:bg-[#040f1a] text-white text-xs font-bold tracking-widest uppercase transition-all shadow-md hover:shadow-lg disabled:opacity-50 min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    UPDATING PASSWORD...
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} />
                    RESET PASSWORD
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccessMessage(null);
                  setMode('login');
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-slate-500 hover:text-slate-800 active:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
              >
                <ArrowLeft size={14} />
                Cancel and Return to Login
              </button>
            </form>
          )}

          {/* Security Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <AlertCircle size={14} className="flex-shrink-0 text-slate-400 mt-0.5" />
            <p>
              <strong>Security Protocol:</strong> Access to the Early Warning System administration is monitored. All authentication attempts are logged.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Info */}
      <footer className="text-center py-4 text-xs text-slate-400 flex-shrink-0">
        MALAI VIZHI Landslide Early Warning System · North Eastern Region, India
      </footer>
    </div>
  );
};

export default AdminLogin;
