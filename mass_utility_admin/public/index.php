<?php
declare(strict_types=1);
session_start();

require_once dirname(__DIR__) . '/src/Service/AdminSettingsManager.php';
require_once dirname(__DIR__) . '/src/Repository/LicenseRepository.php';
require_once dirname(__DIR__) . '/src/Controller/AdminApiController.php';

// Auto-Migration Bootstrapper & First-Time Setup Check
$dbPath = dirname(__DIR__) . '/data/pm_admin.db';
$dbDir = dirname($dbPath);
if (!is_dir($dbDir)) {
    @mkdir($dbDir, 0755, true);
}
@chmod($dbDir, 0755);

$htaccessPath = $dbDir . '/.htaccess';
if (!file_exists($htaccessPath)) {
    @file_put_contents($htaccessPath, "Require all denied\nDeny from all\n");
}

if (file_exists($dbPath)) {
    @chmod($dbPath, 0644);
}

$hasAdmin = false;
if (file_exists($dbPath) && filesize($dbPath) > 0) {
    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_TIMEOUT, 10);
        try {
            $pdo->exec('PRAGMA journal_mode = WAL;'); // nosec
            $pdo->exec('PRAGMA busy_timeout = 10000;'); // nosec
        } catch (\Throwable $t) {}

        // Ensure pm_package_tiers table exists and is seeded (Self-healing repair)
        try {
            $pdo->exec( // nosec
                "CREATE TABLE IF NOT EXISTS pm_package_tiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(64) UNIQUE NOT NULL,
                capabilities TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"
            );

            $stmtTiersCount = $pdo->query("SELECT COUNT(*) FROM pm_package_tiers");
            if ($stmtTiersCount && $stmtTiersCount->fetchColumn() == 0) {
                $defaultTiers = [
                    'basic' => [
                        'backup_destinations' => ['local'],
                        'backup_automation' => false,
                        'rollback_history_limit' => 0,
                        'query_visual_execute' => false,
                        'governor_autopilot' => false,
                        'sweeper_execution' => false
                    ],
                    'pro' => [
                        'backup_destinations' => ['local', 'gdrive'],
                        'backup_automation' => true,
                        'rollback_history_limit' => 10,
                        'query_visual_execute' => true,
                        'governor_autopilot' => true,
                        'sweeper_execution' => true
                    ],
                    'developer' => [
                        'backup_destinations' => ['local', 'gdrive'],
                        'backup_automation' => true,
                        'rollback_history_limit' => 999,
                        'query_visual_execute' => true,
                        'governor_autopilot' => true,
                        'sweeper_execution' => true
                    ]
                ];
                
                $insertTier = $pdo->prepare("INSERT OR IGNORE INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
                foreach ($defaultTiers as $name => $caps) {
                    $insertTier->execute([$name, json_encode($caps)]);
                }
            }
        } catch (\Exception $writeEx) {
            // Silence write permission locks so read-only admin checks still succeed
        }

        // Sanity check on pm_admins table
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM pm_admins");
            $hasAdmin = ($stmt && (int)$stmt->fetchColumn() > 0);
        } catch (\Exception $tblEx) {
            // Table pm_admins does not exist yet (fresh install state) -> show setup wizard
            $hasAdmin = false;
        }
    } catch (\Exception $e) {
        // If file is locked, allow setup or retry gracefully
        $hasAdmin = false;
    }
}



$auth = new \MassUtilityAdmin\Service\AdminSettingsManager();

$action = $_GET['action'] ?? '';

// Public Licensing Verification / Activation Endpoint (Used by client modules & SaaS Dashboard)
if ($action === 'activate_key' || $action === 'verify_license' || $action === 'activate' || $action === 'api_activate_key') {
    header('Content-Type: application/json');
    $key = trim($_POST['license_key'] ?? $_GET['license_key'] ?? '');
    $storeUrl = trim($_POST['store_url'] ?? $_GET['store_url'] ?? ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    if (empty($key)) {
        echo json_encode(['success' => false, 'error' => 'License key is required.']);
        exit;
    }
    $repo = new \MassUtilityAdmin\Repository\LicenseRepository($auth->getDbConnection());
    $result = $repo->verifyLicense($key, $storeUrl);
    if (!empty($result['valid'])) {
        $result['success'] = true;
    } else {
        $result['success'] = false;
        $result['error'] = $result['message'] ?? 'Invalid license key or activation failed.';
    }
    echo json_encode($result);
    exit;
}

// API Dispatcher
if (str_starts_with($action, 'api_')) {
    header('Content-Type: application/json');
    $publicApiActions = ['api_status', 'api_login', 'api_setup'];
    if (!$auth->isAuthenticated() && !in_array($action, $publicApiActions, true)) {
        echo json_encode(['success' => false, 'error' => 'Unauthenticated session. Please log in again.']);
        exit;
    }
    $controller = new \MassUtilityAdmin\Controller\AdminApiController($auth);
    $controller->execute($action);
    exit;
}

// Compute dynamic basePath for subfolder-safe React SPA asset loading
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$scriptDir = rtrim(dirname($scriptName), '/\\');
$basePath = (str_ends_with($scriptDir, '/public') || str_ends_with($scriptDir, '\public'))
    ? substr($scriptDir, 0, -7)
    : $scriptDir;

// Dynamic Asset Discovery (glob scanner for compiled Vite bundles)
$assetsDir = __DIR__ . '/v2/assets';
$jsFiles = glob($assetsDir . '/index-*.js');
$cssFiles = glob($assetsDir . '/index-*.css');

$jsFile = !empty($jsFiles) ? basename($jsFiles[0]) : '';
$cssFile = !empty($cssFiles) ? basename($cssFiles[0]) : '';

$jsVersion = !empty($jsFiles) && file_exists($jsFiles[0]) ? filemtime($jsFiles[0]) : time();
$cssVersion = !empty($cssFiles) && file_exists($cssFiles[0]) ? filemtime($cssFiles[0]) : time();

$jsUrl = $basePath . '/v2/assets/' . $jsFile . '?v=' . $jsVersion;
$cssUrl = $basePath . '/v2/assets/' . $cssFile . '?v=' . $cssVersion;

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mass Utility - Super Admin Portal</title>
    <script>
      (function() {
        var theme = localStorage.getItem('pm-theme');
        if (theme !== 'light') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      })();
    </script>
    <?php if ($cssFile): ?>
    <link rel="stylesheet" crossorigin href="<?= htmlspecialchars($cssUrl) ?>">
    <?php endif; ?>
    <?php if ($jsFile): ?>
    <script type="module" crossorigin src="<?= htmlspecialchars($jsUrl) ?>"></script>
    <?php endif; ?>
  </head>
  <body class="bg-pm-bg text-pm-text min-h-screen font-sans antialiased transition-colors duration-200">
    <div id="root"></div>
  </body>
</html>
<?php
exit;
