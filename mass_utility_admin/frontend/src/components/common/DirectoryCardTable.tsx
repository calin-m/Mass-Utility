import React from 'react';

interface DirectoryCardTableProps {
  children: React.ReactNode;
  emptyState?: {
    isMessageVisible: boolean;
    message: string;
  };
  className?: string;
}

export const DirectoryCardTable: React.FC<DirectoryCardTableProps> = ({ children, emptyState, className = '' }) => {
  return (
    <div className={`bg-pm-card border border-pm-border rounded-xl shadow-sm overflow-hidden pm-card-elevation ${className}`}>
      {emptyState && emptyState.isMessageVisible ? (
        <div className="p-12 text-center text-pm-secondary font-medium">
          {emptyState.message}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );
};
