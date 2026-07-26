import React from 'react';

export interface SubTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface SubTabNavProps<T extends string = string> {
  tabs: SubTabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  className?: string;
}

export function SubTabNav<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}: SubTabNavProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-pm-card/80 border border-pm-border rounded-xl backdrop-blur-sm overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
              isActive
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-bold'
                : 'text-pm-secondary hover:text-pm-text hover:bg-pm-input/50'
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-pm-secondary'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white font-bold'
                    : 'bg-pm-input text-pm-secondary border border-pm-border'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
