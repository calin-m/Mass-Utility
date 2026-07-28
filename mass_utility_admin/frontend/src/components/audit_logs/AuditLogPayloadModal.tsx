// @Arch[AuditLogPayloadModal]
import React from 'react';
import { Terminal, FileText, Code2 } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { Button } from '../common/Button';
import { useTranslation } from '../../i18n/LanguageContext';

interface AuditLogPayloadModalProps {
  selectedLog: any | null;
  onClose: () => void;
  showRawJson: boolean;
  onToggleRawJson: () => void;
  formatKeyName: (key: string) => string;
  formatValue: (key: string, val: any) => React.ReactNode;
}

export const AuditLogPayloadModal: React.FC<AuditLogPayloadModalProps> = ({
  selectedLog,
  onClose,
  showRawJson,
  onToggleRawJson,
  formatKeyName,
  formatValue,
}) => {
  const { t } = useTranslation();

  if (!selectedLog) return null;

  return (
    <BaseModal
      isOpen={!!selectedLog}
      onClose={onClose}
      title={`Audit Event Telemetry #${selectedLog.id}`}
      icon={FileText}
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Header Summary */}
        <div className="p-3 bg-pm-input/50 rounded-xl border border-pm-border grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
          <div>
            <span className="text-[10px] text-pm-secondary block uppercase font-bold">{t('th_admin_op')}</span>
            <span className="font-bold text-pm-text">{selectedLog.admin_username || 'system'}</span>
          </div>
          <div>
            <span className="text-[10px] text-pm-secondary block uppercase font-bold">{t('th_target')}</span>
            <span className="text-purple-600 dark:text-purple-400 font-bold">{selectedLog.target_entity} {selectedLog.target_id ? `#${selectedLog.target_id}` : ''}</span>
          </div>
          <div>
            <span className="text-[10px] text-pm-secondary block uppercase font-bold">{t('th_ip')}</span>
            <span className="text-pm-text">{selectedLog.ip_address}</span>
          </div>
        </div>

        {/* Dynamic Key-Value Details */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-pm-secondary uppercase tracking-wider">
            {t('audit_struct_params')}
          </h4>
          {Object.keys(selectedLog.details_parsed || {}).length === 0 ? (
            <div className="p-4 bg-pm-input/30 rounded-xl border border-pm-border text-pm-secondary italic text-center">
              {t('audit_no_params')}
            </div>
          ) : (
            <div className="bg-pm-input/40 rounded-xl border border-pm-border divide-y divide-pm-border">
              {Object.entries(selectedLog.details_parsed).map(([key, val]) => (
                <div key={key} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-pm-secondary font-bold shrink-0">
                    {formatKeyName(key)}:
                  </span>
                  <div className="text-right text-xs font-mono">{formatValue(key, val)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Terminal Box */}
        <div className="pt-2 border-t border-pm-border">
          <button
            onClick={onToggleRawJson}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
          >
            <Code2 className="w-4 h-4" />
            <span>{showRawJson ? 'Hide Raw JSON Payload Data' : 'Inspect Raw JSON Payload Data'}</span>
          </button>

          {showRawJson && (
            <div className="mt-2 rounded-xl overflow-hidden border border-pm-border shadow-inner">
              <div className="bg-pm-card px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-pm-secondary border-b border-pm-border">
                <span className="font-bold flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-purple-500" /> payload.json
                </span>
                <span>{selectedLog.created_at}</span>
              </div>
              <pre className="p-3 bg-pm-input font-mono text-[11px] text-pm-text overflow-x-auto max-h-72 overflow-y-auto">
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="neutral" size="md" onClick={onClose}>
            {t('btn_close')}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
