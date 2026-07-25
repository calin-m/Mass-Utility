import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
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
  const { t } = useTranslation();
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="bg-pm-card border-t border-pm-border px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      {/* Left: Page Size Selector & Counter */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="text-pm-secondary font-bold text-[11px] uppercase">{t('page_size')}:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="bg-pm-input border border-pm-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-pm-text focus:outline-none focus:border-pm-primary transition"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="text-pm-secondary font-mono text-[11px]">
          {t('page_showing')} <strong className="text-pm-text font-bold">{startItem} - {endItem}</strong> {t('page_of')}{' '}
          <strong className="text-pm-text font-bold">{totalItems}</strong>
        </div>
      </div>

      {/* Right: Previous / Next Navigation Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-pm-border text-xs font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-pm-input hover:bg-pm-card text-pm-text"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>{t('page_previous')}</span>
        </button>

        <span className="px-3 py-1 text-xs font-mono font-extrabold text-pm-text">
          {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-pm-border text-xs font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed bg-pm-input hover:bg-pm-card text-pm-text"
        >
          <span>{t('page_next')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
