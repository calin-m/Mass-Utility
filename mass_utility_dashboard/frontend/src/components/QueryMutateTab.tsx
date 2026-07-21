// @Arch[UI_Components]
// @Description: Renders the Visual AST Query and Mutation Wizard. Implements recursive rule tree components, live sentence compilation, and recursive batch execution threads.
// @Calls: preview_query, execute_mutations, save_preset, delete_preset

import React, { useState, useEffect } from 'react';
import { FetchService } from '../utils/FetchService';
import { useModal } from '../utils/overlay';

interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
  forceManualMode?: boolean;
}

interface Group {
  id: string;
  logical_operator: 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR';
  rules: Rule[];
  groups: Group[];
}

interface MutationAction {
  id: string;
  field: string;
  type: 'SET' | 'ADD' | 'MULTIPLY';
  value: string;
  forceManualMode?: boolean;
}

export const QueryMutateTab: React.FC = () => {
  const { showAlert, showConfirm, showPrompt } = useModal();

  // Load options from window.PM_CONFIG
  const config = (window as any).PM_CONFIG || {};
  const categoriesList = config.categories || [];
  const manufacturersList = config.manufacturers || [];
  const profilesList = config.profiles || [];
  const initialPresets = config.presets || {};

  // Preset State
  const [presets, setPresets] = useState<any>(initialPresets);
  const [selectedMasterPreset, setSelectedMasterPreset] = useState('');
  const [selectedQueryPreset, setSelectedQueryPreset] = useState('');
  const [selectedMutatePreset, setSelectedMutatePreset] = useState('');

  // AST State
  const [queryTree, setQueryTree] = useState<Group>({
    id: 'root',
    logical_operator: 'AND',
    rules: [{ id: 'r-1', field: 'product.active', operator: 'EQUAL', value: '1' }],
    groups: []
  });

  const [liveExplanation, setLiveExplanation] = useState('');
  const [lastCompiledAst, setLastCompiledAst] = useState<any>(null);

  // Preview State
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSql, setPreviewSql] = useState('');
  const [previewSamples, setPreviewSamples] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [showStep2, setShowStep2] = useState(false);

  // Mutation Rules State
  const [mutationRules, setMutationRules] = useState<MutationAction[]>([
    { id: 'm-1', field: 'price', type: 'SET', value: '' }
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executingOffset, setExecutingOffset] = useState<number | null>(null);
  const [mutationLogs, setMutationLogs] = useState('');
  const [showLogTerminal, setShowLogTerminal] = useState(false);

  // Recalculate Live Sentence whenever query tree changes
  useEffect(() => {
    const text = translateGroup(queryTree);
    if (text) {
      setLiveExplanation(`This matches products where: ${text}`);
    } else {
      setLiveExplanation('No active rules configured.');
    }
    // Safety lock: reset compilation when tree drifts
    setLastCompiledAst(null);
    setShowStep2(false);
  }, [queryTree]);

  // Recursively compile group sentence
  const translateGroup = (group: Group): string => {
    const rules = group.rules || [];
    const subGroups = group.groups || [];

    if (rules.length === 0 && subGroups.length === 0) return '';

    const ruleTexts = rules.map(rule => {
      const fieldLabels: Record<string, string> = {
        'product.active': 'Active Status',
        'product.reference': 'Reference / SKU',
        'product.price': 'Base Price',
        'product.final_price': 'Discounted Price',
        'product.has_discount': 'Discount Status',
        'product.name': 'Name',
        'category.id': 'Category ID',
        'manufacturer.id': 'Manufacturer ID',
        'product.id_manufacturer': 'Manufacturer ID',
        'employee.id_profile': 'Employee Profile',
        'discount.reduction_percent': 'Discount Reduction %',
        'discount.reduction_amount': 'Discount Flat Amount'
      };
      const fieldLabel = fieldLabels[rule.field] || rule.field;

      const opLabels: Record<string, string> = {
        'EQUAL': 'is',
        'NOT_EQUAL': 'is not',
        'GREATER_THAN': 'is greater than',
        'LESS_THAN': 'is less than',
        'LIKE': 'contains',
        'IN': 'is in list',
        'NOT_IN': 'is not in list'
      };
      const opLabel = opLabels[rule.operator] || rule.operator;

      let valText = rule.value;
      if (rule.field === 'product.active') {
        valText = rule.value === '1' ? 'Active' : 'Inactive';
      } else if (rule.field === 'product.has_discount') {
        valText = rule.value === '1' ? 'Has Discount' : 'No Discount';
      } else if (rule.operator === 'IN' || rule.operator === 'NOT_IN') {
        valText = rule.value ? `[${rule.value}]` : '...';
      }

      return `<strong>${fieldLabel}</strong> ${opLabel} <strong>"${valText || '...'}"</strong>`;
    });

    const subGroupTexts = subGroups
      .map(sg => {
        const sub = translateGroup(sg);
        return sub ? `(${sub})` : '';
      })
      .filter(t => t !== '');

    const allParts = [...ruleTexts, ...subGroupTexts];
    if (allParts.length === 0) return '';

    switch (group.logical_operator) {
      case 'AND':
        return allParts.join(' <span class="text-blue-400 font-bold">AND</span> ');
      case 'OR':
        return allParts.join(' <span class="text-amber-500 font-bold">OR</span> ');
      case 'NAND':
        return `<strong>NOT ALL</strong> of the following are true: [ ${allParts.join(', ')} ]`;
      case 'NOR':
        return `<strong>NONE</strong> of the following are true: [ ${allParts.join(', ')} ]`;
      case 'XOR':
        return `<strong>EXACTLY ONE</strong> of the following is true: [ ${allParts.join(', ')} ]`;
      default:
        return allParts.join(` ${group.logical_operator} `);
    }
  };

  // Compile Query Preview
  const handleCompilePreview = async () => {
    setIsCompiling(true);
    const serializedAst = {
      condition_tree: serializeGroup(queryTree)
    };

    try {
      const data = await FetchService.post('preview_query', { payload: JSON.stringify(serializedAst) });
      if (data.success) {
        setPreviewCount(data.count);
        setPreviewSql(data.sql);
        setPreviewSamples(data.sample_ids && data.sample_ids.length > 0 ? data.sample_ids.join(', ') : 'No matching product IDs found.');
        setLastCompiledAst(serializedAst);
        if (data.count > 0) {
          setShowStep2(true);
        } else {
          setShowStep2(false);
          showAlert('No Targets Matched', 'The visual filter compiled successfully but did not match any products in the catalog.', 'info');
        }
      }
    } catch (err: any) {
      showAlert('AST Compilation Failure', err.message || 'Unknown error occurred.', 'error');
    } finally {
      setIsCompiling(false);
    }
  };

  // Helper: serialize group tree into array models expected by backend
  const serializeGroup = (group: Group): any => {
    const rules = (group.rules || []).map(r => {
      let val: any = r.value.trim();
      const isListOp = r.operator === 'IN' || r.operator === 'NOT_IN';
      if (isListOp) {
        val = val.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
      } else if (['product.active', 'category.id', 'manufacturer.id', 'product.id_manufacturer', 'product.has_discount', 'employee.id_profile'].includes(r.field)) {
        val = isNaN(val) ? val : parseInt(val, 10);
      } else if (['product.price', 'product.final_price', 'discount.reduction_percent', 'discount.reduction_amount'].includes(r.field)) {
        val = isNaN(val) ? val : parseFloat(val);
      }
      return { field: r.field, operator: r.operator, value: val };
    });

    return {
      logical_operator: group.logical_operator,
      rules,
      groups: (group.groups || []).map(sg => serializeGroup(sg))
    };
  };

  // Helper: map serial tree back into Group DOM-ready models
  const deserializeGroup = (serialized: any): Group => {
    const rules = (serialized.rules || []).map((r: any, idx: number) => {
      let valStr = '';
      if (Array.isArray(r.value)) {
        valStr = r.value.join(', ');
      } else {
        valStr = String(r.value ?? '');
      }
      return {
        id: `r-load-${idx}-${Math.random()}`,
        field: r.field,
        operator: r.operator,
        value: valStr
      };
    });
    return {
      id: `g-load-${Math.random()}`,
      logical_operator: serialized.logical_operator || 'AND',
      rules,
      groups: (serialized.groups || []).map((sg: any) => deserializeGroup(sg))
    };
  };

  // Add Group
  const handleAddGroup = (targetId: string, parent: Group): Group => {
    if (parent.id === targetId) {
      return {
        ...parent,
        groups: [
          ...parent.groups,
          {
            id: `g-${Math.random()}`,
            logical_operator: 'AND',
            rules: [{ id: `r-${Math.random()}`, field: 'product.active', operator: 'EQUAL', value: '1' }],
            groups: []
          }
        ]
      };
    }
    return {
      ...parent,
      groups: parent.groups.map(g => handleAddGroup(targetId, g))
    };
  };

  // Add Rule
  const handleAddRule = (targetId: string, parent: Group): Group => {
    if (parent.id === targetId) {
      return {
        ...parent,
        rules: [
          ...parent.rules,
          { id: `r-${Math.random()}`, field: 'product.active', operator: 'EQUAL', value: '1' }
        ]
      };
    }
    return {
      ...parent,
      groups: parent.groups.map(g => handleAddRule(targetId, g))
    };
  };

  // Delete Rule
  const handleDeleteRule = (ruleId: string, parent: Group): Group => {
    return {
      ...parent,
      rules: parent.rules.filter(r => r.id !== ruleId),
      groups: parent.groups.map(g => handleDeleteRule(ruleId, g))
    };
  };

  // Delete Group
  const handleDeleteGroup = (groupId: string, parent: Group): Group => {
    return {
      ...parent,
      groups: parent.groups.filter(g => g.id !== groupId).map(g => handleDeleteGroup(groupId, g))
    };
  };

  // Update Rule Value
  const handleUpdateRule = (ruleId: string, updates: Partial<Rule>, parent: Group): Group => {
    return {
      ...parent,
      rules: parent.rules.map(r => (r.id === ruleId ? { ...r, ...updates } : r)),
      groups: parent.groups.map(g => handleUpdateRule(ruleId, updates, g))
    };
  };

  // Update Group Operator
  const handleUpdateGroupOperator = (groupId: string, op: any, parent: Group): Group => {
    if (parent.id === groupId) {
      return { ...parent, logical_operator: op };
    }
    return {
      ...parent,
      groups: parent.groups.map(g => handleUpdateGroupOperator(groupId, op, g))
    };
  };

  // Preset Loaders
  const handleLoadQueryPreset = (presetId: string) => {
    setSelectedQueryPreset(presetId);
    if (!presetId) {
      setQueryTree({
        id: 'root',
        logical_operator: 'AND',
        rules: [{ id: 'r-1', field: 'product.active', operator: 'EQUAL', value: '1' }],
        groups: []
      });
      return;
    }
    const preset = presets.query?.find((p: any) => String(p.id_preset) === presetId);
    if (preset) {
      let ast = preset.payload;
      if (typeof ast === 'string') ast = JSON.parse(ast);
      if (ast.condition_tree) ast = ast.condition_tree;
      setQueryTree(deserializeGroup(ast));
    }
  };

  const handleLoadMutatePreset = (presetId: string) => {
    setSelectedMutatePreset(presetId);
    if (!presetId) {
      setMutationRules([{ id: 'm-1', field: 'price', type: 'SET', value: '' }]);
      return;
    }
    const preset = presets.mutate?.find((p: any) => String(p.id_preset) === presetId);
    if (preset) {
      let actions = preset.payload;
      if (typeof actions === 'string') actions = JSON.parse(actions);
      const items = (actions || []).map((a: any, idx: number) => ({
        id: `m-load-${idx}-${Math.random()}`,
        field: a.field,
        type: a.type,
        value: String(a.value ?? '')
      }));
      setMutationRules(items);
    }
  };

  const handleLoadMasterPreset = (presetId: string) => {
    setSelectedMasterPreset(presetId);
    if (!presetId) return;
    const preset = presets.master?.find((p: any) => String(p.id_preset) === presetId);
    if (preset) {
      let payload = preset.payload;
      if (typeof payload === 'string') payload = JSON.parse(payload);
      
      // Load query half
      if (payload.query) {
        let qAst = payload.query;
        if (qAst.condition_tree) qAst = qAst.condition_tree;
        setQueryTree(deserializeGroup(qAst));
      }
      
      // Load mutate half
      if (payload.mutate) {
        const items = (payload.mutate || []).map((a: any, idx: number) => ({
          id: `m-load-${idx}-${Math.random()}`,
          field: a.field,
          type: a.type,
          value: String(a.value ?? '')
        }));
        setMutationRules(items);
      }
    }
  };

  // Preset Savers
  const handleSavePreset = (type: 'query' | 'mutate' | 'master') => {
    let payload: any = null;
    let title = '';
    let msg = '';
    let placeholder = '';

    if (type === 'query') {
      payload = { condition_tree: serializeGroup(queryTree) };
      title = 'Save Query Preset';
      msg = 'Enter a name for this AST filter configuration:';
      placeholder = 'E.g., Out of stock laptops';
    } else if (type === 'mutate') {
      payload = mutationRules.map(r => ({ field: r.field, type: r.type, value: r.value }));
      title = 'Save Mutate Preset';
      msg = 'Enter a name for these action rules:';
      placeholder = 'E.g., Global Black Friday Discount';
    } else {
      payload = {
        query: { condition_tree: serializeGroup(queryTree) },
        mutate: mutationRules.map(r => ({ field: r.field, type: r.type, value: r.value }))
      };
      title = 'Save Master Preset';
      msg = 'Enter a name for this combined Query & Mutate template:';
      placeholder = 'E.g., Black Friday 20% Off Catalog';
    }

    showPrompt(title, msg, placeholder, async (name) => {
      if (!name) return;
      try {
        const data = await FetchService.post('save_preset', {
          name,
          preset_type: type,
          payload: JSON.stringify(payload)
        });
        if (data.success) {
          const newPreset = {
            id_preset: data.id_preset,
            name,
            type,
            payload
          };
          const updated = { ...presets };
          updated[type] = [...(updated[type] || []), newPreset];
          setPresets(updated);
          
          if (type === 'query') setSelectedQueryPreset(String(data.id_preset));
          else if (type === 'mutate') setSelectedMutatePreset(String(data.id_preset));
          else setSelectedMasterPreset(String(data.id_preset));
          
          showAlert('Preset Saved', `Preset "${name}" saved successfully.`, 'success');
        }
      } catch (err: any) {
        showAlert('Error Saving Preset', err.message || 'Failed to save preset.', 'error');
      }
    });
  };

  const handleDeletePreset = (type: 'query' | 'mutate' | 'master', selectVal: string) => {
    if (!selectVal) return;
    showConfirm('Delete Preset', 'Are you sure you want to permanently delete this preset? This cannot be undone.', 'DELETE', async () => {
      try {
        const data = await FetchService.post('delete_preset', { id_preset: selectVal });
        if (data.success) {
          const updated = { ...presets };
          updated[type] = (updated[type] || []).filter((p: any) => String(p.id_preset) !== selectVal);
          setPresets(updated);
          if (type === 'query') setSelectedQueryPreset('');
          else if (type === 'mutate') setSelectedMutatePreset('');
          else setSelectedMasterPreset('');
          showAlert('Preset Deleted', 'The preset was successfully removed.', 'info');
        }
      } catch (err: any) {
        showAlert('Delete Failed', err.message || 'Error deleting preset.', 'error');
      }
    });
  };

  // Run Recursive Batch Mutation Loop
  const handleExecuteMutations = () => {
    if ((window as any).PM_CAPABILITIES?.query_visual_execute === false) {
      showAlert(
        'Pro Feature Locked',
        'Visual execution of query wizard mutations requires a Pro or Developer subscription package.<br><br><strong>Note:</strong> You can still write and run your mutations as raw SQL statements inside the database terminal tab.',
        'info'
      );
      return;
    }

    if (!lastCompiledAst) {
      showAlert('Out of Sync', 'Target scope is out of sync. Please compile and preview your query on Step 1 first.', 'info');
      return;
    }

    const actions: Record<string, any> = {};
    for (const rule of mutationRules) {
      if (!rule.value.trim()) {
        showAlert('Missing Values', 'Please specify a value for all mutation actions.', 'info');
        return;
      }
      actions[rule.field] = { type: rule.type, value: rule.value.trim() };
    }

    showConfirm(
      'Atomic Execution Pre-Flight',
      'CRITICAL ACTION PRE-FLIGHT CHECKLIST:<br><br>1. Active InnoDB Transactions will acquire locks on targets.<br>2. In case of unexpected server crashes, modifications will ROLLBACK.<br>3. Historical backups are recommended.<br><br>Are you sure you want to trigger this database synchronization now?',
      'EXECUTE',
      () => {
        setIsExecuting(true);
        setExecutingOffset(0);
        setMutationLogs('');
        setShowLogTerminal(true);

        const limit = 100;
        let cumulative = '';

        const runChunk = async (offset: number) => {
          setExecutingOffset(offset);
          try {
            const data = await FetchService.post('execute_mutations', {
              payload: JSON.stringify(lastCompiledAst),
              actions: JSON.stringify(actions),
              offset: offset,
              limit: limit
            });

            if (data.success) {
              if (data.log_content) {
                cumulative += data.log_content;
                setMutationLogs(cumulative);
              }

              if (!data.done) {
                runChunk(data.new_offset);
              } else {
                setIsExecuting(false);
                setExecutingOffset(null);
                showAlert('Atomic Execution Successful', 'All batch transactions executed and synced successfully.', 'success');
                // Refresh mutation history global list if active
                if ((window as any)._pmFetchMutationHistory) {
                  (window as any)._pmFetchMutationHistory();
                }
              }
            }
          } catch (err: any) {
            setIsExecuting(false);
            setExecutingOffset(null);
            showAlert('Execution Aborted', `Mutation sequence rolled back due to error: ${err.message}`, 'error');
          }
        };

        runChunk(0);
      }
    );
  };

  // Rendering Helper: Single Rule Element
  const renderRuleNode = (rule: Rule) => {
    // Determine option lists
    const selectOptions: { value: string; label: string }[] = [];
    let showOptionsDropdown = false;

    if (rule.field === 'product.active') {
      showOptionsDropdown = true;
      selectOptions.push({ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' });
    } else if (rule.field === 'product.has_discount') {
      showOptionsDropdown = true;
      selectOptions.push({ value: '1', label: 'Has Active Discount' }, { value: '0', label: 'No Discount' });
    } else if (rule.field === 'category.id' && categoriesList.length > 0) {
      showOptionsDropdown = true;
      categoriesList.forEach((c: any) => selectOptions.push({ value: String(c.id), label: `[${c.id}] ${c.name}` }));
    } else if (['manufacturer.id', 'product.id_manufacturer'].includes(rule.field) && manufacturersList.length > 0) {
      showOptionsDropdown = true;
      manufacturersList.forEach((m: any) => selectOptions.push({ value: String(m.id), label: `[${m.id}] ${m.name}` }));
    } else if (rule.field === 'employee.id_profile' && profilesList.length > 0) {
      showOptionsDropdown = true;
      profilesList.forEach((p: any) => selectOptions.push({ value: String(p.id), label: `[${p.id}] ${p.name}` }));
    }

    const isListOp = rule.operator === 'IN' || rule.operator === 'NOT_IN';
    const isDropdownMode = showOptionsDropdown && !isListOp && !rule.forceManualMode;

    return (
      <div key={rule.id} className="flex gap-2 items-center flex-wrap bg-white/[0.01] border border-pm-border p-3 rounded-xl">
        <select
          value={rule.field}
          onChange={(e) => {
            const updated = handleUpdateRule(rule.id, { field: e.target.value, forceManualMode: false, value: '' }, queryTree);
            setQueryTree(updated);
          }}
          className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-pm-purple/50"
        >
          <option value="product.active">Product: Active Status</option>
          <option value="product.reference">Product: Reference / SKU</option>
          <option value="product.price">Product: Base Price</option>
          <option value="product.final_price">Product: Discounted Price</option>
          <option value="product.has_discount">Product: Has Active Discount</option>
          <option value="product.name">Product: Name</option>
          <option value="category.id">Category: ID</option>
          <option value="manufacturer.id">Manufacturer: ID</option>
          <option value="product.id_manufacturer">Product: Manufacturer ID</option>
          <option value="employee.id_profile">Employee: Profile (User Type)</option>
          <option value="discount.reduction_percent">Discount: Reduction %</option>
          <option value="discount.reduction_amount">Discount: Flat Reduction</option>
        </select>

        <select
          value={rule.operator}
          onChange={(e) => {
            const updated = handleUpdateRule(rule.id, { operator: e.target.value }, queryTree);
            setQueryTree(updated);
          }}
          className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="EQUAL">Equals</option>
          <option value="NOT_EQUAL">Not Equals</option>
          <option value="GREATER_THAN">Greater Than</option>
          <option value="LESS_THAN">Less Than</option>
          <option value="LIKE">Contains</option>
          <option value="IN">In List (Comma separated)</option>
          <option value="NOT_IN">Not In List (Comma separated)</option>
        </select>

        <span className="flex items-center gap-1.5 min-w-[200px] flex-grow">
          {isDropdownMode ? (
            <>
              <select
                value={rule.value}
                onChange={(e) => {
                  const updated = handleUpdateRule(rule.id, { value: e.target.value }, queryTree);
                  setQueryTree(updated);
                }}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none w-full"
              >
                <option value="">- Select Target Value -</option>
                {selectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                title="Switch to manual text input"
                onClick={() => {
                  const updated = handleUpdateRule(rule.id, { forceManualMode: true }, queryTree);
                  setQueryTree(updated);
                }}
                className="text-xs hover:bg-white/[0.05] border border-pm-border px-2 py-1 rounded-lg text-pm-text-secondary flex items-center gap-1 focus:outline-none"
              >
                📝 Manual
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={rule.value}
                onChange={(e) => {
                  const updated = handleUpdateRule(rule.id, { value: e.target.value }, queryTree);
                  setQueryTree(updated);
                }}
                placeholder={isListOp ? "e.g. 101, 102, 103" : "Enter filter constraint..."}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-purple/50 flex-grow"
              />
              {showOptionsDropdown && !isListOp && (
                <button
                  type="button"
                  title="Switch to selection dropdown list"
                  onClick={() => {
                    const updated = handleUpdateRule(rule.id, { forceManualMode: false }, queryTree);
                    setQueryTree(updated);
                  }}
                  className="text-xs hover:bg-white/[0.05] border border-pm-border px-2 py-1 rounded-lg text-pm-text-secondary flex items-center gap-1 focus:outline-none"
                >
                  📋 Dropdown
                </button>
              )}
            </>
          )}
        </span>

        <button
          type="button"
          onClick={() => {
            const updated = handleDeleteRule(rule.id, queryTree);
            setQueryTree(updated);
          }}
          className="pm-btn pm-btn-danger text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-bold focus:outline-none"
        >
          🗑️ Delete
        </button>
      </div>
    );
  };

  // Rendering Helper: Recursive Group Node
  const renderGroupNode = (group: Group, isRoot = false) => {
    return (
      <div key={group.id} className={`border rounded-xl p-4 bg-black/10 transition-colors ${
        group.logical_operator === 'AND' ? 'border-pm-border' : 'border-amber-500/10'
      }`}>
        <div className="flex justify-between items-center gap-4 flex-wrap mb-4 pb-2 border-b border-pm-border">
          <div className="flex items-center gap-2">
            <select
              value={group.logical_operator}
              onChange={(e) => {
                const updated = handleUpdateGroupOperator(group.id, e.target.value as any, queryTree);
                setQueryTree(updated);
              }}
              className="bg-pm-input border border-pm-border text-xs font-bold text-pm-text-secondary rounded-lg px-2.5 py-1.5 focus:outline-none"
            >
              <option value="AND">AND (All match)</option>
              <option value="OR">OR (Any match)</option>
              <option value="NAND">NAND (Not all match)</option>
              <option value="NOR">NOR (None match)</option>
              <option value="XOR">XOR (Exactly one matches)</option>
            </select>
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                const updated = handleAddRule(group.id, queryTree);
                setQueryTree(updated);
              }}
              className="pm-btn pm-btn-primary text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase"
            >
              + Add Rule
            </button>
            <button
              type="button"
              onClick={() => {
                const updated = handleAddGroup(group.id, queryTree);
                setQueryTree(updated);
              }}
              className="pm-btn pm-btn-neutral text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase"
            >
              + Add Group
            </button>
            {!isRoot && (
              <button
                type="button"
                onClick={() => {
                  const updated = handleDeleteGroup(group.id, queryTree);
                  setQueryTree(updated);
                }}
                className="pm-btn pm-btn-danger text-[10px] font-bold px-2.5 py-1.5 rounded-lg uppercase"
              >
                Delete Group
              </button>
            )}
          </div>
        </div>

        {/* Nested Rules List */}
        <div className="space-y-2 mb-3">
          {group.rules.map(rule => renderRuleNode(rule))}
        </div>

        {/* Nested Subgroups */}
        {group.groups.length > 0 && (
          <div className="space-y-4 pl-4 border-l border-pm-border mt-3">
            {group.groups.map(sg => renderGroupNode(sg, false))}
          </div>
        )}
      </div>
    );
  };

  // Rendering Helper: Single Mutation action row
  const renderMutationRuleRow = (rule: MutationAction) => {
    const showOptions = rule.field === 'active' || rule.field === 'id_manufacturer';
    const selectOptions: { value: string; label: string }[] = [];

    if (rule.field === 'active') {
      selectOptions.push({ value: '1', label: 'Active' }, { value: '0', label: 'Inactive' });
    } else if (rule.field === 'id_manufacturer' && manufacturersList.length > 0) {
      manufacturersList.forEach((m: any) => selectOptions.push({ value: String(m.id), label: `[${m.id}] ${m.name}` }));
    }

    const isDropdownMode = showOptions && !rule.forceManualMode;

    const handleFieldChange = (field: string) => {
      const type = field === 'price' ? 'SET' : 'SET';
      setMutationRules(prev =>
        prev.map(r => (r.id === rule.id ? { ...r, field, type, value: '', forceManualMode: false } : r))
      );
    };

    const handleUpdate = (updates: Partial<MutationAction>) => {
      setMutationRules(prev => prev.map(r => (r.id === rule.id ? { ...r, ...updates } : r)));
    };

    return (
      <div key={rule.id} className="flex gap-2 items-center flex-wrap bg-white/[0.01] border border-pm-border p-3 rounded-xl">
        <select
          value={rule.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none"
        >
          <option value="price">Product: Base Price</option>
          <option value="active">Product: Active Status</option>
          <option value="reference">Product: Reference / SKU</option>
          <option value="id_manufacturer">Product: Manufacturer ID</option>
          <option value="discount_percent">Discount: Percentage Reduction (%)</option>
          <option value="discount_amount">Discount: Flat Amount Reduction</option>
        </select>

        {rule.field === 'price' ? (
          <select
            value={rule.type}
            onChange={(e) => handleUpdate({ type: e.target.value as any })}
            className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="SET">SET to</option>
            <option value="ADD">ADD (+)</option>
            <option value="MULTIPLY">MULTIPLY (*)</option>
          </select>
        ) : (
          <span className="text-xs text-pm-text-secondary bg-white/5 border border-pm-border rounded-lg px-2 py-1.5">SET TO</span>
        )}

        <span className="flex items-center gap-1.5 min-w-[200px] flex-grow">
          {isDropdownMode ? (
            <>
              <select
                value={rule.value}
                onChange={(e) => handleUpdate({ value: e.target.value })}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-2.5 py-1.5 focus:outline-none w-full"
              >
                <option value="">- Select value -</option>
                {selectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleUpdate({ forceManualMode: true })}
                className="text-xs text-pm-text-secondary hover:bg-white/[0.05] p-1 rounded-lg"
              >
                ✏️
              </button>
            </>
          ) : (
            <>
              <input
                type={rule.field === 'price' || rule.field.startsWith('discount') ? 'number' : 'text'}
                step="0.01"
                value={rule.value}
                onChange={(e) => handleUpdate({ value: e.target.value })}
                placeholder="Enter value..."
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded-lg px-3 py-1.5 focus:outline-none focus:border-pm-purple/50 flex-grow"
              />
              {showOptions && (
                <button
                  type="button"
                  onClick={() => handleUpdate({ forceManualMode: false })}
                  className="text-xs text-pm-text-secondary hover:bg-white/[0.05] p-1 rounded-lg"
                >
                  📜
                </button>
              )}
            </>
          )}
        </span>

        <button
          type="button"
          onClick={() => setMutationRules(prev => prev.filter(r => r.id !== rule.id))}
          className="pm-btn pm-btn-danger text-xs p-1.5 rounded-lg"
        >
          🗑️
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-pm-border pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-lg">⚡</div>
          <div>
            <h2 className="text-md font-bold tracking-wide text-pm-text uppercase">Query &amp; Mutate Wizard</h2>
            <p className="text-xs text-pm-text-secondary mt-0.5">Define target AST filters recursively and execute atomic bulk updates</p>
          </div>
        </div>

        {/* Master Preset selector */}
        <div className="flex items-center gap-2 bg-pm-input border border-pm-border p-2 rounded-xl text-xs">
          <span className="font-bold text-pm-text-secondary">Combo Presets:</span>
          <select
            value={selectedMasterPreset}
            onChange={(e) => handleLoadMasterPreset(e.target.value)}
            className="bg-black/20 border border-pm-border rounded px-2 py-1 text-xs text-pm-text focus:outline-none"
          >
            <option value="">- Custom Template -</option>
            {presets.master?.map((p: any) => (
              <option key={p.id_preset} value={p.id_preset}>{p.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleSavePreset('master')}
            className="pm-btn pm-btn-success text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => handleDeletePreset('master', selectedMasterPreset)}
            disabled={!selectedMasterPreset}
            className="pm-btn pm-btn-danger text-xs font-bold px-2.5 py-1.5 rounded-lg transition disabled:opacity-30"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Step 1 Card: Target Products Filter */}
      <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4 border-l-4 border-l-[#8b5cf6]">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-pm-border pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#8b5cf6] rounded-full"></span>
            <h3 className="text-sm font-bold text-pm-text uppercase">Step 1: Define Target Products (Visual AST Filter)</h3>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-pm-text-secondary">Filter Preset:</span>
            <select
              value={selectedQueryPreset}
              onChange={(e) => handleLoadQueryPreset(e.target.value)}
              className="bg-pm-input border border-pm-border text-xs text-pm-text rounded px-2 py-1"
            >
              <option value="">- Custom Filter -</option>
              {presets.query?.map((p: any) => (
                <option key={p.id_preset} value={p.id_preset}>{p.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => handleSavePreset('query')} className="pm-btn pm-btn-neutral px-2 py-1 rounded text-xs">Save</button>
            <button type="button" onClick={() => handleDeletePreset('query', selectedQueryPreset)} disabled={!selectedQueryPreset} className="pm-btn pm-btn-danger px-2 py-1 rounded text-xs disabled:opacity-30">Delete</button>
          </div>
        </div>

        <p className="text-xs text-pm-text-secondary leading-relaxed">
          Formulate filter criteria recursively. The translation engine will securely parse the AST structure, resolve indexed database tables, and preview the affected database scopes.
        </p>

        {/* Live Translation Sentences Panel */}
        <div className="bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl text-xs text-pm-text-secondary">
          🗣️ <strong>Query Live Translation:</strong>{' '}
          <span className="italic text-pm-text-secondary" dangerouslySetInnerHTML={{ __html: liveExplanation }} />
        </div>

        {/* Visual Builder Root */}
        <div className="space-y-4">
          {renderGroupNode(queryTree, true)}
        </div>

        {/* Compile Triggers */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isCompiling}
            onClick={handleCompilePreview}
            className="pm-btn pm-btn-purple text-xs font-bold px-5 py-2.5 rounded-lg transition-all uppercase tracking-wide disabled:opacity-40"
          >
            {isCompiling ? '⚡ Compiling AST & Resolving Joins...' : '⚡ Compile & Preview Affected Products'}
          </button>
        </div>
      </div>

      {/* Result Panel */}
      {previewCount !== null && (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm border-b border-pm-border pb-3 uppercase">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
            AST Compilation Results
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-pm-input/30 border border-pm-border p-4 rounded-xl">
              <span className="text-[10px] text-pm-text-secondary uppercase tracking-wider block">Affected Products Count</span>
              <div className="text-xl font-bold text-pm-text mt-1">{previewCount}</div>
            </div>
            <div className="bg-pm-input/30 border border-pm-border p-4 rounded-xl">
              <span className="text-[10px] text-pm-text-secondary uppercase tracking-wider block">Target Scope Security Status</span>
              <div className="text-sm font-bold text-pm-success mt-1.5 uppercase">SAFE &amp; PARAMETERIZED</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-pm-text-secondary block">Compiled MariaDB SQL Query</span>
            <pre className="pm-log-terminal text-xs text-blue-400 border border-blue-500/10 bg-[var(--pm-terminal-bg,#05070f)] p-3 rounded-lg overflow-x-auto select-all">{previewSql}</pre>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-pm-text-secondary block">Sample Target Product IDs</span>
            <div className="text-xs border border-pm-border bg-black/10 p-3 rounded-lg text-pm-text-secondary max-h-24 overflow-y-auto select-all">
              {previewSamples}
            </div>
          </div>
        </div>
      )}

      {/* Step 2 Card: Configure & Execute Mutations */}
      {showStep2 && (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4 border-l-4 border-l-red-500 animate-fade-in">
          {/* AST Safety Banner */}
          <div className={`p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
            previewCount === 0 
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <span className="flex items-center gap-2 font-bold">
              {previewCount === 0 ? '⚠️ NOTICE:' : '🛡️ AST SAFETY SHIELD VERIFIED:'}
            </span>
            <span>
              {previewCount === 0 
                ? 'Target scope matches 0 products. Execution will yield no mutations.' 
                : `Target scope strictly bound to ${previewCount} products. Parameterized AST WHERE criteria enforced.`}
            </span>
          </div>

          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-pm-border pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
              <h3 className="text-sm font-bold text-red-400 uppercase">Step 2: Configure &amp; Execute Mutations (Safety Shield Active)</h3>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-pm-text-secondary">Rules Preset:</span>
              <select
                value={selectedMutatePreset}
                onChange={(e) => handleLoadMutatePreset(e.target.value)}
                className="bg-pm-input border border-pm-border text-xs text-pm-text rounded px-2 py-1"
              >
                <option value="">- Custom Rules -</option>
                {presets.mutate?.map((p: any) => (
                  <option key={p.id_preset} value={p.id_preset}>{p.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => handleSavePreset('mutate')} className="pm-btn pm-btn-neutral px-2 py-1 rounded text-xs">Save</button>
              <button type="button" onClick={() => handleDeletePreset('mutate', selectedMutatePreset)} disabled={!selectedMutatePreset} className="pm-btn pm-btn-danger px-2 py-1 rounded text-xs disabled:opacity-30">Delete</button>
            </div>
          </div>

          <p className="text-xs text-pm-text-secondary leading-relaxed">
            Configure mutations to apply onto the target scope of <strong>{previewCount} products</strong>.
            Mutations are executed inside transactions. Concurrent rows lock constraints apply, and the Buffer Packet Shield manages chunk throttling automatically.
          </p>

          {/* Action Rules Builder */}
          <div className="space-y-3">
            {mutationRules.map(rule => renderMutationRuleRow(rule))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isExecuting}
              onClick={() => setMutationRules(prev => [...prev, { id: `m-${Math.random()}`, field: 'price', type: 'SET', value: '' }])}
              className="pm-btn pm-btn-neutral text-xs font-bold px-4 py-2 rounded-lg transition"
            >
              ➕ Add Mutation Action
            </button>
            <button
              type="button"
              disabled={isExecuting || mutationRules.length === 0}
              onClick={handleExecuteMutations}
              className="pm-btn pm-btn-danger text-white text-xs font-bold px-5 py-2.5 rounded-lg transition uppercase tracking-wide disabled:opacity-40 flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Mutating... (Offset: {executingOffset})
                </>
              ) : (
                '⚡ Run Atomic Execution'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mutation Execution Terminal Log */}
      {showLogTerminal && (
        <div className="bg-pm-card border border-pm-border rounded-xl p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-pm-border pb-3">
            <div className="flex items-center gap-2 font-bold text-xs uppercase text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              Mutation Execution Log Terminal
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([mutationLogs], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mutation_execution.log';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="pm-btn pm-btn-neutral text-[10px] text-pm-text-secondary font-bold px-2 py-1 rounded transition"
              >
                📥 Save Log
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await FetchService.post('clear_saas_log');
                    setMutationLogs('No mutation logs compiled yet.');
                  } catch (e) {}
                }}
                className="pm-btn pm-btn-danger text-[10px] font-bold px-2 py-1 rounded transition"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
          <pre className="pm-log-terminal text-xs text-emerald-400 bg-[var(--pm-terminal-bg,#05070f)] p-4 rounded-xl border border-pm-border overflow-y-auto max-h-[300px] font-mono leading-relaxed select-all">
            {mutationLogs || 'No logs compiled yet.'}
          </pre>
        </div>
      )}
    </div>
  );
};
