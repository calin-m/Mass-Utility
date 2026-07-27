<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Engine;

if (!defined('_PS_VERSION_') && !defined('MASS_UTILITY_DASHBOARD_LIVE')) {
    define('MASS_UTILITY_DASHBOARD_LIVE', true);
}

use Exception;

/**
 * Dashboard SaaS compiler engine responsible for translating JSON AST queries from the frontend into raw PrestaShop SQL.
 */
class QueryTranslationEngine
{
    private string $dbPrefix;
    private mixed $client;

    private array $whitelist = [
        'product.id' => [
            'column' => 'p.id_product',
            'type' => 'int',
            'join' => null
        ],
        'product.active' => [
            'column' => 'ps.active',
            'type' => 'int',
            'join' => 'product_shop'
        ],
        'product.reference' => [
            'column' => 'p.reference',
            'type' => 'string',
            'join' => null
        ],
        'product.id_manufacturer' => [
            'column' => 'p.id_manufacturer',
            'type' => 'int',
            'join' => null
        ],
        'manufacturer.id' => [
            'column' => 'p.id_manufacturer',
            'type' => 'int',
            'join' => null
        ],
        'category.id' => [
            'column' => 'cp.id_category',
            'type' => 'int',
            'join' => 'category_product'
        ],
        'product.price' => [
            'column' => 'ps.price',
            'type' => 'float',
            'join' => 'product_shop'
        ],
        'product.wholesale_price' => [
            'column' => 'ps.wholesale_price',
            'type' => 'float',
            'join' => 'product_shop'
        ],
        'product.quantity' => [
            'column' => 'sa.quantity',
            'type' => 'int',
            'join' => 'stock_available'
        ],
        'product.on_sale' => [
            'column' => 'ps.on_sale',
            'type' => 'int',
            'join' => 'product_shop'
        ],
        'product.visibility' => [
            'column' => 'ps.visibility',
            'type' => 'string',
            'join' => 'product_shop'
        ],
        'product.condition' => [
            'column' => 'p.condition',
            'type' => 'string',
            'join' => null
        ],
        'product.ecotax' => [
            'column' => 'ps.ecotax',
            'type' => 'float',
            'join' => 'product_shop'
        ],
        'product.weight' => [
            'column' => 'p.weight',
            'type' => 'float',
            'join' => null
        ],
        'product.ean13' => [
            'column' => 'p.ean13',
            'type' => 'string',
            'join' => null
        ],
        'product.upc' => [
            'column' => 'p.upc',
            'type' => 'string',
            'join' => null
        ],
        'product.isbn' => [
            'column' => 'p.isbn',
            'type' => 'string',
            'join' => null
        ],
        'product.final_price' => [
            'column' => "IF(sp.id_specific_price IS NOT NULL, IF(sp.reduction_type = 'percentage', ps.price * (1 - sp.reduction), ps.price - sp.reduction), ps.price)",
            'type' => 'float',
            'join' => 'specific_price'
        ],
        'product.has_discount' => [
            'column' => 'IF(sp.id_specific_price IS NOT NULL, 1, 0)',
            'type' => 'int',
            'join' => 'specific_price'
        ],
        'product.name' => [
            'column' => 'pl.name',
            'type' => 'string',
            'join' => 'product_lang'
        ],
        'discount.reduction_percent' => [
            'column' => "IF(sp.id_specific_price IS NOT NULL AND sp.reduction_type = 'percentage', sp.reduction * 100.0, 0.0)",
            'type' => 'float',
            'join' => 'specific_price'
        ],
        'discount.reduction_amount' => [
            'column' => "IF(sp.id_specific_price IS NOT NULL AND sp.reduction_type = 'amount', sp.reduction, 0.0)",
            'type' => 'float',
            'join' => 'specific_price'
        ],
        'employee.id_profile' => [
            'column' => '1',
            'type' => 'int',
            'join' => null
        ]
    ];

    public function __construct(string $dbPrefix = 'ps_', mixed $client = null)
    {
        $this->dbPrefix = $dbPrefix;
        $this->client = $client;
    }

    /**
     * Compiles an AST payload into a secure PrestaShop-ready SQL query
     */
    public function compile(array $astPayload, int $idLang, int $idShop): string
    {
        $conditionTree = $astPayload['condition_tree'] ?? null;
        if (!$conditionTree) {
            throw new Exception('Missing condition_tree in payload.');
        }

        $joins = [];
        $whereClause = $this->compileNode($conditionTree, $joins);

        $sql = 'SELECT p.id_product FROM `' . $this->dbPrefix . 'product` p';
        
        // Enforce shop scope immediately
        $sql .= ' INNER JOIN `' . $this->dbPrefix . 'product_shop` ps ON (p.id_product = ps.id_product AND ps.id_shop = ' . (int)$idShop . ')';

        // Selectively compile extra joins based on AST filters
        if (isset($joins['category_product'])) {
            $sql .= ' LEFT JOIN `' . $this->dbPrefix . 'category_product` cp ON (p.id_product = cp.id_product)';
        }
        if (isset($joins['stock_available'])) {
            $sql .= ' LEFT JOIN `' . $this->dbPrefix . 'stock_available` sa ON (p.id_product = sa.id_product AND sa.id_product_attribute = 0 AND sa.id_shop = ' . (int)$idShop . ')';
        }
        if (isset($joins['specific_price'])) {
            $sql .= ' LEFT JOIN `' . $this->dbPrefix . 'specific_price` sp ON (p.id_product = sp.id_product AND (sp.from = "0000-00-00 00:00:00" OR sp.from <= NOW()) AND (sp.to = "0000-00-00 00:00:00" OR sp.to >= NOW()))';
        }
        if (isset($joins['product_lang'])) {
            $sql .= ' LEFT JOIN `' . $this->dbPrefix . 'product_lang` pl ON (p.id_product = pl.id_product AND pl.id_lang = ' . (int)$idLang . ' AND pl.id_shop = ' . (int)$idShop . ')';
        }

        if ($whereClause !== '') {
            $sql .= ' WHERE ' . $whereClause;
        }

        return $sql;
    }

    /**
     * Executes the compiled AST query and returns a flat unique array of matching product IDs
     */
    public function execute(array $astPayload, int $idLang, int $idShop): array
    {
        $sql = $this->compile($astPayload, $idLang, $idShop);
        if ($this->client) {
            try {
                if (method_exists($this->client, 'request')) {
                    $res = $this->client->request('db_query', 'POST', ['sql' => $sql, 'method' => 'executeS']);
                    $rows = $res['result'] ?? $res['data'] ?? [];
                    if (is_array($rows)) {
                        return array_values(array_filter(array_map(fn($row) => (int)($row['id_product'] ?? $row['id'] ?? 0), $rows)));
                    }
                } elseif (method_exists($this->client, 'query')) {
                    $res = $this->client->query($sql);
                    if (isset($res['data']) && is_array($res['data'])) {
                        return array_values(array_filter(array_map(fn($row) => (int)($row['id_product'] ?? $row['id'] ?? 0), $res['data'])));
                    }
                }
            } catch (\Throwable $e) {
                // Fallback on bridge connection error
            }
        }
        return [];
    }

    private function compileNode(array $node, array &$joins): string
    {
        $operator = strtoupper($node['logical_operator'] ?? 'AND');
        $validOperators = ['AND', 'OR', 'NAND', 'NOR', 'XOR'];
        if (!in_array($operator, $validOperators)) {
            throw new Exception('Invalid logical operator: ' . $operator);
        }

        $parts = [];

        // 1. Process rules
        if (isset($node['rules']) && is_array($node['rules'])) {
            foreach ($node['rules'] as $rule) {
                $parts[] = $this->compileRule($rule, $joins);
            }
        }

        // 2. Process groups recursively
        if (isset($node['groups']) && is_array($node['groups'])) {
            foreach ($node['groups'] as $group) {
                $subSql = $this->compileNode($group, $joins);
                if ($subSql !== '') {
                    $parts[] = '(' . $subSql . ')';
                }
            }
        }

        if (empty($parts)) {
            return '';
        }

        if ($operator === 'OR') {
            return implode(' OR ', $parts);
        } elseif ($operator === 'NAND') {
            return 'NOT (' . implode(' AND ', $parts) . ')';
        } elseif ($operator === 'NOR') {
            return 'NOT (' . implode(' OR ', $parts) . ')';
        } elseif ($operator === 'XOR') {
            return '(' . implode(' XOR ', $parts) . ')';
        }

        return implode(' AND ', $parts);
    }

    private function compileRule(array $rule, array &$joins): string
    {
        $fieldKey = $rule['field'] ?? '';
        if (!isset($this->whitelist[$fieldKey])) {
            throw new Exception('Invalid or unauthorized AST field: ' . $fieldKey);
        }

        $def = $this->whitelist[$fieldKey];
        if ($def['join']) {
            $joins[$def['join']] = true;
        }

        $column = $def['column'];
        $type = $def['type'];
        $operator = strtoupper($rule['operator'] ?? 'EQUAL');
        $rawValue = $rule['value'] ?? '';

        switch ($operator) {
            case 'EQUAL':
                return $column . ' = ' . $this->formatVal($rawValue, $type, $fieldKey);
            case 'NOT_EQUAL':
                return $column . ' != ' . $this->formatVal($rawValue, $type, $fieldKey);
            case 'GREATER_THAN':
                return $column . ' > ' . $this->formatVal($rawValue, $type, $fieldKey);
            case 'LESS_THAN':
                return $column . ' < ' . $this->formatVal($rawValue, $type, $fieldKey);
            case 'LIKE':
                $escaped = addslashes((string)$rawValue);
                return $column . " LIKE '%" . $escaped . "%'";
            case 'IN':
            case 'NOT_IN':
                $items = is_array($rawValue) ? $rawValue : explode(',', (string)$rawValue);
                $formattedItems = array_map(fn($v) => $this->formatVal(trim((string)$v), $type, $fieldKey), $items);
                $inList = implode(', ', array_filter($formattedItems, fn($v) => $v !== ''));
                if ($inList === '') {
                    return '1 = 0';
                }
                $sqlOp = $operator === 'IN' ? 'IN' : 'NOT IN';
                return $column . ' ' . $sqlOp . ' (' . $inList . ')';
            default:
                throw new Exception('Invalid AST operator: ' . $operator);
        }
    }

    private function formatVal($val, string $type, string $fieldKey = ''): string
    {
        $rawStr = trim((string)$val);
        $lowerStr = strtolower($rawStr);

        // Smart Boolean / Flag Mapping for Active, On Sale, Has Discount
        if (in_array($fieldKey, ['product.active', 'product.on_sale', 'product.has_discount'], true)) {
            if (in_array($lowerStr, ['active', 'on_sale', 'yes', 'true', 'enabled', '1'], true)) {
                return '1';
            }
            if (in_array($lowerStr, ['inactive', 'normal', 'no', 'false', 'disabled', '0'], true)) {
                return '0';
            }
        }

        // Smart Enum Mapping for Catalog Visibility and Condition
        if ($fieldKey === 'product.visibility') {
            if (str_contains($lowerStr, 'both')) return "'both'";
            if (str_contains($lowerStr, 'catalog')) return "'catalog'";
            if (str_contains($lowerStr, 'search')) return "'search'";
            if (str_contains($lowerStr, 'none')) return "'none'";
        }
        if ($fieldKey === 'product.condition') {
            if (str_contains($lowerStr, 'new')) return "'new'";
            if (str_contains($lowerStr, 'used')) return "'used'";
            if (str_contains($lowerStr, 'refurb')) return "'refurbished'";
        }

        if ($type === 'int') {
            $cleaned = preg_replace('/[^\d-]/', '', $rawStr);
            return $cleaned !== '' ? (string)(int)$cleaned : '0';
        } elseif ($type === 'float') {
            $cleaned = str_replace(',', '.', preg_replace('/[^\d.,-]/', '', $rawStr));
            return $cleaned !== '' ? (string)(float)$cleaned : '0.0';
        }
        return "'" . addslashes($rawStr) . "'";
    }
}

// Backward compatibility alias for Dashboard namespace
if (!class_exists('MassUtility\Dashboard\Engine\QueryTranslationEngine', false)) {
    class_alias(QueryTranslationEngine::class, 'MassUtility\Dashboard\Engine\QueryTranslationEngine');
}
