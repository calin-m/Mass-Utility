// @Arch[StatSummaryGrid]
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { StatCard } from './StatCard';

export interface StatCardItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'purple' | 'emerald' | 'blue' | 'amber' | 'rose' | string;
}

export interface StatSummaryGridProps {
  cards: StatCardItem[];
  columns?: number;
}

export const StatSummaryGrid: React.FC<StatSummaryGridProps> = ({ cards }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((c, idx) => (
        <StatCard key={idx} label={c.label} value={c.value} icon={c.icon} color={c.color as any} />
      ))}
    </div>
  );
};
