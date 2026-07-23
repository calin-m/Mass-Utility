// @Arch[UI_Components]
// @Description: Sub-tab component managing InnoDB table health profiler, space overhead metrics, and OPTIMIZE TABLE execution controls.

import React, { useState, useMemo } from 'react';
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
  const [sortKey, setSortKey] = useState<'name' | 'engine' | 'rows' | 'size' | 'overhead_bytes' | 'frag'>('overhead_bytes');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: 'name' | 'engine' | 'rows' | 'size' | 'overhead_bytes' | 'frag') => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const parseSizeToBytes = (sizeStr?: string): number => {
    if (!sizeStr) return 0;
    const match = sizeStr.trim().match(/^([0-9.]+)\s*([a-zA-Z]+)?$/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();
    if (unit.startsWith('G')) return num * 1024 * 1024 * 1024;
    if (unit.startsWith('M')) return num * 1024 * 1024;
    if (unit.startsWith('K')) return num * 1024;
    return num;
  };

  const parseFragToRatio = (fragStr?: string): number => {
    if (!fragStr) return 0;
    return parseFloat(fragStr.replace('%', '')) || 0;
  };

  const filteredAndSortedTables = useMemo(() => {
    if (!profilerReport?.tables) return [];
    return profilerReport.tables
      .filter(t => !profilerSearch || t.name.toLowerCase().includes(profilerSearch.toLowerCase()))
      .sort((a, b) => {
        let res = 0;
        if (sortKey === 'name') {
          res = a.name.localeCompare(b.name);
        } else if (sortKey === 'engine') {
          res = a.engine.localeCompare(b.engine);
        } else if (sortKey === 'rows') {
          res = (a.rows || 0) - (b.rows || 0);
        } else if (sortKey === 'size') {
          res = parseSizeToBytes(a.size_pretty) - parseSizeToBytes(b.size_pretty);
        } else if (sortKey === 'overhead_bytes') {
          res = (a.overhead_bytes || parseSizeToBytes(a.overhead_pretty)) - (b.overhead_bytes || parseSizeToBytes(b.overhead_pretty));
        } else if (sortKey === 'frag') {
          res = parseFragToRatio(a.fragmentation_ratio) - parseFragToRatio(b.fragmentation_ratio);
        }
        return sortDir === 'asc' ? res : -res;
      });
  }, [profilerReport, profilerSearch, sortKey, sortDir]);

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

            <div className="border border-pm-border rounded-xl overflow-hidden bg-pm-input/30 max-h-[500px] overflow-y-auto relative">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--pm-card-bg)]/95 backdrop-blur z-10 shadow-sm border-b border-pm-border">
                  <tr className="text-pm-text-secondary uppercase font-bold text-[0.7rem]">
                    <th
                      onClick={() => handleSort('name')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Table Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('engine')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Engine {sortKey === 'engine' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('rows')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Rows {sortKey === 'rows' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('size')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Size {sortKey === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('overhead_bytes')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Overhead {sortKey === 'overhead_bytes' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th
                      onClick={() => handleSort('frag')}
                      className="px-6 py-3.5 cursor-pointer select-none hover:text-pm-primary transition-colors"
                    >
                      Frag % {sortKey === 'frag' ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                {filteredAndSortedTables.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-pm-text-secondary">
                        <div className="text-2xl animate-pulse mb-2">⏳</div>
                        <strong className="text-sm text-pm-text-secondary block mb-1">No Fragmented Tables Found</strong>
                        <span>All database tables are operating cleanly with zero fragmentation.</span>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y divide-pm-border">
                    {filteredAndSortedTables.map((t) => (
                      <tr key={t.name} className="even:bg-[var(--pm-body-bg)]/40 hover:bg-[var(--pm-input-bg)]/40 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-semibold text-pm-text">{t.name}</td>
                        <td className="px-6 py-3.5 text-pm-text-secondary">{t.engine}</td>
                        <td className="px-6 py-3.5 text-pm-text-secondary font-mono">{t.rows.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-pm-text-secondary font-mono">{t.size_pretty}</td>
                        <td className="px-6 py-3.5 text-pm-text-secondary font-mono">{t.overhead_pretty}</td>
                        <td className="px-6 py-3.5 font-semibold text-pm-text">{t.fragmentation_ratio}</td>
                        <td className="px-6 py-3.5 text-right">
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
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
