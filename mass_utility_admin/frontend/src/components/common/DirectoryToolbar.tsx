// @Arch[DirectoryToolbar]
import React from 'react';
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

  return (
    <div
      role="toolbar"
      aria-label="Directory search and filter controls"
      className="bg-pm-card border border-pm-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4"
    >
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        {/* Search Bar Input */}
        <div className="relative flex-1 md:w-72">
          <FormInput
            type="text"
            icon={Search}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={searchTerm ? () => onSearchChange('') : undefined}
            aria-label={searchPlaceholder}
          />
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none" role="tablist" aria-label="Status filters">
          {statusFilters.map((sf) => {
            const isActive = activeFilter === sf.key;
            return (
              <button
                key={sf.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilterChange(sf.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-pm-input text-pm-secondary hover:text-pm-text hover:bg-pm-input/80'
                }`}
              >
                <span>{sf.label}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full ${isActive ? 'bg-purple-700 text-white' : 'bg-pm-card text-pm-secondary'}`}>
                  {sf.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && onClearFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onClearFilters}
            title="Clear active search and filter pills"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Right Controls: View Mode & Density Switchers + Primary Action Button */}
      <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end">
        {/* Row Density Switcher */}
        {density && onDensityChange && (
          <div className="flex items-center gap-0.5 bg-pm-input p-1 rounded-lg border border-pm-border" role="group" aria-label="Row density">
            <button
              type="button"
              aria-pressed={density === 'compact'}
              onClick={() => onDensityChange('compact')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                density === 'compact' ? 'bg-purple-600 text-white shadow-sm' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Compact High-Density Rows"
            >
              Compact
            </button>
            <button
              type="button"
              aria-pressed={density === 'comfortable'}
              onClick={() => onDensityChange('comfortable')}
              className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                density === 'comfortable' ? 'bg-purple-600 text-white shadow-sm' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Comfortable Spacious Rows"
            >
              Comfortable
            </button>
          </div>
        )}

        {viewMode && onViewModeChange && (
          <div className="flex items-center gap-1 bg-pm-input p-1 rounded-lg border border-pm-border" role="group" aria-label="View mode">
            <button
              type="button"
              aria-pressed={viewMode === 'table'}
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-purple-600 text-white shadow-sm' : 'text-pm-secondary hover:text-pm-text'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-purple-600 text-white shadow-sm' : 'text-pm-secondary hover:text-pm-text'
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
