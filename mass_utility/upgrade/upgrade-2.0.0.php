<?php
declare(strict_types=1);

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Project Mass - client upgrade ETL script.
 * Migrates local SQLite settings and history logs to the standalone SaaS database.
 */
function upgrade_module_2_0_0(Module $module): bool
{
    $dbPath = _PS_MODULE_DIR_ . $module->name . '/.sandbox/mass_utility.sqlite';
        if (!file_exists($dbPath)) {
            $dbPath = _PS_MODULE_DIR_ . 'project_mass/.sandbox/project_mass.sqlite';
        }
    if (!file_exists($dbPath)) {
        // Nothing to import
        return true;
    }

    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Fetch settings from ps_configuration
        $bridgeUrl = Configuration::get('PM_SAAS_BRIDGE_URL');
        if (empty($bridgeUrl)) {
            // Fallback default SaaS endpoint
            $bridgeUrl = 'http://localhost:8000';
        }
        $endpoint = rtrim($bridgeUrl, '/') . '/api/v1/import-legacy-state';

        // 1. Fetch presets
        $presets = [];
        try {
            $stmt = $pdo->query("SELECT * FROM mass_update_presets");
            $presets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            // Table might not exist yet
        }

        // 2. Fetch history logs
        $logs = [];
        try {
            $stmt = $pdo->query("SELECT * FROM mass_update_log");
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            // Table might not exist yet
        }

        // 3. Fetch backups
        $backups = [];
        try {
            $stmt = $pdo->query("SELECT * FROM pm_cloud_backups");
            $backups = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            // Table might not exist yet
        }

        // Send presets in chunked requests
        $presetChunks = array_chunk($presets, 50);
        foreach ($presetChunks as $chunk) {
            sendPayload($endpoint, [
                'type' => 'presets',
                'data' => $chunk,
                'complete' => false
            ]);
        }

        // Send logs in chunked requests
        $logChunks = array_chunk($logs, 50);
        foreach ($logChunks as $chunk) {
            sendPayload($endpoint, [
                'type' => 'logs',
                'data' => $chunk,
                'complete' => false
            ]);
        }

        // Send backups in chunked requests
        $backupChunks = array_chunk($backups, 50);
        foreach ($backupChunks as $chunk) {
            sendPayload($endpoint, [
                'type' => 'backups',
                'data' => $chunk,
                'complete' => false
            ]);
        }

        // Send completion ping
        sendPayload($endpoint, [
            'type' => 'completion',
            'data' => [],
            'complete' => true
        ]);

        // Purge the local SQLite sandbox folder only on success
        $files = [$dbPath, $dbPath . '-wal', $dbPath . '-shm'];
        foreach ($files as $file) {
            if (file_exists($file)) {
                @unlink($file);
            }
        }
        @rmdir(dirname($dbPath));

        return true;
    } catch (Throwable $e) {
        if (class_exists('PrestaShopLogger')) {
            PrestaShopLogger::addLog('MassUtility Upgrade Error: ' . $e->getMessage(), 3);
        }
        return false;
    }
}

function sendPayload(string $url, array $payload): void
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Bridge-Version: 1.0.0'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("SaaS import endpoint returned HTTP status code: " . $httpCode);
    }
}
