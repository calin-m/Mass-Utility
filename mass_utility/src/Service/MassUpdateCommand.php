<?php
declare(strict_types=1);

namespace MassUtility\Service;

use Db;
use Exception;
use MassUtility\Service\BridgeLogger;
use MassUtility\Service\MassUpdateLogRepository;
use MassUtility\Service\TransactionProcessor;
use MassUtility\Engine\QueryTranslationEngine;

/**
 * The CLI proxy that parses external headless JSON payloads, locking `.cli_mutate.lock`.
 */
class MassUpdateCommand
{
    private BridgeLogger $logger;
    private MassUpdateLogRepository $repository;
    private TransactionProcessor $processor;
    private string $secureToken = '';
    private $lockHandle = null;

    public function __construct(
        BridgeLogger $logger,
        MassUpdateLogRepository $repository,
        TransactionProcessor $processor
    ) {
        $this->logger = $logger;
        $this->repository = $repository;
        $this->processor = $processor;

        $token = \Configuration::get('PM_SECURE_TOKEN');
        if (empty($token)) {
            $token = bin2hex(random_bytes(32));
            \Configuration::updateValue('PM_SECURE_TOKEN', $token);
        }
        $this->secureToken = $token;
    }

    /**
     * Executes cron mutations based on JSON payload and token authorization.
     *
     * @param string $payloadJsonPath Path to the JSON payload file
     * @param string $authToken Security token for authorization
     * @param int $idShop PrestaShop Shop ID context
     * @return array Result matrix
     * @throws Exception
     */
    public function executeCommand(string $payloadJsonPath, string $authToken, int $idShop): array
    {
        $this->logger->log("Initiating CLI cron execution command.", 'INFO');

        // 1. Authorization validation check
        if (!hash_equals($this->secureToken, $authToken)) {
            $this->logger->log("CLI Mutation Authorization Failed: Invalid token provided.", 'ERROR');
            throw new Exception("Forbidden: Invalid authorization execution token.");
        }

        // 2. Mutex Scan A: Process Mutex Scan via flock()
        $lockFile = __DIR__ . '/../../.cli_mutate.lock';
        $this->lockHandle = fopen($lockFile, 'c');
        if (!$this->lockHandle) {
            throw new Exception("Environmental safety check failed: Unable to open CLI lock file.");
        }

        if (!flock($this->lockHandle, LOCK_EX | LOCK_NB)) {
            $this->logger->log("CLI Mutation Blocked: Parallel cli_mutate.php cron execution detected via lock file.", 'WARNING');
            throw new Exception("Environmental safety check failed: Another instance of cli_mutate.php is currently running.");
        }

        // 3. Mutex Scan B: SHOW FULL PROCESSLIST active locks query
        $db = Db::getInstance(true);
        $processList = [];
        try {
            $processList = $db->executeS('SHOW FULL PROCESSLIST');
        } catch (\Throwable $e) {
            $this->logger->log("Processlist check skipped due to restricted shared hosting permissions.", 'WARNING');
        }

        if (is_array($processList)) {
            foreach ($processList as $proc) {
                $state = isset($proc['State']) ? strtolower((string)$proc['State']) : '';
                $info = isset($proc['Info']) ? strtolower((string)$proc['Info']) : '';
                
                // Block if another query is waiting for metadata locks or transaction locks
                if (strpos($state, 'lock') !== false || strpos($state, 'waiting for') !== false) {
                    $this->logger->log("CLI Mutation Blocked: Active database locks detected in PROCESSLIST: " . ($proc['Info'] ?? 'N/A'), 'WARNING');
                    throw new Exception("Environmental safety check failed: Active database locks detected in process list.");
                }
                
                // Block if another process is running alter or writing on target tables to avoid race hazards
                if (strpos($info, 'update') !== false || strpos($info, 'alter table') !== false || strpos($info, 'delete from') !== false) {
                    if (preg_match('/(product|specific_price|category_product)/i', $info)) {
                        $this->logger->log("CLI Mutation Blocked: Active write query detected on target tables: " . $proc['Info'], 'WARNING');
                        throw new Exception("Environmental safety check failed: Active write query detected on target tables in process list.");
                    }
                }
            }
        }

        // 4. Ingest and validate JSON payload file
        if (!file_exists($payloadJsonPath)) {
            throw new Exception("JSON AST payload file not found: " . $payloadJsonPath);
        }

        $jsonContent = file_get_contents($payloadJsonPath);
        if ($jsonContent === false) {
            throw new Exception("Failed to read JSON payload file.");
        }

        $payload = json_decode($jsonContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON AST payload format: " . json_last_error_msg());
        }

        // Validate payload keys
        if (!isset($payload['criteria'])) {
            throw new Exception("Missing 'criteria' AST rule definition in JSON payload.");
        }
        if (!isset($payload['actions'])) {
            throw new Exception("Missing 'actions' mutation dictionary in JSON payload.");
        }

        $criteria = $payload['criteria'];
        $actions = $payload['actions'];

        // 5. Compile query and translate AST selection to product IDs
        require_once __DIR__ . '/SaaSSQLEscaper.php';
        require_once __DIR__ . '/../Engine/QueryTranslationEngine.php';
        $engine = new QueryTranslationEngine(_DB_PREFIX_);
        
        // Resolve target product IDs
        $context = \Context::getContext();
        $idLang = (int)($context->language->id ?? 1);
        
        $this->logger->log("Compiling AST query inside CLI Command worker context.", 'INFO');
        $productIds = $engine->execute($criteria, $idLang, $idShop);

        if (empty($productIds)) {
            $this->logger->log("CLI Mutation complete: 0 products match the selected criteria.", 'INFO');
            return [
                'success' => true,
                'affected_count' => 0,
                'message' => 'No products match the selected criteria.'
            ];
        }

        // 6. Execute atomic transactional mutations
        $jobId = 'job_cli_' . uniqid((string)time(), false);
        $this->logger->log("Executing CLI mutations inside secure InnoDB transaction for " . count($productIds) . " products.", 'INFO');
        
        $result = $this->processor->executeMutation($productIds, $actions, $idShop, $jobId);
        
        $this->logger->log("CLI cron mutation transaction completed successfully. Affected rows: " . ($result['affected_count'] ?? 0), 'INFO');
        return $result;
    }
}
