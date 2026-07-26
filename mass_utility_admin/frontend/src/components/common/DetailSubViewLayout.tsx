import React from 'react';
import { ChevronLeft, LucideIcon } from 'lucide-react';
import { DetailHeaderBanner } from './DetailHeaderBanner';
import { SubTabNav, SubTabItem } from './SubTabNav';

export interface DetailSubViewLayoutProps<T extends string = string> {
  backLabel: string;
  onBack: () => void;
  headerIcon: LucideIcon;
  headerTitle: string;
  headerTitleCode?: string;
  headerSubtitle?: string;
  headerBadges?: React.ReactNode;
  headerActions?: React.ReactNode;
  tabs: SubTabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  children: React.ReactNode;
}

export function DetailSubViewLayout<T extends string = string>({
  backLabel,
  onBack,
  headerIcon,
  headerTitle,
  headerTitleCode,
  headerSubtitle,
  headerBadges,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: DetailSubViewLayoutProps<T>) {
  return (
    <div className="space-y-6">
      {/* Back Button Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-pm-secondary hover:text-pm-text transition bg-pm-card border border-pm-border px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>

        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </div>

      {/* Detail Header Banner */}
      <DetailHeaderBanner
        icon={headerIcon}
        title={headerTitle}
        titleCode={headerTitleCode}
        subtitle={headerSubtitle}
        badges={headerBadges}
      />

      {/* Sub-Tab Navigation */}
      <SubTabNav tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

      {/* Active Sub-Tab Content Slot */}
      <div className="min-h-[520px]">{children}</div>
    </div>
  );
}
