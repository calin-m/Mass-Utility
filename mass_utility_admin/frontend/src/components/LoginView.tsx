// @Arch[LoginView]
import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const path = window.location.pathname;
      const apiUrl = path + '?action=api_login';
      const res = await fetch(apiUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError('Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pm-bg text-pm-text flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-pm-card border border-pm-border rounded-2xl p-8 shadow-xl pm-card-elevation">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
            {t('login_title')}
          </h2>
          <p className="text-xs text-pm-secondary mt-1">{t('login_subtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">{t('login_username_label')}</label>
            <div className="relative">
              <User className="w-4 h-4 text-pm-secondary absolute left-3 top-3" />
              <input
                type="text"
                required
                autoComplete="username"
                className="w-full bg-pm-input border border-pm-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                placeholder={t('login_username_placeholder')}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-pm-secondary mb-1">{t('login_password_label')}</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-pm-secondary absolute left-3 top-3" />
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-pm-input border border-pm-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-pm-text focus:border-pm-primary focus:outline-none"
                placeholder={t('login_password_placeholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? t('btn_refresh') : t('login_btn')}
          </button>
        </form>
      </div>
    </div>
  );
};
