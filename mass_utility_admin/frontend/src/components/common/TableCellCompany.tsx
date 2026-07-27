// @Arch[TableCellCompany]
import React from 'react';
import { Building2 } from 'lucide-react';

interface TableCellCompanyProps {
  companyName?: string | null;
  onClick?: () => void;
  fallbackText?: string;
}

export const TableCellCompany: React.FC<TableCellCompanyProps> = ({
  companyName,
  onClick,
  fallbackText = 'Standalone',
}) => {
  if (!companyName) {
    return <span className="text-pm-secondary/70 italic text-[11px] font-mono">{fallbackText}</span>;
  }

  return (
    <div className="flex items-center gap-1.5 text-purple-400">
      <Building2 className="w-3.5 h-3.5 shrink-0" />
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="hover:underline font-bold text-purple-400 text-left truncate max-w-[160px] cursor-pointer"
          title={`Inspect Company Profile (${companyName})`}
        >
          {companyName}
        </button>
      ) : (
        <span className="font-bold text-pm-text truncate max-w-[160px]">{companyName}</span>
      )}
    </div>
  );
};
