import React from 'react';
import { Search, LucideIcon } from 'lucide-react';

export interface StatusFilterOption {
  key: string;
  label: string;
  count: number;
}

export interface PrimaryActionOption {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface DirectoryToolbarProps {
  searchPlaceholder: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilters: StatusFilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  primaryAction?: PrimaryActionOption;
}

export const DirectoryToolbar: React.FC<DirectoryToolbarProps> = ({
  searchPlaceholder,
  searchTerm,
  onSearchChange,
  statusFilters,
  activeFilter,
  onFilterChange,
  primaryAction
}) => {
  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-4 shadow-sm pm-card-elevation flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        {/* Search Bar Input */}
        <div className="relative flex-1 md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-pm-secondary pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-pm-input border border-pm-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-pm-text placeholder:text-pm-secondary/60 focus:outline-none focus:border-pm-primary transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 shrink-0 overflow-x-auto">
          {statusFilters.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-pm-input text-pm-text border border-pm-primary/50 shadow-sm'
                    : 'pm-btn-neutral text-pm-secondary hover:text-pm-text'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-pm-primary/20 text-pm-primary' : 'bg-pm-input/50 text-pm-secondary'
                }`}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="pm-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 shadow-md hover:shadow-lg"
        >
          <primaryAction.icon className="w-4 h-4" />
          <span>{primaryAction.label}</span>
        </button>
      )}
    </div>
  );
};
