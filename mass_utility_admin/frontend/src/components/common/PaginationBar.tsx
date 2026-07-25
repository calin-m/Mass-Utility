import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-pm-card border-t border-pm-border text-xs text-pm-secondary">
      {/* Page Size & Counter Info */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 bg-pm-input border border-pm-border rounded-lg px-2 text-xs font-bold text-pm-text focus:outline-none focus:border-pm-primary transition cursor-pointer"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size} className="bg-pm-card text-pm-text">
                {size}
              </option>
            ))}
          </select>
          <span>entries per page</span>
        </div>

        <span className="font-mono text-[11px] font-semibold text-pm-secondary">
          Showing <strong className="text-pm-text">{startItem}</strong> - <strong className="text-pm-text">{endItem}</strong> of <strong className="text-pm-text">{totalItems}</strong>
        </span>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`px-3 py-1.5 rounded-lg border border-pm-border text-xs font-bold transition flex items-center gap-1 ${
            currentPage <= 1
              ? 'opacity-40 cursor-not-allowed bg-pm-input'
              : 'bg-pm-input hover:bg-pm-card hover:border-pm-primary text-pm-text'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="px-3 py-1 bg-pm-input/50 rounded-lg border border-pm-border font-mono font-bold text-[11px] text-pm-text">
          {currentPage} / {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`px-3 py-1.5 rounded-lg border border-pm-border text-xs font-bold transition flex items-center gap-1 ${
            currentPage >= totalPages
              ? 'opacity-40 cursor-not-allowed bg-pm-input'
              : 'bg-pm-input hover:bg-pm-card hover:border-pm-primary text-pm-text'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
