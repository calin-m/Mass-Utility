// @Arch[UI_Components]
// @Description: Renders the Mutation History ledger grid. Implements searching, status badges, details drawer overlays, and interactive rollback/reapply confirmation workflows.
// @Calls: get_mutation_history, rollback_mutation, reapply_mutation, delete_mutation_job, clear_mutation_history

import React, { useState, useEffect } from 'react';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

interface HistoryJob {
  job_id: string;
  state: string;
  affected_count: number;
  actions: string;
  raw_payload: string;
  revert_payload: string;
  has_revert: boolean;
  errors: string;
  date: string;
}

export const MutationHistoryTab: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const [history, setHistory] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await FetchService.post('get_mutation_history');
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err: any) {
      showAlert('Failed to Fetch History', err.message || 'Could not query mutation ledger database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // Expose on window for components in other tabs
    (window as any)._pmFetchMutationHistory = fetchHistory;
    return () => {
      delete (window as any)._pmFetchMutationHistory;
    };
  }, []);

  const handleRollback = (job: HistoryJob) => {
    showConfirm(
      'Rollback Mutation Sequence',
      `Are you sure you want to rollback the changes applied by Job <strong>${job.job_id}</strong>?<br><br>This will revert values for <strong>${job.affected_count} products</strong> back to their original snapshot baseline values.`,
      'ROLLBACK',
      async () => {
        try {
          const data = await FetchService.post('rollback_mutation', { job_id: job.job_id });
          if (data.success) {
            showAlert('Rollback Completed', 'All affected rows rolled back successfully.', 'success');
            fetchHistory();
          }
        } catch (err: any) {
          showAlert('Rollback Failed', err.message || 'Operation aborted.', 'error');
        }
      }
    );
  };

  const handleReapply = (job: HistoryJob) => {
    showConfirm(
      'Re-apply Mutation Rules',
      `Are you sure you want to re-execute the mutation rules for Job <strong>${job.job_id}</strong>?`,
      'REAPPLY',
      async () => {
        try {
          const data = await FetchService.post('reapply_mutation', { job_id: job.job_id });
          if (data.success) {
            showAlert('Re-apply Completed', 'Mutation rules re-applied successfully.', 'success');
            fetchHistory();
          }
        } catch (err: any) {
          showAlert('Re-apply Failed', err.message || 'Operation aborted.', 'error');
        }
      }
    );
  };

  const handleDeleteJob = (job: HistoryJob) => {
    showConfirm(
      'Permanently Delete Ledger Entry',
      `Are you sure you want to permanently erase the ledger transaction for <strong>${job.job_id}</strong>?<br><br><strong>Warning:</strong> This does not undo any database modifications, but deletes the reversion metadata from the disk.`,
      'DELETE',
      async () => {
        try {
          const data = await FetchService.post('delete_mutation_job', { job_id: job.job_id });
          if (data.success) {
            showAlert('Ledger Erazed', 'Historical ledger entry permanently deleted.', 'info');
            fetchHistory();
          }
        } catch (err: any) {
          showAlert('Deletion Failed', err.message || 'Operation aborted.', 'error');
        }
      }
    );
  };

  const handleClearAllHistory = () => {
    showConfirm(
      'Clear Complete Mutation Ledger',
      'Are you sure you want to permanently delete all mutation history logs from the SQLite database? This cannot be undone.',
      'CLEAR ALL',
      async () => {
        try {
          const data = await FetchService.post('clear_mutation_history');
          if (data.success) {
            showAlert('Ledger Cleared', 'All mutation history was erased successfully.', 'info');
            fetchHistory();
          }
        } catch (err: any) {
          showAlert('Clear Failed', err.message || 'Operation aborted.', 'error');
        }
      }
    );
  };

  const handleDownloadGzip = (jobId: string) => {
    // If PrestaShop controller environment is active
    if (window.location.href.includes('controller=')) {
      window.location.href = window.location.href + '&ajax=1&action=download_mutation_gzip&job_id=' + encodeURIComponent(jobId);
    } else {
      // In Standalone mock/dev environment
      showAlert(
        'Download Mock Gzip',
        `Standalone Dev Mode: Downloading mutation backup bundle for Job: <strong>${jobId}</strong>.<br><br>In production, this triggers a stream response to save the gzip package.`,
        'success'
      );
    }
  };

  // Filtered dataset
  const filteredHistory = history.filter(job => {
    const matchesSearch =
      job.job_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.actions.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'SUCCESS' && job.state === 'SUCCESS') ||
      (statusFilter === 'ROLLED_BACK' && job.state === 'ROLLED_BACK') ||
      (statusFilter === 'FAILED' && job.state.toLowerCase().includes('fail'));

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (state: string) => {
    const s = state.toUpperCase();
    if (s === 'SUCCESS') {
      return (
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          Success
        </span>
      );
    } else if (s === 'ROLLED_BACK') {
      return (
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          Rolled Back
        </span>
      );
    } else {
      return (
        <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
          {state}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-white/[0.06] pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-lg">⏳</div>
          <div>
            <h2 className="text-md font-bold tracking-wide text-white uppercase">Mutation History Ledger</h2>
            <p className="text-xs text-gray-400 mt-0.5">Track, audit, roll back, or reapply visual AST mutations dynamically</p>
          </div>
        </div>

        <button
          onClick={handleClearAllHistory}
          disabled={history.length === 0}
          className="bg-red-950/20 border border-red-900/30 hover:bg-red-900/10 text-red-400 text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-30 uppercase"
        >
          🗑️ Clear Ledger
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-4 bg-[#12121a] border border-white/[0.08] p-4 rounded-xl items-center justify-between shadow-md">
        <div className="flex items-center gap-3 flex-grow max-w-md">
          <span className="text-xs text-gray-400 font-bold uppercase">Search:</span>
          <input
            type="text"
            placeholder="Search by Job ID or Actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/[0.08] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#8b5cf6]/50"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-bold uppercase">Status Filter:</span>
          <div className="flex bg-black/20 border border-white/[0.08] p-1 rounded-lg">
            {['ALL', 'SUCCESS', 'ROLLED_BACK', 'FAILED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-md uppercase transition ${
                  statusFilter === st ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Ledger Table */}
      <div className="bg-[#12121a] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-black/10 text-[10px] text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Execution Date</th>
                <th className="px-6 py-4 font-bold">Job ID</th>
                <th className="px-6 py-4 font-bold">Targeted Mutation Actions</th>
                <th className="px-6 py-4 font-bold text-center">Affected Rows</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></span>
                      Fetching ledger records from SQLite database...
                    </div>
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    No matching ledger entries found.
                  </td>
                </tr>
              ) : (
                filteredHistory.map(job => (
                  <tr key={job.job_id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                      {job.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-white text-[11px] font-bold">
                      {job.job_id}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-medium text-gray-300">
                      {job.actions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-white font-mono">
                      {job.affected_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(job.state)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="pm-btn pm-btn-sm bg-gray-800 hover:bg-gray-700 text-white font-bold px-2 py-1 rounded text-[10px] uppercase"
                          title="View Payload details"
                        >
                          👁️ View
                        </button>
                        
                        {job.has_revert && job.state !== 'ROLLED_BACK' && (
                          <button
                            onClick={() => handleRollback(job)}
                            className="pm-btn pm-btn-sm bg-red-600 hover:bg-red-500 text-white font-bold px-2 py-1 rounded text-[10px] uppercase animate-pulse"
                            title="Rollback Changes"
                          >
                            🔄 Revert
                          </button>
                        )}

                        {job.state === 'ROLLED_BACK' && (
                          <button
                            onClick={() => handleReapply(job)}
                            className="pm-btn pm-btn-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-[10px] uppercase"
                            title="Re-apply changes"
                          >
                            🔄 Reapply
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadGzip(job.job_id)}
                          className="pm-btn pm-btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded text-[10px] uppercase"
                          title="Download Backup Gzip"
                        >
                          📥 Download
                        </button>

                        <button
                          onClick={() => handleDeleteJob(job)}
                          className="pm-btn pm-btn-sm bg-red-950/20 border border-red-900/30 hover:bg-red-900/10 text-red-400 font-bold px-2 py-1 rounded text-[10px]"
                          title="Delete Ledger entry"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Job Overlay Modal Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-[99999]">
          <div className="bg-[#12121a] text-white border border-white/[0.08] rounded-2xl p-6 shadow-2xl w-full max-w-3xl mx-4 relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 mb-4 flex-shrink-0">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Ledger Payload Audit Details: {selectedJob.job_id}
              </h2>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block uppercase">Date Created:</span>
                  <span className="font-mono text-gray-200">{selectedJob.date}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block uppercase">State:</span>
                  <span>{getStatusBadge(selectedJob.state)}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-400 block uppercase mb-1">Actions String</span>
                <div className="bg-black/20 border border-white/[0.08] p-3 rounded-lg text-xs font-mono text-gray-200">
                  {selectedJob.actions}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-gray-400 block uppercase mb-1">AST Query Parameters (JSON)</span>
                <pre className="bg-[#05070f] border border-white/[0.06] p-3 rounded-lg text-xs text-blue-400 overflow-x-auto select-all max-h-40">
                  {JSON.stringify(JSON.parse(selectedJob.raw_payload), null, 2)}
                </pre>
              </div>

              {selectedJob.revert_payload && (
                <div>
                  <span className="text-xs font-bold text-gray-400 block uppercase mb-1">Reversion Backups Map (JSON)</span>
                  <pre className="bg-[#05070f] border border-white/[0.06] p-3 rounded-lg text-xs text-emerald-400 overflow-x-auto select-all max-h-40">
                    {JSON.stringify(JSON.parse(selectedJob.revert_payload), null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.errors && (
                <div>
                  <span className="text-xs font-bold text-red-400 block uppercase mb-1">Execution Errors</span>
                  <pre className="bg-red-950/10 border border-red-900/20 p-3 rounded-lg text-xs text-red-300 overflow-x-auto">
                    {selectedJob.errors}
                  </pre>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] pt-4 mt-4 flex justify-end flex-shrink-0">
              <button
                onClick={() => setSelectedJob(null)}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
