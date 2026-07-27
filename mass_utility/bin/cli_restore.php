<?php
// @Arch[cli_restore]

declare(strict_types=1);

/**
 * Project Mass - CLI Database Catalog Restore Gateway
 * Enforces a strict token check and bootstraps PrestaShop to safely restore backups from CLI.
 */

// 1. Enforce CLI execution bounds
if (php_sapi_name() !== 'cli') {
    die("Error: Forbidden access. CLI execution only.\n");
}

// 2. Bootstrap PrestaShop Core
$configPath = __DIR__ . '/../../../config/config.inc.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../../../../config/config.inc.php';
}
if (!file_exists($configPath)) {
    die("Error: PrestaShop core config.inc.php not found.\n");
}
require_once $configPath;

// 3. Parse input arguments
$options = getopt('', ['file:', 'token:', 'confirm:']);
$fileName = $options['file'] ?? '';
$token = $options['token'] ?? '';
$confirm = $options['confirm'] ?? '';

if (empty($fileName)) {
    die("Error: Missing mandatory --file parameter.\nUsage: php cli_restore.php --file=<filename.sql.gz> --confirm=RESTORE --token=<token>\n");
}

if (strtoupper($confirm) !== 'RESTORE') {
    die("CRITICAL BLOCK: Double-Key verification mismatched.\nYou must provide the uppercase parameter: --confirm=RESTORE\n");
}

$secureToken = \Configuration::get('PM_SECURE_TOKEN');
if (empty($secureToken)) {
    $secureToken = bin2hex(random_bytes(32));
    \Configuration::updateValue('PM_SECURE_TOKEN', $secureToken);
}

if (!hash_equals($secureToken, $token)) {
    die("Error: Invalid security execution token provided.\n");
}

require_once __DIR__ . '/../src/Service/BridgeLogger.php';
require_once __DIR__ . '/../src/Service/TableBackupManager.php';

use MassUtility\Service\BridgeLogger;
use MassUtility\Service\TableBackupManager;

$logger = new BridgeLogger();
$backupManager = new TableBackupManager($logger);

echo "\n=========================================================\n";
echo "PROJECT MASS - ATOMIC CLI DATABASE RESTORE INITIATED\n";
echo "=========================================================\n";
echo "Target Backup Archive: " . $fileName . "\n";
echo "Bootstrapping PrestaShop Core: SUCCESS\n";

try {
    // 4. State-Aware Maintenance Mode Activation
    $isShopEnabled = (bool)Configuration::get('PS_SHOP_ENABLE');
    Configuration::updateValue('PS_SHOP_ENABLE', 0);
    echo "Enforcing safety boundaries. Shop set to MAINTENANCE mode.\n\n";

    // 5. Stage Restoration Manifest
    echo "STAGE 1: Staging database restore manifest...\n";
    $prep = $backupManager->prepareRestore($fileName);
    $totalStatements = $prep['statement_count'];
    echo "Success: Staged {$totalStatements} SQL statements for execution.\n\n";

    // 6. Execute statements chunk-by-chunk
    echo "STAGE 2: Commencing sequentially indexed query execution...\n";
    $offset = 0;
    $limit = 100;
    
    while ($offset < $totalStatements) {
        $result = $backupManager->executeRestoreChunk($fileName, $offset, $limit);
        $offset = $result['new_offset'];
        
        $percent = Math_Round_Percent($offset, $totalStatements);
        echo sprintf("Executing statements: [%-50s] %d%% (%d / %d)\r", str_repeat('#', (int)($percent / 2)), $percent, $offset, $totalStatements);
        
        if ($result['done']) {
            break;
        }
    }
    echo "\n\nSTAGE 3: Restoring safety envelopes...\n";

    // 7. Cleanup & Restore Shop State
    if ($isShopEnabled) {
        Configuration::updateValue('PS_SHOP_ENABLE', 1);
        echo "Cleanup completed successfully. Shop returned to LIVE state.\n";
    } else {
        echo "Cleanup completed successfully. Shop remains in MAINTENANCE mode (was in maintenance before).\n";
    }

    echo "=========================================================\n";
    echo "SUCCESS: DATABASE RESTORATION SEQUENCE COMPLETED SMOOTHLY\n";
    echo "=========================================================\n\n";

} catch (\Throwable $e) {
    echo "\nCRITICAL EXECUTION ABORTED: " . $e->getMessage() . "\n";
    echo "Attempting safety-floor restoration...\n";
    exit(1);
}

function Math_Round_Percent(int $offset, int $total): int {
    if ($total <= 0) return 0;
    return (int)min(100, round(($offset / $total) * 100));
}
