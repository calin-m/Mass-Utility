// @Arch[ClientCredentialsBanner]
import React from 'react';
import { Check } from 'lucide-react';
import { CopyButton } from '../common/CopyButton';
import { useTranslation } from '../../i18n/LanguageContext';

interface ClientCredentialsBannerProps {
  lastCreatedCreds: { email: string; pass: string; key?: string } | null;
  showBannerPass: boolean;
  copiedCreds: boolean;
  onToggleShowPass: () => void;
  onCopyCreds: () => void;
  onDismiss: () => void;
}

export const ClientCredentialsBanner: React.FC<ClientCredentialsBannerProps> = ({
  lastCreatedCreds,
  showBannerPass,
  copiedCreds,
  onToggleShowPass,
  onCopyCreds,
  onDismiss
}) => {
  const { t } = useTranslation();

  if (!lastCreatedCreds) return null;

  return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
      <div className="space-y-1">
        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{t('lbl_creds_title')} <strong>{lastCreatedCreds.email}</strong></span>
        </div>
        <div className="text-[11px] font-mono text-pm-secondary flex flex-wrap items-center gap-4 pt-1">
          <span>{t('lbl_creds_email')} <strong className="text-pm-text">{lastCreatedCreds.email}</strong></span>
          <span>{t('lbl_creds_password')} <strong className="text-pm-text font-bold">{showBannerPass ? lastCreatedCreds.pass : '••••••••••••'}</strong></span>
          <button
            type="button"
            onClick={onToggleShowPass}
            className="text-purple-600 dark:text-purple-400 hover:underline font-bold text-[10px]"
          >
            {showBannerPass ? t('lbl_creds_hide') : t('lbl_creds_show')} {t('login_password_label')}
          </button>
          {lastCreatedCreds.key && (
            <span>{t('lbl_creds_key')} <strong className="text-purple-600 dark:text-purple-400">{lastCreatedCreds.key}</strong></span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <CopyButton
          variant="success"
          size="sm"
          value={`Email: ${lastCreatedCreds.email}\nPassword: ${lastCreatedCreds.pass}${lastCreatedCreds.key ? `\nLicense Key: ${lastCreatedCreds.key}` : ''}`}
          label={t('btn_copy_creds')}
          copiedLabel={t('btn_copied')}
          onCopied={onCopyCreds}
        />
        <button
          type="button"
          onClick={onDismiss}
          className="text-pm-secondary hover:text-pm-text text-xs p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
