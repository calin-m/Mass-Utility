// @Arch[UI_Components]
// @Description: Unified table cell primitive component for single-line plain text, numbers, tax IDs, URLs, and dates supporting monospaced text-xs styling and optional right action buttons.

import React from 'react';

interface TableCellTextProps {
  text?: string | number | null;
  fallbackText?: string;
  mono?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export const TableCellText: React.FC<TableCellTextProps> = ({
  text,
  fallbackText,
  mono = true,
  rightAction,
  className = '',
}) => {
  if (text === undefined || text === null || text === '') {
    return fallbackText ? <span className="italic text-pm-secondary/70">{fallbackText}</span> : null;
  }

  return (
    <div className={`flex items-center gap-1.5 align-middle whitespace-nowrap ${className}`}>
      <span className={`${mono ? 'font-mono' : ''} text-[0.72rem] text-pm-secondary font-medium`}>
        {text}
      </span>
      {rightAction}
    </div>
  );
};
