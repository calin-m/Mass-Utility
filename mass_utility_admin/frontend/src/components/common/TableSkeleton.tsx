// @Arch[TableSkeleton]
import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="w-full pm-card p-6 animate-pulse space-y-4" role="status" aria-label="Loading content">
      <div className="h-8 bg-slate-200 dark:bg-slate-700/50 rounded-lg w-1/3 mb-6" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 py-2 border-b border-slate-200 dark:border-slate-800">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-4 bg-slate-200 dark:bg-slate-700/40 rounded-md ${
                  cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/3' : 'flex-1'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
