// @Arch[DirectoryCardTable]
import React from 'react';

export interface TableHeaderColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface DirectoryCardTableProps<T> {
  headers: TableHeaderColumn[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  renderRow: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
}

export function DirectoryCardTable<T>({
  headers,
  data,
  keyExtractor,
  renderRow,
  emptyMessage = 'No items found matching the current search & filter query.',
  loading = false,
}: DirectoryCardTableProps<T>) {
  return (
    <div className="bg-pm-card border border-pm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`p-3 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : ''}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pm-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="h-[49px] animate-pulse bg-pm-input/20">
                  <td colSpan={headers.length} className="p-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pm-input/60 shrink-0" />
                        <div className="space-y-1">
                          <div className="w-32 h-3 bg-pm-input/70 rounded" />
                          <div className="w-20 h-2 bg-pm-input/50 rounded" />
                        </div>
                      </div>
                      <div className="w-24 h-6 bg-pm-input/50 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="p-8 text-center text-pm-secondary italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <React.Fragment key={keyExtractor(item, index)}>{renderRow(item, index)}</React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
