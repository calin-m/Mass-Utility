<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Engine;

use Exception;
use MassUtility\SaaS\Service\SaaSSQLEscaper;
use MassUtility\SaaS\Service\HttpClient;

/**
 * The compiler engine responsible for translating JSON AST queries from the frontend into raw PrestaShop SQL.
 */
class QueryTranslationEngine
{
    private string $dbPrefix;
    private ?HttpClient $httpClient;

    private array $whitelist = [
        'product.id' => [
            'column' => 'p.id_product',
            'type' => 'int',
            'join' => null
        ],
        'product.active' => [
            'column' => 'p.active',
            'type' => 'int',
            'join' => null
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
            // Agnostic whitelist mapping. Allows UI visual builders to preview/query 'User Type' 
            // without breaking SQL execution. Customize this to a product column (e.g. p.id_employee) if needed.
            'column' => '1',
            'type' => 'int',
            'join' => null
        ]
    ];

    public function __construct(string $dbPrefix = 'ps_', ?HttpClient $httpClient = null)
    {
        $this->dbPrefix = $dbPrefix;
        $this->httpClient = $httpClient;
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
     * Executes the compiled AST query and returns a flat unique array of matching product IDs via Bridge API
     */
    public function execute(array $astPayload, int $idLang, int $idShop): array
    {
        if ($this->httpClient === null) {
            throw new Exception("HttpClient must be provided to execute AST queries from Standalone Dashboard.");
        }

        $res = $this->httpClient->request('query_products', 'POST', [
            'ast' => $astPayload,
            'id_lang' => $idLang,
            'id_shop' => $idShop
        ]);

        return is_array($res['product_ids'] ?? null) ? $res['product_ids'] : [];
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

        switch ($operator) {
            case 'NAND':
                return 'NOT (' . implode(' AND ', $parts) . ')';
            case 'NOR':
                return 'NOT (' . implode(' OR ', $parts) . ')';
            case 'XOR':
                return implode(' XOR ', $parts);
            case 'AND':
            case 'OR':
            default:
                return implode(' ' . $operator . ' ', $parts);
        }
    }

    private function compileRule(array $rule, array &$joins): string
    {
        $field = $rule['field'] ?? '';
        if (!isset($this->whitelist[$field])) {
            throw new Exception('Access Denied: Un-whitelisted attribute string detected: ' . $field);
        }

        $mapping = $this->whitelist[$field];
        $column = $mapping['column'];
        $type = $mapping['type'];
        $joinKey = $mapping['join'];
        if ($joinKey !== null) {
            $joins[$joinKey] = true;
        }

        $opMap = [
            'EQUAL' => '=',
            'NOT_EQUAL' => '!=',
            'GREATER_THAN' => '>',
            'LESS_THAN' => '<',
            'GREATER_EQUAL' => '>=',
            'LESS_EQUAL' => '<=',
            'LIKE' => 'LIKE',
            'IN' => 'IN',
            'NOT_IN' => 'NOT IN'
        ];

        $ruleOp = strtoupper($rule['operator'] ?? '');
        if (!isset($opMap[$ruleOp])) {
            throw new Exception('Invalid query operator: ' . $ruleOp);
        }
        $sqlOp = $opMap[$ruleOp];
        $rawVal = $rule['value'] ?? null;

        if ($sqlOp === 'IN' || $sqlOp === 'NOT IN') {
            if (!is_array($rawVal)) {
                throw new Exception('Operator IN/NOT_IN expects array value.');
            }
            $sanitized = [];
            foreach ($rawVal as $val) {
                $sanitized[] = $this->sanitizeAndEscape($val, $type);
            }
            if (empty($sanitized)) {
                return ($sqlOp === 'IN') ? '0' : '1';
            }
            return $column . ' ' . $sqlOp . ' (' . implode(', ', $sanitized) . ')';
        }

        if (is_array($rawVal)) {
            throw new Exception('Scalar operator expects scalar value.');
        }

        if ($sqlOp === 'LIKE') {
            $escaped = '%' . str_replace(['%', '_'], ['\\%', '\\_'], SaaSSQLEscaper::escape((string)$rawVal)) . '%';
            return $column . ' LIKE \'' . $escaped . '\'';
        }

        $escapedValue = $this->sanitizeAndEscape($rawVal, $type);
        return $column . ' ' . $sqlOp . ' ' . $escapedValue;
    }

    private function sanitizeAndEscape($value, string $type): string
    {
        switch ($type) {
            case 'int':
                return (string)(int)$value;
            case 'float':
                return (string)(float)$value;
            case 'string':
            default:
                return '\'' . SaaSSQLEscaper::escape((string)$value) . '\'';
        }
    }
}
