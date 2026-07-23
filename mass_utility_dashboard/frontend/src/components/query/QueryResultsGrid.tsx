// @Arch[UI_Components]
// @Description: Sub-component rendering preview result samples, SQL code inspection, and AST sentence explanation.

import React from 'react';

interface QueryResultsGridProps {
  previewCount: number | null;
  previewSql: string;
  previewSamples: string;
  liveExplanation?: React.ReactNode;
  showStep2: boolean;
  onProceedToStep2: () => void;
}

export const QueryResultsGrid: React.FC<QueryResultsGridProps> = ({
  previewCount,
  previewSql,
  previewSamples,
  liveExplanation,
  showStep2,
  onProceedToStep2,
}) => {
  if (previewCount === null && !previewSql) return null;

  return (
    <div className="bg-[var(--pm-card-bg)] border border-[var(--pm-border-color)] rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex justify-between items-center border-b border-[var(--pm-border-color)] pb-4 flex-wrap gap-4">
        <div>
          <span className="text-[0.65rem] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Step 1 Pre-Flight Result</span>
          <h3 className="text-sm font-bold text-[var(--pm-text-primary)] uppercase flex items-center gap-2">
            Target Match Scope: <span className="font-mono text-emerald-400 font-extrabold text-base">{previewCount} Products Found</span>
          </h3>
        </div>

        {!showStep2 && (
          <button
            type="button"
            onClick={onProceedToStep2}
            className="pm-btn pm-btn-success text-xs font-bold px-5 py-2.5 rounded-lg transition uppercase tracking-wider flex items-center gap-2 shadow-lg hover:-translate-y-[1px] active:translate-y-0 cursor-pointer"
          >
            <span>Proceed to Step 2: Configure Actions</span>
            <span>➔</span>
          </button>
        )}
      </div>

      {/* Compiled SQL Query string */}
      {previewSql && (
        <div className="space-y-2">
          <span className="text-[0.65rem] font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider">Compiled Prepared SQL Query</span>
          <pre className="bg-[var(--pm-body-bg)]/80 text-[0.7rem] text-[#8b5cf6] p-4 rounded-xl font-mono border border-[var(--pm-border-color)] overflow-x-auto whitespace-pre-wrap">
            {previewSql}
          </pre>
        </div>
      )}

      {/* Live explanation */}
      {liveExplanation && (
        <div className="text-xs text-[var(--pm-text-secondary)] bg-[var(--pm-body-bg)]/50 p-3 rounded-lg border border-[var(--pm-border-color)] italic flex items-center gap-1.5">
          <span>💡</span>
          <div>{liveExplanation}</div>
        </div>
      )}

      {/* Sample matching preview products list */}
      {previewSamples && (
        <div className="space-y-2">
          <span className="text-[0.65rem] font-bold text-[var(--pm-text-secondary)] uppercase tracking-wider">Sample Matching Products (First 10 Matches)</span>
          <div className="bg-[var(--pm-body-bg)]/80 p-4 rounded-xl font-mono text-[0.7rem] text-[var(--pm-text-primary)] border border-[var(--pm-border-color)] max-h-48 overflow-y-auto whitespace-pre-wrap">
            {previewSamples}
          </div>
        </div>
      )}
    </div>
  );
};
