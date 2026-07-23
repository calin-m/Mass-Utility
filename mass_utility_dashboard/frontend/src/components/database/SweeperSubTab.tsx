// @Arch[UI_Components]
// @Description: Sub-tab component managing visitor log sweeper, abandoned carts purger, and image bloat cleanup.

import React, { MutableRefObject } from 'react';
import { LogTerminal } from '../common/LogTerminal';

export interface SweeperStats {
  success: boolean;
  stats: {
    connections: number;
    connections_page: number;
    connections_source: number;
    guests: number;
    total: number;
  };
  carts: {
    carts: number;
    cart_products: number;
    cart_rules: number;
    total: number;
  };
}

interface SweeperSubTabProps {
  retentionDays: string;
  sweeperStats: SweeperStats | null;
  orphanedImages: any[];
  orphanedImagesTotalCount: number;
  orphanedImagesSizePretty: string;
  isScanningSweeper: boolean;
  purgeStats: boolean;
  purgeCarts: boolean;
  purgeImages: boolean;
  isSweeperRunning: boolean;
  sweeperProgressPercent: number;
  sweeperProgressText: string;
  sweeperConsole: string;
  sweeperAbortedRef: MutableRefObject<boolean>;
  onRetentionDaysChange: (days: string) => void;
  onSweeperScan: () => void;
  onExecuteSweeper: () => void;
  onPurgeStatsChange: (purge: boolean) => void;
  onPurgeCartsChange: (purge: boolean) => void;
  onPurgeImagesChange: (purge: boolean) => void;
}

export const SweeperSubTab: React.FC<SweeperSubTabProps> = ({
  retentionDays,
  sweeperStats,
  orphanedImages,
  orphanedImagesTotalCount,
  orphanedImagesSizePretty,
  isScanningSweeper,
  purgeStats,
  purgeCarts,
  purgeImages,
  isSweeperRunning,
  sweeperProgressPercent,
  sweeperProgressText,
  sweeperConsole,
  sweeperAbortedRef,
  onRetentionDaysChange,
  onSweeperScan,
  onExecuteSweeper,
  onPurgeStatsChange,
  onPurgeCartsChange,
  onPurgeImagesChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-pm-primary rounded-full animate-pulse"></span>
            <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">Database Cleanup Sweeper</h3>
          </div>
        </div>

        <div className="bg-[var(--pm-body-bg)]/30 border border-[var(--pm-border-color)] rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-[var(--pm-text-secondary)] uppercase font-bold">Retention Bounds:</span>
            <select
              value={retentionDays}
              onChange={(e) => onRetentionDaysChange(e.target.value)}
              className="bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-xs text-[var(--pm-text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="30">Older than 30 Days (Recommended)</option>
              <option value="90">Older than 90 Days</option>
              <option value="180">Older than 180 Days</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onSweeperScan}
            disabled={isScanningSweeper}
            className="pm-btn bg-pm-primary hover:opacity-90 text-white px-4 py-2 rounded-lg text-xs font-bold transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
          >
            {isScanningSweeper ? 'Scanning...' : '🔍 Pre-Flight Scan'}
          </button>
        </div>
      </div>

      {sweeperStats && (
        <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-5">
          <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">Reclaimable Bloat Summary</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Visitor Log Bloat */}
            <div className="bg-[var(--pm-body-bg)]/30 border border-[var(--pm-border-color)] p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-[var(--pm-text-primary)] text-xs uppercase flex items-center gap-2">
                <span>📉</span> visitor logs
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Connections:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.stats.connections.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Page views:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.stats.connections_page.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Guest records:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.stats.guests.toLocaleString()}</span>
                </div>
                <hr className="border-[var(--pm-border-color)] my-1" />
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--pm-text-secondary)]">Total stats:</span>
                  <span className="text-purple-700 dark:text-purple-400">{sweeperStats.stats.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Cart Bloat */}
            <div className="bg-[var(--pm-body-bg)]/30 border border-[var(--pm-border-color)] p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-[var(--pm-text-primary)] text-xs uppercase flex items-center gap-2">
                <span>🛒</span> Abandoned Carts
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Carts log:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.carts.carts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Carts products:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.carts.cart_products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Applied rules:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{sweeperStats.carts.cart_rules.toLocaleString()}</span>
                </div>
                <hr className="border-[var(--pm-border-color)] my-1" />
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--pm-text-secondary)]">Total Carts:</span>
                  <span className="text-purple-700 dark:text-purple-400">{sweeperStats.carts.total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Image Bloat */}
            <div className="bg-[var(--pm-body-bg)]/30 border border-[var(--pm-border-color)] p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-[var(--pm-text-primary)] text-xs uppercase flex items-center gap-2">
                <span>🖼️</span> Orphaned Images
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Scanned files:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{orphanedImagesTotalCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--pm-text-secondary)]">Orphans found:</span>
                  <span className="font-semibold text-[var(--pm-text-primary)]">{orphanedImages.length.toLocaleString()}</span>
                </div>
                <hr className="border-[var(--pm-border-color)] my-1" />
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--pm-text-secondary)]">Reclaimable:</span>
                  <span className="text-purple-700 dark:text-purple-400">{orphanedImagesSizePretty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sweep Purge Actions */}
          <div className="bg-rose-500/5 border border-rose-500/20 p-5 rounded-xl space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <h4 className="text-xs font-bold text-[var(--pm-text-primary)] uppercase">Execute Clean Sweep Operations</h4>
                <p className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-1">Chunked deletes of 5,000 rows prevent server timeout limits.</p>
              </div>
              <button
                type="button"
                onClick={onExecuteSweeper}
                disabled={isSweeperRunning}
                className="pm-btn pm-btn-danger text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
              >
                💥 Execute Sweeper
              </button>
            </div>

            <div className="flex gap-4 text-xs flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--pm-text-secondary)]">
                <input
                  type="checkbox"
                  checked={purgeStats}
                  onChange={(e) => onPurgeStatsChange(e.target.checked)}
                  className="rounded bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] text-rose-500"
                />
                visitor statistics ({sweeperStats.stats.total.toLocaleString()} rows)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[var(--pm-text-secondary)]">
                <input
                  type="checkbox"
                  checked={purgeCarts}
                  onChange={(e) => onPurgeCartsChange(e.target.checked)}
                  className="rounded bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] text-rose-500"
                />
                Abandoned Carts ({sweeperStats.carts.total.toLocaleString()} rows)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[var(--pm-text-secondary)]">
                <input
                  type="checkbox"
                  checked={purgeImages}
                  onChange={(e) => onPurgeImagesChange(e.target.checked)}
                  className="rounded bg-[var(--pm-body-bg)] border-[var(--pm-border-color)] text-rose-500"
                />
                Orphaned Images ({orphanedImages.length.toLocaleString()} files)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Sweeper Active Progress card */}
      {isSweeperRunning && (
        <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3">
            <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase flex items-center gap-2">
              <span>🧹</span> database clean sweep in progress
            </h3>
            <button
              type="button"
              onClick={() => {
                sweeperAbortedRef.current = true;
              }}
              className="pm-btn pm-btn-danger text-xs font-bold px-3.5 py-1.5 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
            >
              🛑 Abort Operation
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[var(--pm-text-secondary)]">
              <span>{sweeperProgressText}</span>
              <span>{sweeperProgressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--pm-body-bg)]/80 rounded-full overflow-hidden border border-[var(--pm-border-color)]">
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${sweeperProgressPercent}%` }}
              ></div>
            </div>
          </div>

          <LogTerminal
            logs={sweeperConsole}
            title="Console Output Log"
            maxHeight="150px"
          />
        </div>
      )}
    </div>
  );
};
