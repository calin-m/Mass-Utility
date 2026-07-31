// @Arch[DomainPillGroup]
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ExternalLink, Search, Copy, Check, ChevronDown } from 'lucide-react';
import { parseDomains } from '../../utils/domainUtils';

export interface DomainPillGroupProps {
  storeUrl: string | null | undefined;
  maxInline?: number; // Default 1
}

export const DomainPillGroup: React.FC<DomainPillGroupProps> = ({
  storeUrl,
  maxInline = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [portalCoords, setPortalCoords] = useState<{ top: number; left: number; placeUpwards: boolean }>({ top: 0, left: 0, placeUpwards: false });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const domains = parseDomains(storeUrl);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverHeight = 260; // Estimated max height of popover
      const spaceBelow = window.innerHeight - rect.bottom;
      const placeUpwards = spaceBelow < popoverHeight && rect.top > popoverHeight;

      setPortalCoords({
        top: placeUpwards ? Math.max(10, rect.top - popoverHeight - 8) : rect.bottom + 8,
        left: Math.min(rect.left, Math.max(10, window.innerWidth - 300)),
        placeUpwards,
      });
    }
  };

  const handleToggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  // Close popover on click outside or window resize/scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (isOpen) {
        updateCoords();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  if (domains.length === 0) {
    return <span className="text-pm-secondary italic text-xs">Unbound (Any Store Domain)</span>;
  }

  const primaryDomain = domains[0];
  const overflowCount = domains.length - maxInline;
  const filteredDomains = searchQuery.trim()
    ? domains.filter(d => d.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : domains;

  const handleCopy = (dom: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(dom);
    setCopiedDomain(dom);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {/* Primary Domain Badge Pill */}
      <a
        href={primaryDomain.startsWith('http') ? primaryDomain : `https://${primaryDomain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] hover:bg-emerald-500/20 transition-colors"
      >
        <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
        <span className="truncate max-w-[140px]">{primaryDomain}</span>
        <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
      </a>

      {/* Overflow Badge Pill (+N More / View List) */}
      {overflowCount > 0 && (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggleOpen}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold font-mono transition-all ${
            isOpen
              ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300 shadow-md'
              : 'bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20'
          }`}
        >
          <span>+{overflowCount} More</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Glassmorphic Whitelist Popover Tooltip (Portal to document.body) */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{ top: `${portalCoords.top}px`, left: `${portalCoords.left}px` }}
          className="fixed z-[999999] w-72 p-3 bg-pm-card/95 backdrop-blur-md border border-pm-border shadow-2xl rounded-xl space-y-2 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-pm-border pb-2">
            <span className="text-xs font-bold text-pm-text flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" /> Whitelisted Store Domains ({domains.length})
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              Active Whitelist
            </span>
          </div>

          {/* Search Filter input if > 4 domains */}
          {domains.length > 4 && (
            <div className="relative">
              <Search className="w-3 h-3 text-pm-secondary absolute left-2 top-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-pm-input border border-pm-border rounded-lg pl-7 pr-2 py-1 text-[11px] font-mono text-pm-text focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}

          {/* Domain List Container */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-pm-border">
            {filteredDomains.map((dom, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-pm-input/50 border border-pm-border/60 hover:border-emerald-500/30 flex items-center justify-between gap-2 group transition-all"
              >
                <a
                  href={dom.startsWith('http') ? dom : `https://${dom}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-emerald-400 text-[11px] hover:underline flex items-center gap-1.5 truncate flex-1"
                >
                  <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{dom}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={(e) => handleCopy(dom, e)}
                  className="p-1 hover:bg-pm-border/40 rounded text-pm-secondary hover:text-pm-text transition-colors shrink-0"
                  title="Copy Domain"
                >
                  {copiedDomain === dom ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  )}
                </button>
              </div>
            ))}

            {filteredDomains.length === 0 && (
              <div className="p-3 text-center text-xs text-pm-secondary italic">No matching domains found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
