// @Arch[UI_Components]
// @Description: Sub-component managing mutation rule actions (SET, ADD, MULTIPLY) and execution pre-flight controls with full option dropdown lists and manual toggle support.

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
  categoriesList?: Array<{ id: string | number; name: string }>;
  manufacturersList?: Array<{ id: string | number; name: string }>;
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
  categoriesList = [],
  manufacturersList = [],
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
    <div className="bg-pm-card border border-pm-border rounded-xl p-6 pm-card-elevation space-y-6 border-l-4 border-l-rose-500">
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
          const isVisibility = rule.field === 'visibility';
          const isCondition = rule.field === 'condition';
          const isCategory = rule.field === 'id_category_default';
          const isManufacturer = rule.field === 'id_manufacturer';

          let selectOptions: Array<{ value: string; label: string }> = [];
          if (isBoolean) {
            selectOptions = [
              { value: '1', label: '1 — Enabled / Active' },
              { value: '0', label: '0 — Disabled / Inactive' },
            ];
          } else if (isVisibility) {
            selectOptions = [
              { value: 'both', label: 'Everywhere (Catalog & Search)' },
              { value: 'catalog', label: 'Catalog Only' },
              { value: 'search', label: 'Search Only' },
              { value: 'none', label: 'Nowhere (Hidden)' },
            ];
          } else if (isCondition) {
            selectOptions = [
              { value: 'new', label: 'New' },
              { value: 'used', label: 'Used' },
              { value: 'refurbished', label: 'Refurbished' },
            ];
          } else if (isCategory) {
            selectOptions = categoriesList.map((c) => ({
              value: String(c.id),
              label: `[ID: ${c.id}] ${c.name}`,
            }));
          } else if (isManufacturer) {
            selectOptions = manufacturersList.map((m) => ({
              value: String(m.id),
              label: `[ID: ${m.id}] ${m.name}`,
            }));
          }

          const hasDropdown = selectOptions.length > 0;
          const isDropdownMode = hasDropdown && !rule.forceManualMode;
          const isFixedTypeOnly = isBoolean || isVisibility || isCondition;

          return (
            <div key={rule.id} className="flex items-center gap-3 flex-wrap bg-pm-input/30 border border-pm-border p-3.5 rounded-xl">
              {/* Target Mutation Field Selection */}
              <select
                value={rule.field}
                onChange={(e) => {
                  const newField = e.target.value;
                  const isNewBool = newField === 'active' || newField === 'on_sale';
                  const isNewVis = newField === 'visibility';
                  const isNewCond = newField === 'condition';

                  let defaultValue = '';
                  if (isNewBool) defaultValue = '1';
                  else if (isNewVis) defaultValue = 'both';
                  else if (isNewCond) defaultValue = 'new';

                  onUpdateMutationRule(rule.id, {
                    field: newField,
                    value: defaultValue,
                    type: isNewBool || isNewVis || isNewCond ? 'SET' : rule.type,
                    forceManualMode: false,
                  });
                }}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50"
              >
                <optgroup label="Pricing & Stock Metrics">
                  <option value="price">Product Base Price</option>
                  <option value="wholesale_price">Wholesale / Cost Price</option>
                  <option value="ecotax">Ecotax Amount</option>
                  <option value="weight">Product Weight (kg)</option>
                  <option value="quantity">Available Quantity / Stock</option>
                  <option value="minimal_quantity">Minimum Quantity For Sale</option>
                  <option value="low_stock_threshold">Low Stock Alert Threshold</option>
                  <option value="out_of_stock">Out-of-Stock Policy (0/1/2)</option>
                </optgroup>
                <optgroup label="🏷️ Discounts & Special Pricing">
                  <option value="discount_percent">Discount Percentage (%)</option>
                  <option value="discount_amount">Discount Fixed Amount ($)</option>
                  <option value="discount_type">Discount Type (percentage / amount)</option>
                  <option value="discount_from">Discount Start Date (YYYY-MM-DD)</option>
                  <option value="discount_to">Discount Expiration Date (YYYY-MM-DD)</option>
                  <option value="from_quantity">Discount Tier Minimum Quantity</option>
                </optgroup>
                <optgroup label="Status & Catalog Associations">
                  <option value="active">Active Status (1 / 0)</option>
                  <option value="on_sale">On Sale Flag (1 / 0)</option>
                  <option value="visibility">Catalog Visibility</option>
                  <option value="condition">Product Condition</option>
                  <option value="id_category_default">Default Category ID</option>
                  <option value="id_manufacturer">Manufacturer ID</option>
                  <option value="id_supplier">Supplier ID</option>
                  <option value="id_tax_rules_group">Tax Rule Group ID</option>
                </optgroup>
                <optgroup label="Dimensions & Shipping">
                  <option value="width">Product Width (cm)</option>
                  <option value="height">Product Height (cm)</option>
                  <option value="depth">Product Depth / Length (cm)</option>
                  <option value="additional_shipping_cost">Additional Shipping Surcharge</option>
                </optgroup>
                <optgroup label="References & Identifiers">
                  <option value="reference">Reference / SKU Code</option>
                  <option value="supplier_reference">Supplier Reference</option>
                  <option value="ean13">EAN-13 Barcode</option>
                  <option value="upc">UPC Barcode</option>
                  <option value="isbn">ISBN Barcode</option>
                  <option value="location">Warehouse Location</option>
                </optgroup>
                <optgroup label="Text & SEO Metadata">
                  <option value="name">Product Name</option>
                  <option value="link_rewrite">SEO Friendly URL Slug</option>
                  <option value="description_short">Short Summary / Description</option>
                  <option value="meta_title">SEO Meta Title</option>
                  <option value="meta_description">SEO Meta Description</option>
                </optgroup>
              </select>

              {/* Mutation Math Type (SET, ADD, MULTIPLY) */}
              <select
                value={rule.type}
                onChange={(e) => onUpdateMutationRule(rule.id, { type: e.target.value as any })}
                disabled={isFixedTypeOnly}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50 disabled:opacity-50"
              >
                <option value="SET">Set Fixed Value (=)</option>
                <option value="ADD">Add / Subtract Value (+ / -)</option>
                <option value="MULTIPLY">Multiply By Factor (*)</option>
              </select>

              {/* Value Control Input / Dropdown + Manual Toggle */}
              <div className="flex items-center gap-2 flex-grow min-w-[220px]">
                {isDropdownMode ? (
                  <>
                    <select
                      value={rule.value}
                      onChange={(e) => onUpdateMutationRule(rule.id, { value: e.target.value })}
                      className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50 flex-grow font-medium"
                    >
                      <option value="">- Select Target Value -</option>
                      {selectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {!isFixedTypeOnly && (
                      <button
                        type="button"
                        title="Switch to manual text input"
                        onClick={() => onUpdateMutationRule(rule.id, { forceManualMode: true })}
                        className="pm-btn pm-btn-neutral text-[0.7rem] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        📝 Manual
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder={
                        isCategory || isManufacturer || rule.field === 'id_tax_rules_group'
                          ? 'Enter numeric ID (e.g. 5)...'
                          : 'Value (e.g., 29.99, 1.10 for +10%)...'
                      }
                      value={rule.value}
                      onChange={(e) => onUpdateMutationRule(rule.id, { value: e.target.value })}
                      className="flex-grow bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-primary/50"
                    />
                    {hasDropdown && !isFixedTypeOnly && (
                      <button
                        type="button"
                        title="Switch to selection dropdown list"
                        onClick={() => onUpdateMutationRule(rule.id, { forceManualMode: false })}
                        className="pm-btn pm-btn-neutral text-[0.7rem] font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        📋 Dropdown
                      </button>
                    )}
                  </>
                )}
              </div>

              {mutationRules.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveMutationRule(rule.id)}
                  className="pm-btn pm-btn-danger text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
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
            className="text-xs text-purple-700 dark:text-purple-400 font-bold hover:underline cursor-pointer"
          >
            {showLogTerminal ? 'Hide Execution Terminal' : 'Show Execution Terminal Logs'}
          </button>
        )}

        <button
          type="button"
          onClick={onExecuteMutations}
          disabled={isExecuting}
          className="pm-btn pm-btn-danger text-xs font-bold px-6 py-3 rounded-xl transition uppercase tracking-wider pm-btn-elevation hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 cursor-pointer ml-auto"
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
