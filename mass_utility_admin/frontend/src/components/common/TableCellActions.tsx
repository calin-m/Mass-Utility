import React from 'react';
import { Eye, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface TableCellActionsProps {
  onInspect?: () => void;
  inspectLabel?: string;
  isSuspended?: boolean;
  onToggleSuspend?: () => void;
  suspendLoading?: boolean;
  onDelete?: () => void;
  deleteLoading?: boolean;
}

export const TableCellActions: React.FC<TableCellActionsProps> = ({
  onInspect,
  inspectLabel = 'Inspect',
  isSuspended,
  onToggleSuspend,
  suspendLoading = false,
  onDelete,
  deleteLoading = false,
}) => {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {onInspect && (
        <Button
          variant="neutral"
          size="sm"
          icon={Eye}
          onClick={onInspect}
        >
          {inspectLabel}
        </Button>
      )}

      {onToggleSuspend && (
        <Button
          variant={isSuspended ? 'success' : 'warning'}
          size="sm"
          icon={isSuspended ? ShieldCheck : ShieldAlert}
          onClick={onToggleSuspend}
          loading={suspendLoading}
          title={isSuspended ? 'Activate Account' : 'Suspend Account'}
        >
          {isSuspended ? 'Activate' : 'Suspend'}
        </Button>
      )}

      {onDelete && (
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          onClick={onDelete}
          loading={deleteLoading}
        >
          Delete
        </Button>
      )}
    </div>
  );
};
