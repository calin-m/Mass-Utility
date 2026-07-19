<?php
/**
 * Project Mass - Native CLI Archiver
 *
 * This script bypasses PHP's ZipArchive constraints and memory limits
 * by leveraging the host OS's native `zip` or `tar` C-binaries.
 * Designed specifically for gigabyte-scale PrestaShop architectures.
 */
declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    die("Security Error: This script can only be executed via the Command Line Interface (CLI).\n");
}

// Bootstrap PrestaShop to read configuration
$configPath = __DIR__ . '/../../../config/config.inc.php';
if (!file_exists($configPath)) {
    $configPath = __DIR__ . '/../../../../config/config.inc.php';
}
if (file_exists($configPath)) {
    try {
        require_once $configPath;
    } catch (\Throwable $e) {}
}

if (class_exists('Configuration')) {
    $cronAuto = \Configuration::getGlobalValue('PM_BACKUP_CRON_AUTO');
    if ($cronAuto !== false && (int)$cronAuto === 0) {
        die("Info: Automated scheduled backups are disabled in settings. Exiting.\n");
    }

    $frequency = (int)\Configuration::getGlobalValue('PM_BACKUP_FREQUENCY');
    if ($frequency > 0) {
        $moduleDir = dirname(__DIR__);
        $backupDir = $moduleDir . '/backups/files/';
        $latestTime = 0;
        if (is_dir($backupDir)) {
            $files = glob($backupDir . 'site_backup_*', GLOB_ONLYDIR);
            if (is_array($files)) {
                foreach ($files as $fileDir) {
                    $base = basename($fileDir);
                    $tarPath = $fileDir . '/' . $base . '.tar';
                    if (file_exists($tarPath)) {
                        $mtime = filemtime($tarPath);
                        if ($mtime > $latestTime) {
                            $latestTime = $mtime;
                        }
                    }
                }
            }
        }

        if ($latestTime > 0 && (time() - $latestTime) < $frequency) {
            $timeLeft = $frequency - (time() - $latestTime);
            die("Info: Backup frequency throttle active. Last backup was " . (time() - $latestTime) . " seconds ago. Needs to wait " . $timeLeft . " more seconds. Exiting.\n");
        }
    }
}

$moduleDir = dirname(__DIR__);
$psRootDir = dirname($moduleDir, 2);
$backupDir = $moduleDir . '/backups/files/';

if (!is_dir($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// Parse arguments
$backupName = isset($argv[1]) ? trim($argv[1]) : 'cli_site_backup_' . time();
// Sanitize name to prevent path traversal
$backupName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $backupName);

echo "==============================================\n";
echo " Project Mass - Native CLI Archiver\n";
echo "==============================================\n";
echo "Target Source : {$psRootDir}\n";

$isWindows = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN');
$checkCmd = $isWindows ? 'where' : 'command -v';
$nullRedirect = $isWindows ? '2>NUL' : '2>/dev/null';

$zipAvailable = shell_exec("{$checkCmd} zip {$nullRedirect}"); // nosec
$tarAvailable = shell_exec("{$checkCmd} tar {$nullRedirect}"); // nosec

if ($zipAvailable) {
    $outFile = $backupDir . $backupName . '.zip';
    echo "Engine Mode   : Native ZIP (C-Binary)\n";
    echo "Destination   : {$outFile}\n";
    echo "Status        : Compressing... Please wait.\n";
    
    $startTime = microtime(true);
    // Execute zip quietly (-q) recursively (-r)
    // Ignore backups directory to prevent infinite recursion
    $excludeZip = '-x "*/' . basename($moduleDir) . '/backups/*"';
    $cmd = "cd " . escapeshellarg($psRootDir) . " && zip -r -q " . escapeshellarg($outFile) . " . " . $excludeZip;
    exec($cmd, $output, $returnVar); // nosec
    
    $duration = round(microtime(true) - $startTime, 2);
    
    if ($returnVar === 0) {
        echo "Status        : Calculating SHA-256 Hash...\n";
        $hash = hash_file('sha256', $outFile);
        file_put_contents($outFile . '.sha256', $hash);
        file_put_contents($outFile . '.metadata.json', json_encode(['duration' => $duration]));
        
        $filesize = round(filesize($outFile) / 1048576, 2);
        echo "✅ Success! Archive generated in {$duration} seconds.\n";
        echo "📁 Final Size : {$filesize} MB\n";
        echo "🔒 SHA-256    : {$hash}\n";
    } else {
        echo "❌ Error: ZIP process failed with exit code {$returnVar}.\n";
    }
} 
elseif ($tarAvailable) {
    $outFile = $backupDir . $backupName . '.tar.gz';
    echo "Engine Mode   : Native TAR.GZ (C-Binary)\n";
    echo "Destination   : {$outFile}\n";
    echo "Status        : Compressing... Please wait.\n";
    
    $startTime = microtime(true);
    // Ignore backups directory to prevent infinite recursion
    $excludeTar = '--exclude="*/' . basename($moduleDir) . '/backups"';
    $cmd = "cd " . escapeshellarg($psRootDir) . " && tar " . $excludeTar . " -czf " . escapeshellarg($outFile) . " .";
    exec($cmd, $output, $returnVar); // nosec
    
    $duration = round(microtime(true) - $startTime, 2);
    
    if ($returnVar === 0) {
        echo "Status        : Calculating SHA-256 Hash...\n";
        $hash = hash_file('sha256', $outFile);
        file_put_contents($outFile . '.sha256', $hash);
        file_put_contents($outFile . '.metadata.json', json_encode(['duration' => $duration]));
        
        $filesize = round(filesize($outFile) / 1048576, 2);
        echo "✅ Success! Archive generated in {$duration} seconds.\n";
        echo "📁 Final Size : {$filesize} MB\n";
        echo "🔒 SHA-256    : {$hash}\n";
    } else {
        echo "❌ Error: TAR process failed with exit code {$returnVar}.\n";
        echo "Detailed output:\n" . implode("\n", $output) . "\n";
    }
} 
else {
    echo "❌ Error: Neither 'zip' nor 'tar' binaries are installed on this server.\n";
    echo "Fallback: Please use the Web GUI to utilize PHP's internal ZipArchive engine.\n";
}

echo "==============================================\n";
