// @Arch[UI_Components]
// @Description: Sub-tab component managing InnoDB table health profiler, space overhead metrics, and OPTIMIZE TABLE execution controls.

import React from 'react';
import { SearchFilterBar } from '../common/SearchFilterBar';

export interface TableMetric {
  name: string;
  engine: string;
  rows: number;
  size_pretty: string;
  overhead_pretty: string;
  overhead_bytes: number;
  fragmentation_ratio: string;
}

export interface ProfilerReport {
  grade: string;
  grade_label: string;
  total_free_pretty: string;
  fragmentation_ratio_avg: string;
  tables_count: number;
  tables: TableMetric[];
}

interface ProfilerSubTabProps {
  profilerReport: ProfilerReport | null;
  isProfiling: boolean;
  profilerSearch: string;
  isBulkOptimizing: boolean;
  bulkOptimizeProgress: string;
  onFetchProfilerReport: () => void;
  onProfilerSearchChange: (search: string) => void;
  onOptimizeAllTables: () => void;
  onOptimizeTable: (tableName: string) => void;
}

export const ProfilerSubTab: React.FC<ProfilerSubTabProps> = ({
  profilerReport,
  isProfiling,
  profilerSearch,
  isBulkOptimizing,
  bulkOptimizeProgress,
  onFetchProfilerReport,
  onProfilerSearchChange,
  onOptimizeAllTables,
  onOptimizeTable,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">Automated Database Profiler &amp; Space Optimizer</h3>
          </div>
          <button
            type="button"
            onClick={onFetchProfilerReport}
            disabled={isProfiling}
            className="pm-btn pm-btn-success text-xs font-bold px-4 py-2 rounded-lg transition uppercase tracking-wider hover:-translate-y-[1px] active:translate-y-0"
          >
            {isProfiling ? 'Analyzing...' : 'Refresh Profile'}
          </button>
        </div>
        <p className="text-xs text-[var(--pm-text-secondary)] leading-relaxed">
          Scans all tables in real-time to compute index fragmentation and disk overhead which slows down transactions.
        </p>
      </div>

      {isProfiling && !profilerReport && (
        <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-8 shadow-xl text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[var(--pm-text-secondary)] font-bold uppercase tracking-wider">Analyzing database index fragmentation and disk overhead...</p>
        </div>
      )}

      {profilerReport && (
        <>
          {/* Zero Fragmentation Success Banner */}
          {profilerReport.tables.length === 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-5 flex items-center gap-4">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="text-xs font-bold text-[var(--pm-text-primary)] uppercase">No Fragmentation Detected</h4>
                <p className="text-xs text-[var(--pm-text-secondary)] mt-0.5">
                  All PrestaShop core tables are fully optimized! Health grade:{' '}
                  <strong className="text-emerald-500">{profilerReport.grade}</strong>
                </p>
              </div>
            </div>
          )}

          {/* Health Cards scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-lg text-center flex flex-col justify-center items-center">
              <span className="text-[0.65rem] font-bold text-[var(--pm-text-secondary)] uppercase tracking-widest block mb-2">Health Grade</span>
              <div className="text-4xl font-black text-emerald-500 font-sans leading-none">{profilerReport.grade}</div>
              <span className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-2">{profilerReport.grade_label}</span>
            </div>

            <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[0.65rem] font-bold text-[var(--pm-text-secondary)] uppercase tracking-widest block mb-2">Overallocated Space</span>
                <div className="text-2xl font-bold text-[var(--pm-text-primary)] font-mono">{profilerReport.total_free_pretty}</div>
              </div>
              <span className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-2">Can be reclaimed immediately</span>
            </div>

            <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-[0.65rem] font-bold text-[var(--pm-text-secondary)] uppercase tracking-widest block mb-2">Average Fragmentation</span>
                <div className="text-2xl font-bold text-[var(--pm-text-primary)] font-mono">{profilerReport.fragmentation_ratio_avg}</div>
              </div>
              <span className="text-[0.65rem] text-[var(--pm-text-secondary)] mt-2">{profilerReport.tables_count} monitored tables</span>
            </div>
          </div>

          {/* Table fragmentation grid */}
          <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-[var(--pm-border-color)] pb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold tracking-wide text-[var(--pm-text-primary)] uppercase">Table Fragmentation details</h3>
                <span className="text-[10px] bg-[var(--pm-body-bg)] border border-[var(--pm-border-color)] text-[var(--pm-text-secondary)] px-2 py-0.5 rounded-full font-mono">
                  {profilerReport.tables.length} Fragmented
                </span>
              </div>

              <SearchFilterBar
                searchValue={profilerSearch}
                onSearchChange={onProfilerSearchChange}
                placeholder="Search table by name..."
                extraActions={
                  profilerReport.tables.length > 0 ? (
                    <button
                      type="button"
                      disabled={isBulkOptimizing}
                      onClick={onOptimizeAllTables}
                      className="pm-btn pm-btn-success text-xs font-bold px-4 py-1.5 rounded-lg transition uppercase flex items-center gap-2"
                    >
                      {isBulkOptimizing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          {bulkOptimizeProgress || 'Optimizing All...'}
                        </>
                      ) : (
                        '⚡ Optimize All Tables'
                      )}
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--pm-border-color)]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[var(--pm-body-bg)]/50 text-[var(--pm-text-secondary)] uppercase font-bold border-b border-[var(--pm-border-color)]">
                  <tr>
                    <th className="p-4">Table Name</th>
                    <th className="p-4">Engine</th>
                    <th className="p-4">Rows</th>
                    <th className="p-4">Size</th>
                    <th className="p-4">Overhead</th>
                    <th className="p-4">Frag %</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--pm-border-color)]">
                  {profilerReport.tables
                    .filter((t) => !profilerSearch || t.name.toLowerCase().includes(profilerSearch.toLowerCase()))
                    .map((t) => (
                      <tr key={t.name} className="hover:bg-[var(--pm-body-bg)]/30 transition">
                        <td className="p-4 font-mono font-semibold text-[var(--pm-text-primary)]">{t.name}</td>
                        <td className="p-4 text-[var(--pm-text-secondary)]">{t.engine}</td>
                        <td className="p-4 text-[var(--pm-text-secondary)]">{t.rows.toLocaleString()}</td>
                        <td className="p-4 text-[var(--pm-text-secondary)]">{t.size_pretty}</td>
                        <td className="p-4 text-[var(--pm-text-secondary)]">{t.overhead_pretty}</td>
                        <td className="p-4 font-semibold text-[var(--pm-text-primary)]">{t.fragmentation_ratio}</td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            disabled={isBulkOptimizing}
                            onClick={() => onOptimizeTable(t.name)}
                            className="pm-btn pm-btn-success text-[0.7rem] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-30"
                          >
                            ⚡ Optimize
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
