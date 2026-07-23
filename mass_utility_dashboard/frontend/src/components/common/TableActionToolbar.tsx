import React from 'react';

export interface ToolbarActionItem {
  key: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export interface TableActionToolbarProps {
  actions: ToolbarActionItem[];
  size?: 'sm' | 'md';
}

export const TableActionToolbar: React.FC<TableActionToolbarProps> = ({
  actions,
  size = 'sm'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  const getVariantClasses = (variant?: ToolbarActionItem['variant']) => {
    switch (variant) {
      case 'danger':
        return 'bg-pm-danger/10 text-pm-danger hover:bg-pm-danger/20 border-pm-danger/20';
      case 'warning':
        return 'bg-pm-warning/10 text-pm-warning hover:bg-pm-warning/20 border-pm-warning/20';
      case 'success':
        return 'bg-pm-success/10 text-pm-success hover:bg-pm-success/20 border-pm-success/20';
      case 'primary':
        return 'bg-pm-primary/10 text-pm-primary hover:bg-pm-primary/20 border-pm-primary/20';
      case 'secondary':
      default:
        return 'bg-pm-card-bg/60 text-pm-text-primary hover:bg-pm-border/40 border-pm-border';
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      {actions.map((act) => (
        <button
          key={act.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            act.onClick();
          }}
          disabled={act.disabled}
          title={act.title || act.label}
          className={`inline-flex items-center gap-1 font-medium border rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${getVariantClasses(act.variant)}`}
        >
          {act.icon && <span>{act.icon}</span>}
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
};
