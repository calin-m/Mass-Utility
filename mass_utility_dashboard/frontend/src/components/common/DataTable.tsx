// @Arch[UI_Components]
// @Description: Unified responsive data grid table container primitive with sticky headers, custom scrollbars, and elevation depth.

import React from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps {
  columns: ColumnDef[];
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  maxHeight?: string;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  sortKey,
  sortDir,
  onSort,
  maxHeight = 'max-h-[500px]',
  children,
  emptyState,
}) => {
  return (
    <div className={`border border-pm-border rounded-xl overflow-hidden bg-pm-input/30 ${maxHeight} overflow-y-auto relative pm-scrollbar shadow-inner`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead className="sticky top-0 bg-[var(--pm-card-bg)]/95 backdrop-blur z-10 shadow-sm border-b border-pm-border">
          <tr className="text-pm-text-secondary font-bold uppercase tracking-wider text-[0.7rem]">
            {columns.map((col) => {
              const isCurrentSort = sortKey === col.key;
              const alignClass = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
              return (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                  className={`px-4 py-3 ${alignClass} ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none hover:text-pm-text transition-colors' : ''
                  }`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{col.label}</span>
                    {col.sortable && (
                      <span className="text-[0.6rem]">
                        {isCurrentSort ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-pm-border/40">
          {children}
        </tbody>
      </table>
      {emptyState && <div className="p-6 text-center">{emptyState}</div>}
    </div>
  );
}
