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
    <div className="bg-pm-card border border-pm-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-pm-input text-pm-secondary uppercase font-bold border-b border-pm-border text-[10px]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  className={`p-3.5 ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : ''}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pm-border">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="p-8 text-center text-pm-secondary italic">
                  Loading directory records...
                </td>
              </tr>
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
