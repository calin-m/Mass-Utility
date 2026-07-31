// @Arch[LoginPage]
import React, { useState } from 'react';
import { AuthStore } from '../../store/useAuthStore';
import { FetchService } from '../../utils/FetchService';

interface LoginPageProps {
  onDemoClick?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onDemoClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      setError('Please provide both email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const candidateEndpoints = [
      './index.php?action=api_user_login',
      '../index.php?action=api_user_login',
      '../mass_utility_admin/public/index.php?action=api_user_login',
      '../../mass_utility_admin/public/index.php?action=api_user_login'
    ];

    let lastError = 'Invalid credentials or user account deactivated.';
    let success = false;

    // First try FetchService post for api_user_login
    try {
      const data = await FetchService.post('api_user_login', { email: cleanEmail, password: cleanPassword });
      if (data && data.success && data.token && data.user) {
        AuthStore.setSession(data.token, data.user);
        success = true;
      } else if (data && data.error) {
        lastError = data.error;
      }
    } catch (e) {}

    if (!success) {
      for (const endpoint of candidateEndpoints) {
        try {
          const formData = new FormData();
          formData.append('email', cleanEmail);
          formData.append('password', cleanPassword);

          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) continue;

          const data = await response.json();
          if (data.success && data.token && data.user) {
            AuthStore.setSession(data.token, data.user);
            success = true;
            break;
          } else if (data.error) {
            lastError = data.error;
            break;
          }
        } catch (err) {
          // Continue loop
        }
      }
    }

    if (!success) {
      setError(lastError);
    }
    setLoading(false);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const data = await FetchService.post('api_send_password_reset_link', { email: forgotEmail.trim() });
      if (data.success) {
        setForgotMsg(data.message || 'Password reset link sent to your email.');
      } else {
        setForgotMsg(data.error || 'Failed to dispatch reset email.');
      }
    } catch (err) {
      setForgotMsg('Error connecting to reset server.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-pm-bg text-pm-text-primary flex items-center justify-center p-4 selection:bg-pm-accent selection:text-white overflow-hidden">
      
      {/* Ambient Mesh Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-purple-600/10 via-indigo-600/15 to-blue-600/10 rounded-full blur-[120px] opacity-70" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-pm-accent/10 rounded-full blur-[100px]" />
      </div>

      {/* Glassmorphic Container Card */}
      <main className="relative w-full max-w-md bg-pm-card/95 backdrop-blur-2xl border border-pm-border/80 rounded-2xl p-8 shadow-[0_16px_48px_rgba(0,0,0,0.5)] space-y-6">
        
        {/* Header Title */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-pm-text-primary tracking-tight">
            Mass Utility
          </h1>
          <p className="text-xs text-pm-text-muted">
            Sign In to Dashboard
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div role="alert" aria-live="polite" className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-pm-text-secondary uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 text-sm text-slate-900 dark:text-slate-100 font-bold caret-purple-600 dark:caret-purple-400 placeholder:text-slate-600 dark:placeholder:text-slate-300 transition-all outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-pm-text-secondary uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-300" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/30 text-sm text-slate-900 dark:text-slate-100 font-bold caret-purple-600 dark:caret-purple-400 placeholder:text-slate-600 dark:placeholder:text-slate-300 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password text" : "Show password text"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.318 4.01 5.372 7 9.964 7 4.592 0 8.646-2.99 9.964-7-1.318-4.01-5.372-7-9.964-7-4.592 0-8.646 2.99-9.964 7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-pm-text-muted pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-pm-border bg-pm-input/40 text-pm-accent focus:ring-pm-accent"
              />
              <span>Remember active session</span>
            </label>
            <button
              type="button"
              onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
              className="text-xs text-pm-accent hover:underline cursor-pointer font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-pm-accent hover:bg-pm-accent/90 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-pm-accent/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-pm-border text-center">
          <button
            type="button"
            onClick={onDemoClick}
            className="w-full py-2.5 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
          >
            🧪 Launch Interactive Dashboard Demo
          </button>
        </div>

      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8 px-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-pm-card/95 backdrop-blur-2xl border border-pm-border/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-pm-text-primary">Request Password Reset</h2>
              <p className="text-xs text-pm-text-muted">Enter your registered email address to receive a secure reset link.</p>
            </div>

            {forgotMsg && (
              <div className="p-3 rounded-xl bg-pm-accent/10 border border-pm-accent/20 text-pm-accent text-xs text-center">
                {forgotMsg}
              </div>
            )}

            <form onSubmit={handleSendResetLink} className="space-y-3">
              <input
                type="email"
                required
                placeholder="admin@company.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-pm-input/50 border border-pm-border focus:border-pm-accent focus:ring-2 focus:ring-pm-accent/50 text-sm text-pm-text-primary placeholder:text-pm-text-muted transition-all outline-none"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-pm-input text-pm-text-secondary text-xs font-medium hover:bg-pm-input/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-1/2 py-2.5 px-3 rounded-xl bg-pm-accent text-white text-xs font-medium hover:bg-pm-accent/90 shadow-md shadow-pm-accent/20 transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {forgotLoading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
