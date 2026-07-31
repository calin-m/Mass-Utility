// @Arch[BaseDrawer]
import React, { useState, useEffect } from 'react';
import { LucideIcon, X } from 'lucide-react';

interface BaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  width?: 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  children: React.ReactNode;
}

export const BaseDrawer: React.FC<BaseDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  width = 'xl',
  children
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
    }
  }, [isOpen]);

  const handleRequestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
  };

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    // When the drawer slide-out exit animation finishes, unmount immediately & notify parent
    if (isClosing && (e.animationName === 'drawerSlideOut' || e.animationName.includes('Out'))) {
      setShouldRender(false);
      setIsClosing(false);
      onClose();
    }
  };

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && shouldRender && !isClosing) {
        handleRequestClose();
      }
    };
    if (shouldRender) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, isClosing]);

  if (!shouldRender) return null;

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl'
  }[width];

  return (
    <div className={`fixed inset-0 top-0 left-0 w-full h-full bg-slate-950/60 dark:bg-slate-950/75 backdrop-blur-sm z-[9999999] flex justify-end ${isClosing ? 'pointer-events-none animate-backdrop-fade-out' : 'animate-backdrop-fade'}`}>
      {/* Backdrop overlay click handler */}
      <div className="absolute inset-0" onClick={handleRequestClose} />

      {/* Slide-In / Slide-Out Panel */}
      <div
        onAnimationEnd={handleAnimationEnd}
        className={`relative bg-pm-card border-l border-pm-border ${widthClasses} w-full h-full shadow-2xl flex flex-col justify-between z-10 ${isClosing ? 'animate-drawer-slide-out' : 'animate-drawer-slide'}`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-pm-border bg-pm-input/20 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-pm-text">{title}</h3>
              {subtitle && <p className="text-xs text-pm-secondary mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="p-1.5 rounded-lg text-pm-secondary hover:text-pm-text hover:bg-pm-input transition cursor-pointer"
            title="Close Drawer (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};
