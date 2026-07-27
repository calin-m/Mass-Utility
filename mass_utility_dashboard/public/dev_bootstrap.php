<?php
// @Arch[dev_bootstrap]

declare(strict_types=1);

/**
 * dev_bootstrap.php: Sandbox Developer Helper for Local Testing
 * Seeds SQLite PM_BRIDGE_URL and PM_BRIDGE_TOKEN and establishes a mock session.
 * 
 * ⚠️ WARNING: This script is strictly for local development and sandbox environments.
 * It is secured to run only under localhost/127.0.0.1.
 */

$remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
$httpHost = $_SERVER['HTTP_HOST'] ?? '';
$hostClean = explode(':', $httpHost)[0];

// Allow loopback (127.0.0.1, ::1), private subnet ranges (RFC 1918), or localhost hosts
$isLocal = in_array($remoteAddr, ['127.0.0.1', '::1'])
    || ($remoteAddr && filter_var($remoteAddr, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false)
    || in_array($hostClean, ['localhost', '127.0.0.1', '::1']);

if (!$isLocal) {
    header('HTTP/1.1 403 Forbidden');
    echo "<h1>403 Forbidden</h1>";
    echo "<p>This developer utility can only be run in local sandbox or development environments.</p>";
    exit;
}

require_once dirname(__DIR__) . '/autoload.php';

$logger = new \MassUtility\SaaS\Service\Logger();
$sqliteManager = new \MassUtility\SaaS\Service\SQLiteConnectionManager($logger);
$settingsRepo = new \MassUtility\SaaS\Service\TenantSettingsRepository($sqliteManager, $logger);

// 1. Detect Local PrestaShop configs to automatically capture Bridge Secure Token
$detectedToken = '';
try {
    $setupWizard = new \MassUtility\SaaS\Service\SetupWizard(dirname(__DIR__));
    $dbParams = $setupWizard->detectLocalPrestaShop();
    if ($dbParams) {
        $host = $dbParams['database_host'] ?? 'localhost';
        $port = $dbParams['database_port'] ?? '3306';
        $dbName = $dbParams['database_name'] ?? '';
        $user = $dbParams['database_user'] ?? '';
        $pass = $dbParams['database_password'] ?? '';
        $prefix = $dbParams['database_prefix'] ?? 'ps_';

        if (!empty($dbName) && !empty($user)) {
            $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
            $pdo = new \PDO($dsn, $user, $pass, [
                \PDO::ATTR_TIMEOUT => 3,
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
            ]);
            $stmt = $pdo->prepare("SELECT `value` FROM `{$prefix}configuration` WHERE `name` = 'PM_SECURE_TOKEN'");
            $stmt->execute();
            $dbToken = $stmt->fetchColumn();
            if ($dbToken !== false && !empty($dbToken)) {
                $detectedToken = (string)$dbToken;
            }
        }
    }
} catch (\Throwable $e) {
    // Fail silently
}

// 2. Set default parameters if not provided via GET query
$bridgeUrl = $_GET['bridge_url'] ?? $settingsRepo->get('PM_BRIDGE_URL') ?? '';
if (empty($bridgeUrl)) {
    // Guess default local layout
    $bridgeUrl = 'http://localhost/mass_utility/modules/mass_utility/api.php';
}

$bridgeToken = $_GET['bridge_token'] ?? $detectedToken ?: $settingsRepo->get('PM_BRIDGE_TOKEN') ?: 'test_secure_token_xyz_456';

// 3. Write parameters into SQLite tenant_settings table
$settingsRepo->set('PM_BRIDGE_URL', $bridgeUrl);
$settingsRepo->set('PM_BRIDGE_TOKEN', $bridgeToken);

// 4. Force establish active employee session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$_SESSION['employee_id'] = 1;

// 5. Redirect back to clean index.php dashboard
header("Location: index.php");
exit;
