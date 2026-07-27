// @Arch[DomainTagSelector]
import React, { useState, KeyboardEvent, ClipboardEvent } from 'react';
import { Globe, X, Plus } from 'lucide-react';
import { parseDomains } from '../../utils/domainUtils';

export interface DomainTagSelectorProps {
  value: string; // Serialized string or JSON array or comma list
  onChange: (newValue: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

export const DomainTagSelector: React.FC<DomainTagSelectorProps> = ({
  value,
  onChange,
  label = 'Allowed Store Domains',
  placeholder = 'Type domain (e.g. store.com) and press Enter...',
  helperText = 'Type a store domain origin and press Enter, Comma, or Space. Click ✕ to remove.',
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const domains = parseDomains(value);

  const cleanDomain = (d: string): string => {
    let host = d.trim().toLowerCase();
    host = host.replace(/^https?:\/\//i, '');
    host = host.replace(/^www\./i, '');
    host = host.split('/')[0];
    host = host.split(':')[0];
    return host.trim();
  };

  const addDomains = (newRawDomains: string[]) => {
    const cleanedList = newRawDomains
      .map(cleanDomain)
      .filter(Boolean);

    const merged = Array.from(new Set([...domains, ...cleanedList]));
    onChange(JSON.stringify(merged));
  };

  const removeDomain = (domainToRemove: string) => {
    const updated = domains.filter((d) => d !== domainToRemove);
    onChange(updated.length > 0 ? JSON.stringify(updated) : '');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key)) {
      if (inputValue.trim()) {
        e.preventDefault();
        addDomains([inputValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && domains.length > 0) {
      removeDomain(domains[domains.length - 1]);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText) {
      e.preventDefault();
      const split = pasteText.split(/[\n,;\s]+/);
      addDomains(split);
      setInputValue('');
    }
  };

  const handleManualAdd = () => {
    if (inputValue.trim()) {
      addDomains([inputValue]);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-pm-secondary">{label}</label>
          {domains.length > 0 && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[10px] text-purple-400 hover:underline font-mono"
            >
              🧹 Clear All ({domains.length})
            </button>
          )}
        </div>
      )}

      {/* Interactive Tag Container */}
      <div className="p-2.5 bg-pm-input border border-pm-border focus-within:border-pm-primary focus-within:ring-1 focus-within:ring-pm-primary/30 rounded-xl transition-all space-y-2">
        {/* Rendered Domain Badge Pills */}
        <div className="flex flex-wrap gap-1.5">
          {domains.map((dom) => (
            <span
              key={dom}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs shadow-sm transition-all group"
            >
              <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{dom}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeDomain(dom)}
                  className="hover:bg-emerald-500/20 p-0.5 rounded-full text-emerald-400/70 hover:text-emerald-300 transition-colors"
                  title={`Remove ${dom}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>

        {/* Input Control */}
        {!disabled && (
          <div className="flex items-center gap-2 pt-1 border-t border-pm-border/40">
            <div className="relative flex-1">
              <Globe className="w-3.5 h-3.5 text-pm-secondary absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={domains.length === 0 ? placeholder : 'Add another domain origin...'}
                className="w-full bg-transparent pl-8 pr-2 py-1.5 text-xs font-mono text-pm-text placeholder:text-pm-secondary/60 focus:outline-none"
              />
            </div>
            {inputValue.trim() && (
              <button
                type="button"
                onClick={handleManualAdd}
                className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            )}
          </div>
        )}
      </div>

      {helperText && <p className="text-[10px] text-pm-secondary">{helperText}</p>}
    </div>
  );
};
