// @Arch[DirectoryToolbar]
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Search, LucideIcon, X, List, LayoutGrid } from 'lucide-react';
import { Button } from './Button';
import { FormInput } from './FormInput';

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

export interface DirectoryToolbarProps {
  searchPlaceholder: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilters: StatusFilterOption[];
  activeFilter: string;
  onFilterChange: (key: string) => void;
  onClearFilters?: () => void;
  primaryAction?: PrimaryActionOption;
  viewMode?: 'grid' | 'table';
  onViewModeChange?: (mode: 'grid' | 'table') => void;
  density?: 'compact' | 'comfortable';
  onDensityChange?: (density: 'compact' | 'comfortable') => void;
}

export const DirectoryToolbar: React.FC<DirectoryToolbarProps> = ({
  searchPlaceholder,
  searchTerm,
  onSearchChange,
  statusFilters,
  activeFilter,
  onFilterChange,
  onClearFilters,
  primaryAction,
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
}) => {
  const hasActiveFilters = Boolean(searchTerm || (activeFilter && activeFilter !== 'all' && activeFilter !== 'ALL'));

  const densityContainerRef = useRef<HTMLDivElement>(null);
  const [densityPillStyle, setDensityPillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  const viewModeContainerRef = useRef<HTMLDivElement>(null);
  const [viewModePillStyle, setViewModePillStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (densityContainerRef.current) {
      const activeEl = densityContainerRef.current.querySelector<HTMLElement>(`[data-density-val="${density}"]`);
      if (activeEl) {
        const containerRect = densityContainerRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setDensityPillStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
          opacity: 1,
        });
      }
    }
  }, [density]);

  useLayoutEffect(() => {
    if (viewModeContainerRef.current) {
      const activeEl = viewModeContainerRef.current.querySelector<HTMLElement>(`[data-viewmode-val="${viewMode}"]`);
      if (activeEl) {
        const containerRect = viewModeContainerRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        setViewModePillStyle({
          left: activeRect.left - containerRect.left,
          width: activeRect.width,
          opacity: 1,
        });
      }
    }
  }, [viewMode]);

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 bg-pm-card p-4 rounded-xl border border-pm-border shadow-sm">
      {/* Search Input & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
        {/* Search Field */}
        <div className="relative min-w-[240px] max-w-md flex-1">
          <FormInput
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 text-xs py-2 border-pm-border focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-pm-secondary absolute left-3 top-2.5 pointer-events-none" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-pm-secondary hover:text-pm-text transition p-0.5 rounded-full"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {statusFilters.map((sf) => {
            const isActive = activeFilter === sf.key;
            return (
              <button
                key={sf.key}
                type="button"
                onClick={() => onFilterChange(sf.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold shadow-sm'
                    : 'pm-btn-neutral border-pm-border text-pm-secondary hover:text-pm-text'
                }`}
              >
                <span>{sf.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-pm-input text-pm-secondary'
                }`}>
                  {sf.count}
                </span>
              </button>
            );
          })}

          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition rounded-lg hover:bg-rose-500/10"
              title="Reset all active search and filter constraints"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: View Mode & Density Switchers + Primary Action Button */}
      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
        {/* Row Density Switcher with Auto-Expanding Dynamic Sliding Pill */}
        {density && onDensityChange && (
          <div ref={densityContainerRef} className="relative flex items-center bg-pm-input p-1 rounded-lg border border-pm-border" role="group" aria-label="Row density">
            <div
              className="absolute top-1 bottom-1 rounded bg-purple-600 shadow-sm transition-all duration-200 ease-out pointer-events-none"
              style={{
                left: `${densityPillStyle.left}px`,
                width: `${densityPillStyle.width}px`,
                opacity: densityPillStyle.opacity,
              }}
            />
            <button
              type="button"
              data-density-val="compact"
              aria-pressed={density === 'compact'}
              onClick={() => onDensityChange('compact')}
              className={`relative z-10 px-3 py-1 rounded text-[11px] font-bold transition-colors duration-200 select-none ${
                density === 'compact' ? 'text-white' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Compact High-Density Rows"
            >
              Compact
            </button>
            <button
              type="button"
              data-density-val="comfortable"
              aria-pressed={density === 'comfortable'}
              onClick={() => onDensityChange('comfortable')}
              className={`relative z-10 px-3 py-1 rounded text-[11px] font-bold transition-colors duration-200 select-none ${
                density === 'comfortable' ? 'text-white' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Comfortable Spacious Rows"
            >
              Comfortable
            </button>
          </div>
        )}

        {/* View Mode Switcher with Auto-Expanding Dynamic Sliding Pill */}
        {viewMode && onViewModeChange && (
          <div ref={viewModeContainerRef} className="relative flex items-center bg-pm-input p-1 rounded-lg border border-pm-border" role="group" aria-label="View mode">
            <div
              className="absolute top-1 bottom-1 rounded bg-purple-600 shadow-sm transition-all duration-200 ease-out pointer-events-none"
              style={{
                left: `${viewModePillStyle.left}px`,
                width: `${viewModePillStyle.width}px`,
                opacity: viewModePillStyle.opacity,
              }}
            />
            <button
              type="button"
              data-viewmode-val="table"
              aria-pressed={viewMode === 'table'}
              onClick={() => onViewModeChange('table')}
              className={`relative z-10 p-1.5 px-3 rounded-md text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 select-none ${
                viewMode === 'table' ? 'text-white' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              data-viewmode-val="grid"
              aria-pressed={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
              className={`relative z-10 p-1.5 px-3 rounded-md text-xs font-bold transition-colors duration-200 flex items-center gap-1.5 select-none ${
                viewMode === 'grid' ? 'text-white' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        )}

        {/* Primary Action Button */}
        {primaryAction && (
          <Button
            variant="primary"
            size="md"
            icon={primaryAction.icon}
            onClick={primaryAction.onClick}
            className="uppercase shrink-0"
          >
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};
