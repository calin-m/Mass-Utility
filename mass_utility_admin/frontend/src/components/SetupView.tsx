import React, { useState } from 'react';
import { ShieldAlert, UserPlus, KeyRound, AlertCircle } from 'lucide-react';

interface SetupViewProps {
  onSetupSuccess: () => void;
}

export const SetupView: React.FC<SetupViewProps> = ({ onSetupSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const path = window.location.pathname;
      const apiUrl = path + '?action=api_setup';
      const res = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        onSetupSuccess();
      } else {
        setError(data.error || 'Failed to initialize admin credentials');
      }
    } catch (err: any) {
      setError('Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-pm-card border border-amber-500/30 rounded-2xl p-8 shadow-xl pm-card-elevation">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-pm-text">First-Time Setup Wizard</h2>
          <p className="text-xs text-pm-secondary mt-1">
            No administrative account detected. Please initialize your primary Super Admin credentials.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Super Admin Username</label>
            <input
              type="text"
              required
              className="w-full bg-pm-input border border-pm-border rounded-xl px-3 py-2.5 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">Set Password</label>
            <input
              type="password"
              required
              className="w-full bg-pm-input border border-pm-border rounded-xl px-3 py-2.5 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full pm-btn-primary py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-md mt-2"
          >
            {loading ? 'Initializing Setup...' : '⚡ Initialize & Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
