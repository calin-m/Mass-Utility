// @Arch[astCompiler]
// Standalone pure AST compilation & SQL translation engine for QueryMutateTab.

export interface Rule {
  id: string;
  field: string;
  operator: string;
  value: string;
  forceManualMode?: boolean;
}

export interface Group {
  id: string;
  logical_operator: 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR';
  rules: Rule[];
  groups: Group[];
}

export const formatVal = (val: string): string => {
  if (!val) return "''";
  if (!isNaN(Number(val))) return val;
  return `'${val.replace(/'/g, "\\'")}'`;
};

export const translateGroup = (group: Group): string => {
  const parts: string[] = [];

  for (const rule of group.rules) {
    if (!rule.field) continue;
    let ruleText = '';
    const fieldName = rule.field.replace(/_/g, ' ');
    const v = rule.value;

    switch (rule.operator) {
      case '=':
        ruleText = `${fieldName} equals "${v}"`;
        break;
      case '!=':
        ruleText = `${fieldName} is not "${v}"`;
        break;
      case 'LIKE':
        ruleText = `${fieldName} contains "${v}"`;
        break;
      case 'NOT LIKE':
        ruleText = `${fieldName} does not contain "${v}"`;
        break;
      case '>':
        ruleText = `${fieldName} is greater than "${v}"`;
        break;
      case '<':
        ruleText = `${fieldName} is less than "${v}"`;
        break;
      case '>=':
        ruleText = `${fieldName} is at least "${v}"`;
        break;
      case '<=':
        ruleText = `${fieldName} is at most "${v}"`;
        break;
      case 'IN':
        ruleText = `${fieldName} is one of (${v})`;
        break;
      case 'IS NULL':
        ruleText = `${fieldName} is empty/unset`;
        break;
      case 'IS NOT NULL':
        ruleText = `${fieldName} has any value set`;
        break;
      default:
        ruleText = `${fieldName} ${rule.operator} "${v}"`;
    }
    parts.push(ruleText);
  }

  for (const subGroup of group.groups) {
    const subText = translateGroup(subGroup);
    if (subText) {
      parts.push(`(${subText})`);
    }
  }

  if (parts.length === 0) return '';
  const op = ` ${group.logical_operator} `;
  return parts.join(op);
};

export const compileAst = (group: Group, prefix = 'p'): string => {
  const parts: string[] = [];

  for (const rule of group.rules) {
    if (!rule.field) continue;
    const col = `${prefix}.\`${rule.field}\``;
    const op = rule.operator;
    const val = formatVal(rule.value);

    if (op === 'IS NULL' || op === 'IS NOT NULL') {
      parts.push(`${col} ${op}`);
    } else if (op === 'IN' || op === 'NOT IN') {
      const items = rule.value.split(',').map(s => formatVal(s.trim())).join(', ');
      parts.push(`${col} ${op} (${items})`);
    } else if (op === 'LIKE' || op === 'NOT LIKE') {
      parts.push(`${col} ${op} '%${rule.value.replace(/'/g, "\\'")}%'`);
    } else {
      parts.push(`${col} ${op} ${val}`);
    }
  }

  for (const subGroup of group.groups) {
    const subSql = compileAst(subGroup, prefix);
    if (subSql) {
      parts.push(`(${subSql})`);
    }
  }

  if (parts.length === 0) return '1=1';

  let glue = ' AND ';
  if (group.logical_operator === 'OR') glue = ' OR ';
  else if (group.logical_operator === 'NAND') glue = ' AND NOT ';
  else if (group.logical_operator === 'NOR') glue = ' OR NOT ';

  return parts.join(glue);
};
