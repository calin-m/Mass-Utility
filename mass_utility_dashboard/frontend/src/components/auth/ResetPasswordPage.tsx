import React, { useState, useEffect } from 'react';

interface ResetPasswordPageProps {
  token: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userInfo, setUserInfo] = useState<{ email?: string; name?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      setVerifying(true);
      try {
        const response = await fetch(`../mass_utility_admin/public/index.php?action=api_verify_reset_token&token=${encodeURIComponent(token)}`);
        const data = await response.json();
        if (data.success) {
          setUserInfo({ email: data.email, name: data.name });
        } else {
          setError(data.error || 'Password reset link is invalid or has expired.');
        }
      } catch (err) {
        setError('Failed to reach Mass Utility authentication server.');
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('../mass_utility_admin/public/index.php?action=api_complete_password_reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setError('Connection error. Could not save new password.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToLogin = () => {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('action');
    cleanUrl.searchParams.delete('token');
    window.location.href = cleanUrl.toString();
  };

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex items-center justify-center p-4 selection:bg-pm-accent selection:text-white">
      <div className="w-full max-w-md bg-pm-card/80 backdrop-blur-2xl border border-pm-border/60 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pm-accent/10 border border-pm-accent/20 text-pm-accent text-xs font-semibold uppercase tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span>Password Recovery</span>
          </div>
          <h1 className="text-2xl font-bold text-pm-text-primary tracking-tight">
            Reset Account Password
          </h1>
          {userInfo && (
            <p className="text-xs text-pm-text-muted">
              Updating credentials for <span className="text-pm-text-primary font-medium">{userInfo.email}</span>
            </p>
          )}
        </div>

        {verifying ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-pm-accent/30 border-t-pm-accent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-pm-text-muted">Verifying password reset security token...</p>
          </div>
        ) : success ? (
          <div className="p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-pm-text-primary">Password Reset Successful!</h2>
            <p className="text-xs text-pm-text-muted">Your new password has been saved. You can now sign in to your account.</p>
            <button
              onClick={handleReturnToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-pm-accent text-white font-medium text-xs shadow-lg transition-all cursor-pointer"
            >
              Return to Login Screen
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {!error && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-pm-text-secondary uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-pm-input/50 border border-pm-border focus:border-pm-accent focus:ring-1 focus:ring-pm-accent text-sm text-pm-text placeholder:text-pm-text-muted transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-pm-text-secondary uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-pm-input/50 border border-pm-border focus:border-pm-accent focus:ring-1 focus:ring-pm-accent text-sm text-pm-text placeholder:text-pm-text-muted transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-pm-text-muted">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-pm-accent hover:underline cursor-pointer"
                  >
                    {showPassword ? 'Hide Plaintext' : 'Show Password Plaintext'}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-pm-accent hover:bg-pm-accent/90 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-pm-accent/25 transition-all cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Save New Password</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
};
