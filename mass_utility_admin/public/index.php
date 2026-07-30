<?php
// @Arch[index]

declare(strict_types=1);
session_start();

require_once dirname(__DIR__) . '/src/Service/SQLiteConnectionManager.php';
require_once dirname(__DIR__) . '/src/Service/AdminSettingsManager.php';
require_once dirname(__DIR__) . '/src/Repository/LicenseRepository.php';
require_once dirname(__DIR__) . '/src/Controller/AdminApiController.php';

use MassUtilityAdmin\Service\SQLiteConnectionManager;

// Auto-Migration Bootstrapper & First-Time Setup Check
$hasAdmin = false;
try {
    $pdo = SQLiteConnectionManager::getConnection();

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

            $defaultTiers = [
                'basic' => [
                    'PM_ENABLE_DB_TOOLS' => false,
                    'PM_ENABLE_FILE_TOOLS' => false,
                    'PM_ENABLE_GHOST_PURGER' => true,
                    'PM_ENABLE_GDPR_SWEEPER' => true,
                    'PM_ENABLE_HISTORY' => true,
                    'query_visual_filter' => false,
                    'query_visual_compile' => false,
                    'query_visual_mutate' => false,
                    'db_tools_export' => true,
                    'db_tools_backup' => false,
                    'db_diff_inspector' => false,
                    'db_tools_restore' => false,
                    'file_tools_browse' => true,
                    'file_tools_backup' => false,
                    'file_diff_inspector' => false,
                    'backup_automation' => false,
                    'governor_telemetry' => true,
                    'governor_autopilot' => false,
                    'sweeper_execution' => false,
                    'rollback_history_limit' => 5,
                    'max_bound_domains' => 1,
                    'max_cloud_backups' => 3,
                    'max_daily_sweeper_runs' => 1,
                    'backup_destinations' => ['local'],
                ],
                'pro' => [
                    'PM_ENABLE_DB_TOOLS' => true,
                    'PM_ENABLE_FILE_TOOLS' => true,
                    'PM_ENABLE_GHOST_PURGER' => true,
                    'PM_ENABLE_GDPR_SWEEPER' => true,
                    'PM_ENABLE_HISTORY' => true,
                    'query_visual_filter' => true,
                    'query_visual_compile' => true,
                    'query_visual_mutate' => false,
                    'db_tools_export' => true,
                    'db_tools_backup' => true,
                    'db_diff_inspector' => false,
                    'db_tools_restore' => true,
                    'file_tools_browse' => true,
                    'file_tools_backup' => true,
                    'file_diff_inspector' => false,
                    'backup_automation' => true,
                    'governor_telemetry' => true,
                    'governor_autopilot' => false,
                    'sweeper_execution' => false,
                    'rollback_history_limit' => 15,
                    'max_bound_domains' => 5,
                    'max_cloud_backups' => 10,
                    'max_daily_sweeper_runs' => 5,
                    'backup_destinations' => ['local', 'gdrive'],
                ],
                'enterprise' => [
                    'PM_ENABLE_DB_TOOLS' => true,
                    'PM_ENABLE_FILE_TOOLS' => true,
                    'PM_ENABLE_GHOST_PURGER' => true,
                    'PM_ENABLE_GDPR_SWEEPER' => true,
                    'PM_ENABLE_HISTORY' => true,
                    'PM_ENABLE_SECURITY_HEALTH' => true,
                    'multi_shop_scope' => true,
                    'query_visual_filter' => true,
                    'query_visual_compile' => true,
                    'query_visual_mutate' => true,
                    'db_tools_export' => true,
                    'db_tools_backup' => true,
                    'db_diff_inspector' => true,
                    'db_tools_restore' => true,
                    'file_tools_browse' => true,
                    'file_tools_backup' => true,
                    'file_diff_inspector' => true,
                    'backup_automation' => true,
                    'governor_telemetry' => true,
                    'governor_autopilot' => true,
                    'sweeper_execution' => true,
                    'rollback_history_limit' => 50,
                    'max_bound_domains' => 50,
                    'max_cloud_backups' => 50,
                    'max_daily_sweeper_runs' => 24,
                    'backup_destinations' => ['local', 'gdrive'],
                ],
                'developer' => [
                    'PM_ENABLE_DB_TOOLS' => true,
                    'PM_ENABLE_FILE_TOOLS' => true,
                    'PM_ENABLE_GHOST_PURGER' => true,
                    'PM_ENABLE_GDPR_SWEEPER' => true,
                    'PM_ENABLE_HISTORY' => true,
                    'PM_ENABLE_SECURITY_HEALTH' => true,
                    'multi_shop_scope' => true,
                    'query_visual_filter' => true,
                    'query_visual_compile' => true,
                    'query_visual_mutate' => true,
                    'db_tools_export' => true,
                    'db_tools_backup' => true,
                    'db_diff_inspector' => true,
                    'db_tools_restore' => true,
                    'file_tools_browse' => true,
                    'file_tools_backup' => true,
                    'file_diff_inspector' => true,
                    'backup_automation' => true,
                    'governor_telemetry' => true,
                    'governor_autopilot' => true,
                    'sweeper_execution' => true,
                    'rollback_history_limit' => 999,
                    'max_bound_domains' => 999,
                    'max_cloud_backups' => 999,
                    'max_daily_sweeper_runs' => 999,
                    'backup_destinations' => ['local', 'gdrive'],
                ]
            ];
            
            $chkTier = $pdo->prepare("SELECT COUNT(*) FROM pm_package_tiers WHERE LOWER(name) = LOWER(?)");
            $insertTier = $pdo->prepare("INSERT OR IGNORE INTO pm_package_tiers (name, capabilities) VALUES (?, ?)");
            foreach ($defaultTiers as $name => $caps) {
                $chkTier->execute([$name]);
                if ((int)$chkTier->fetchColumn() === 0) {
                    $insertTier->execute([$name, json_encode($caps)]);
                }
            }
        } catch (\Exception $writeEx) {
            // Log warning if write locks or permissions delay table seeding while allowing read checks to succeed
            error_log('[Mass Utility Admin] Notice: Auto-seeding pm_package_tiers skipped: ' . $writeEx->getMessage());
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
    $publicApiActions = ['api_status', 'api_login', 'api_setup', 'api_user_login', 'api_user_verify', 'api_send_password_reset_link', 'api_verify_reset_token', 'api_complete_password_reset'];
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
$publicPrefix = (str_ends_with($scriptDir, '/public') || str_ends_with($scriptDir, '\public'))
    ? $scriptDir
    : $scriptDir . '/public';

// Dynamic Asset Discovery (glob scanner for compiled Vite bundles, sorted by newest timestamp)
$assetsDir = __DIR__ . '/v2/assets';
$jsFiles = glob($assetsDir . '/index-*.js') ?: [];
$cssFiles = glob($assetsDir . '/index-*.css') ?: [];
if (!empty($jsFiles)) {
    usort($jsFiles, fn($a, $b) => filemtime($b) <=> filemtime($a));
}
if (!empty($cssFiles)) {
    usort($cssFiles, fn($a, $b) => filemtime($b) <=> filemtime($a));
}

$jsFile = !empty($jsFiles) ? basename($jsFiles[0]) : '';
$cssFile = !empty($cssFiles) ? basename($cssFiles[0]) : '';

$jsVersion = !empty($jsFiles) && file_exists($jsFiles[0]) ? filemtime($jsFiles[0]) : time();
$cssVersion = !empty($cssFiles) && file_exists($cssFiles[0]) ? filemtime($cssFiles[0]) : time();

$jsUrl = $publicPrefix . '/v2/assets/' . $jsFile . '?v=' . $jsVersion;
$cssUrl = $publicPrefix . '/v2/assets/' . $cssFile . '?v=' . $cssVersion;

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
