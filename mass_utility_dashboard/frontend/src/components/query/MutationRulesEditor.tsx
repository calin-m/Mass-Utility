// @Arch[UI_Components]
// @Description: Sub-component managing mutation rule actions (SET, ADD, MULTIPLY) and execution pre-flight controls.

import React from 'react';
import { LogTerminal } from '../common/LogTerminal';

export interface MutationAction {
  id: string;
  field: string;
  type: 'SET' | 'ADD' | 'MULTIPLY';
  value: string;
  forceManualMode?: boolean;
}

interface MutationRulesEditorProps {
  mutationRules: MutationAction[];
  isExecuting: boolean;
  executingOffset: number | null;
  mutationLogs: string;
  showLogTerminal: boolean;
  onAddMutationRule: () => void;
  onRemoveMutationRule: (id: string) => void;
  onUpdateMutationRule: (id: string, updates: Partial<MutationAction>) => void;
  onExecuteMutations: () => void;
  onToggleLogTerminal: () => void;
}

export const MutationRulesEditor: React.FC<MutationRulesEditorProps> = ({
  mutationRules,
  isExecuting,
  executingOffset,
  mutationLogs,
  showLogTerminal,
  onAddMutationRule,
  onRemoveMutationRule,
  onUpdateMutationRule,
  onExecuteMutations,
  onToggleLogTerminal,
}) => {
  return (
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-6 border-l-4 border-l-rose-500">
      <div className="flex justify-between items-center border-b border-pm-border pb-3 flex-wrap gap-4">
        <div>
          <span className="text-[0.65rem] font-bold text-rose-500 uppercase tracking-widest block mb-1">Step 2 Batch Action Configurator</span>
          <h3 className="text-sm font-bold text-pm-text uppercase">Configure Target Mutations</h3>
        </div>

        <button
          type="button"
          onClick={onAddMutationRule}
          className="pm-btn pm-btn-neutral text-xs font-bold px-3 py-1.5 rounded-lg transition uppercase flex items-center gap-1 cursor-pointer"
        >
          <span>➕ Add Mutation Field</span>
        </button>
      </div>

      {/* List of mutation rules */}
      <div className="space-y-3">
        {mutationRules.map((rule) => {
          const isBoolean = rule.field === 'active' || rule.field === 'on_sale';
          return (
            <div key={rule.id} className="flex items-center gap-3 flex-wrap bg-pm-input/30 border border-pm-border p-3.5 rounded-xl">
              <select
                value={rule.field}
                onChange={(e) => {
                  const newField = e.target.value;
                  const isNewBool = newField === 'active' || newField === 'on_sale';
                  onUpdateMutationRule(rule.id, {
                    field: newField,
                    value: isNewBool ? '1' : '',
                    type: isNewBool ? 'SET' : rule.type,
                  });
                }}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50"
              >
                <option value="price">Product Base Price</option>
                <option value="wholesale_price">Wholesale / Cost Price</option>
                <option value="active">Active Status (1 / 0)</option>
                <option value="on_sale">On Sale Flag (1 / 0)</option>
                <option value="quantity">Available Quantity / Stock</option>
                <option value="id_manufacturer">Manufacturer ID</option>
                <option value="ecotax">Ecotax Amount</option>
                <option value="weight">Product Weight (kg)</option>
              </select>

              <select
                value={rule.type}
                onChange={(e) => onUpdateMutationRule(rule.id, { type: e.target.value as any })}
                disabled={isBoolean}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
              >
                <option value="SET">Set Fixed Value (=)</option>
                <option value="ADD">Add / Subtract Value (+ / -)</option>
                <option value="MULTIPLY">Multiply By Factor (*)</option>
              </select>

              {isBoolean ? (
                <select
                  value={rule.value}
                  onChange={(e) => onUpdateMutationRule(rule.id, { value: e.target.value })}
                  className="flex-grow min-w-[200px] bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50 font-bold"
                >
                  <option value="1">1 — Enabled / Active</option>
                  <option value="0">0 — Disabled / Inactive</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Value (e.g., 29.99, 1.10 for +10%)..."
                  value={rule.value}
                  onChange={(e) => onUpdateMutationRule(rule.id, { value: e.target.value })}
                  className="flex-grow min-w-[200px] bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50"
                />
              )}

              {mutationRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveMutationRule(rule.id)}
                  className="pm-btn pm-btn-danger text-xs px-2.5 py-1.5 rounded-lg"
                >
                  🗑️
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Execution Pre-Flight Action Controls */}
      <div className="border-t border-[var(--pm-border-color)] pt-4 flex justify-between items-center flex-wrap gap-4">
        {mutationLogs && (
          <button
            type="button"
            onClick={onToggleLogTerminal}
            className="text-xs text-[#8b5cf6] font-bold hover:underline cursor-pointer"
          >
            {showLogTerminal ? 'Hide Execution Terminal' : 'Show Execution Terminal Logs'}
          </button>
        )}

        <button
          type="button"
          onClick={onExecuteMutations}
          disabled={isExecuting}
          className="pm-btn pm-btn-danger text-xs font-bold px-6 py-3 rounded-xl transition uppercase tracking-wider shadow-xl hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 cursor-pointer ml-auto"
        >
          {isExecuting ? `Executing Chunk (Offset: ${executingOffset})...` : '🚀 Trigger Atomic Mutation Loop'}
        </button>
      </div>

      {/* Terminal Log Output Drawer */}
      {showLogTerminal && mutationLogs && (
        <LogTerminal
          title="Live Transaction Log Terminal"
          logs={mutationLogs}
          maxHeight="240px"
          downloadFilename="mutation_execution.log"
        />
      )}
    </div>
  );
};
