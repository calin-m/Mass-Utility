// @Arch[SubTabNav]
import React, { useState, useRef, useLayoutEffect } from 'react';

export interface SubTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface SubTabNavProps<T extends string = string> {
  tabs: SubTabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  className?: string;
  rightContent?: React.ReactNode;
}

export function SubTabNav<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  rightContent,
}: SubTabNavProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updatePill = () => {
      if (!containerRef.current) return;
      const activeEl = containerRef.current.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
      if (activeEl) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();

        setPillStyle({
          left: activeRect.left - containerRect.left + containerRef.current.scrollLeft,
          top: activeRect.top - containerRect.top + containerRef.current.scrollTop,
          width: activeRect.width,
          height: activeRect.height,
          opacity: 1,
        });

        // Enable smooth sliding transition after initial mount layout measurement
        if (!isAnimated) {
          requestAnimationFrame(() => {
            setIsAnimated(true);
          });
        }
      }
    };

    updatePill();

    // Attach scroll listener to keep pill pinned during horizontal scroll
    const containerEl = containerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', updatePill, { passive: true });
    }

    // Attach ResizeObserver for responsive window / font scaling safety
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerEl) {
      observer = new ResizeObserver(updatePill);
      observer.observe(containerEl);
    }

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('scroll', updatePill);
      }
      if (observer) observer.disconnect();
    };
  }, [activeTab, tabs]);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center gap-1.5 p-1.5 bg-pm-card/80 border border-pm-border rounded-xl backdrop-blur-sm overflow-x-auto ${className}`}
    >
      {/* Sliding GPU-Accelerated Purple Active Pill (0 CLS Initial Mount) */}
      <div
        className="absolute top-0 left-0 bg-gradient-to-r from-purple-500 to-purple-600 border border-purple-400/30 rounded-lg shadow-md shadow-purple-500/25 pointer-events-none z-0"
        style={{
          transform: `translate3d(${pillStyle.left}px, ${pillStyle.top}px, 0)`,
          width: `${pillStyle.width}px`,
          height: `${pillStyle.height}px`,
          opacity: pillStyle.opacity,
          transition: isAnimated
            ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1), height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease-out'
            : 'none',
        }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 h-9 inline-flex items-center gap-2 px-3.5 rounded-lg text-xs font-semibold transition-colors duration-200 whitespace-nowrap ${
              isActive
                ? 'text-white font-bold'
                : 'text-pm-secondary hover:text-pm-text hover:bg-pm-input/50'
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-pm-secondary'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full transition-colors duration-200 border ${
                  isActive
                    ? 'bg-white/20 text-white font-bold border-white/20'
                    : 'bg-pm-input text-pm-secondary border-pm-border'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}

      {rightContent && (
        <div className="ml-auto flex items-center gap-2 z-10 shrink-0 pl-2">
          {rightContent}
        </div>
      )}
    </div>
  );
}
