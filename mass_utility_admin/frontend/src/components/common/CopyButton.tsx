// @Arch[CopyButton]
import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  value: string;
  label?: string;
  copiedLabel?: string;
  onCopied?: () => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  copiedLabel = 'Copied!',
  variant = 'neutral',
  size = 'sm',
  className = '',
  onCopied,
  ...props
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (onCopied) onCopied();

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button
      type="button"
      variant={copied ? 'success' : variant}
      size={size}
      icon={copied ? Check : Copy}
      onClick={handleCopy}
      className={`transition-all duration-200 ${className}`}
      {...props}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
};
