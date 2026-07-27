// @Arch[SearchFilterBar]
import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterLabel?: string;
  extraActions?: React.ReactNode;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  filterValue,
  onFilterChange,
  filterOptions = [],
  filterLabel,
  extraActions
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-pm-card-bg/40 border border-pm-border rounded-lg mb-4">
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-pm-text-secondary text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-1.5 bg-pm-bg border border-pm-border rounded-md text-sm text-pm-text-primary placeholder-pm-text-secondary/60 focus:outline-none focus:border-pm-primary transition-colors"
          />
        </div>

        {/* Optional Filter Select */}
        {onFilterChange && filterOptions.length > 0 && (
          <div className="flex items-center gap-2">
            {filterLabel && (
              <span className="text-xs text-pm-text-secondary font-medium whitespace-nowrap">
                {filterLabel}:
              </span>
            )}
            <select
              value={filterValue || ''}
              onChange={(e) => onFilterChange(e.target.value)}
              className="py-1.5 px-3 bg-pm-bg border border-pm-border rounded-md text-sm text-pm-text-primary focus:outline-none focus:border-pm-primary transition-colors cursor-pointer"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Optional Extra Actions */}
      {extraActions && (
        <div className="flex items-center gap-2">
          {extraActions}
        </div>
      )}
    </div>
  );
};
