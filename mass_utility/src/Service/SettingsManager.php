<?php
declare(strict_types=1);

namespace MassUtility\Service;

if (!defined('_PS_VERSION_')) {
    exit;
}

use Configuration;

/**
 * SettingsManager
 * Securely wraps PrestaShop's native Configuration system to govern "Swiss Army Knife" platform settings.
 */
class SettingsManager
{
    // Tuning
    const PM_GOVERNOR_MODE = 'PM_GOVERNOR_MODE';
    const PM_FILE_EXCLUSIONS = 'PM_FILE_EXCLUSIONS';
    const PM_FILE_CHUNK_MB = 'PM_FILE_CHUNK_MB';
    const PM_DB_CHUNK_ROWS = 'PM_DB_CHUNK_ROWS';
    
    // Toggles
    const PM_ENABLE_FILE_TOOLS = 'PM_ENABLE_FILE_TOOLS';
    const PM_ENABLE_DB_TOOLS = 'PM_ENABLE_DB_TOOLS';
    const PM_ENABLE_GHOST_PURGER = 'PM_ENABLE_GHOST_PURGER';
    const PM_ENABLE_GDPR_SWEEPER = 'PM_ENABLE_GDPR_SWEEPER';
    const PM_ENABLE_QUERY_WIZARD = 'PM_ENABLE_QUERY_WIZARD';
    const PM_ENABLE_HISTORY = 'PM_ENABLE_HISTORY';
    
    // Google Drive
    const PM_GDRIVE_DEFAULT_DOWNLOAD = 'PM_GDRIVE_DEFAULT_DOWNLOAD';

    // UI & Appearance
    const PM_UI_FONT = 'PM_UI_FONT';
    const PM_UI_THEME = 'PM_UI_THEME';

    // Safety & Quotas
    const PM_DEFAULT_DRY_RUN = 'PM_DEFAULT_DRY_RUN';
    const PM_CUSTOM_DISK_QUOTA_GB = 'PM_CUSTOM_DISK_QUOTA_GB';
    const PM_BACKUP_MAX_COUNT = 'PM_BACKUP_MAX_COUNT';
    const PM_BACKUP_MAX_DAYS = 'PM_BACKUP_MAX_DAYS';
    const PM_BACKUP_CLOUD_MAX_COUNT = 'PM_BACKUP_CLOUD_MAX_COUNT';
    const PM_BACKUP_CLOUD_MAX_DAYS = 'PM_BACKUP_CLOUD_MAX_DAYS';
    const PM_BACKUP_FREQUENCY = 'PM_BACKUP_FREQUENCY';
    const PM_BACKUP_CRON_AUTO = 'PM_BACKUP_CRON_AUTO';
    const PM_CLEANUP_BACKUPS = 'PM_CLEANUP_BACKUPS';
    const PM_LICENSE_KEY = 'PM_LICENSE_KEY';
    const PM_LICENSE_TOKEN = 'PM_LICENSE_TOKEN';
    const PM_LICENSE_SIGNATURE = 'PM_LICENSE_SIGNATURE';

    // Defaults
    private static $defaults = [
        self::PM_GOVERNOR_MODE => "auto",
        self::PM_FILE_EXCLUSIONS => "/var/cache/\n/img/tmp/",
        self::PM_FILE_CHUNK_MB => "60",
        self::PM_DB_CHUNK_ROWS => "5000",
        self::PM_ENABLE_FILE_TOOLS => "1",
        self::PM_ENABLE_DB_TOOLS => "1",
        self::PM_ENABLE_GHOST_PURGER => "0", 
        self::PM_ENABLE_GDPR_SWEEPER => "0", 
        self::PM_ENABLE_QUERY_WIZARD => "1",
        self::PM_ENABLE_HISTORY => "1",
        self::PM_GDRIVE_DEFAULT_DOWNLOAD => "cloud",
        self::PM_DEFAULT_DRY_RUN => "1",
        self::PM_UI_FONT => "system-ui, -apple-system, sans-serif",
        self::PM_UI_THEME => "classic",
        self::PM_CUSTOM_DISK_QUOTA_GB => "0",
        self::PM_BACKUP_MAX_COUNT => "0",
        self::PM_BACKUP_MAX_DAYS => "0",
        self::PM_BACKUP_CLOUD_MAX_COUNT => "0",
        self::PM_BACKUP_CLOUD_MAX_DAYS => "0",
        self::PM_BACKUP_FREQUENCY => "0",
        self::PM_BACKUP_CRON_AUTO => "1",
        self::PM_CLEANUP_BACKUPS => "1",
        self::PM_LICENSE_KEY => "",
        self::PM_LICENSE_TOKEN => "",
        self::PM_LICENSE_SIGNATURE => "",
    ];

    /**
     * Retrieve all settings injected with their fallbacks if missing.
     */
    public function getAllSettings(): array
    {
        $settings = [];
        foreach (self::$defaults as $key => $defaultValue) {
            $val = Configuration::getGlobalValue($key);
            $settings[$key] = ($val !== false) ? $val : $defaultValue;
        }

        $status = $this->getLicenseStatus();
        foreach ($status['features'] as $featKey => $unlocked) {
            if ($unlocked === 0) {
                $settings[$featKey] = "0"; // Force override to disabled
            }
        }
        return $settings;
    }

    /**
     * Update settings cleanly and securely.
     */
    public function updateSettings(array $newSettings): bool
    {
        foreach ($newSettings as $key => $val) {
            if (array_key_exists($key, self::$defaults)) {
                Configuration::updateGlobalValue($key, (string)$val);
            }
        }
        return true;
    }

    /**
     * Fetch a specific setting value.
     */
    public function getSetting(string $key): ?string
    {
        if (!array_key_exists($key, self::$defaults)) {
            return null;
        }

        $status = $this->getLicenseStatus();
        if (isset($status['features'][$key]) && $status['features'][$key] === 0) {
            return "0"; // Force override to disabled
        }

        $val = Configuration::getGlobalValue($key);
        return (string)(($val !== false) ? $val : self::$defaults[$key]);
    }

    public function getLicenseStatus(): array
    {
        $token = Configuration::getGlobalValue(self::PM_LICENSE_TOKEN);
        $signature = Configuration::getGlobalValue(self::PM_LICENSE_SIGNATURE);

        if (empty($token) || empty($signature)) {
            return $this->getUnlicensedDefaults();
        }

        $payloadJson = base64_decode($token);
        if ($payloadJson === false) {
            return $this->getUnlicensedDefaults();
        }

        // Validate HMAC signature
        $secret = getenv('PM_LICENSE_SIGN_SECRET') ?: 'default_master_sign_secret_key_123';
        $expectedSignature = hash_hmac('sha256', $payloadJson, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            return $this->getUnlicensedDefaults(); // Signature tampered! Fail closed.
        }

        $data = json_decode($payloadJson, true);
        if (!is_array($data)) {
            return $this->getUnlicensedDefaults();
        }

        // Check expiration
        if (isset($data['expires_at']) && strtotime($data['expires_at']) < time()) {
            return $this->getUnlicensedDefaults(); // Expired!
        }

        // Check domain bounds
        $host = $_SERVER['HTTP_HOST'] ?? '';
        if (($pos = strpos($host, ':')) !== false) {
            $host = substr($host, 0, $pos);
        }
        $tokenHost = $data['store_url'] ?? '';
        if (($pos = strpos($tokenHost, ':')) !== false) {
            $tokenHost = substr($tokenHost, 0, $pos);
        }

        if (strcasecmp($tokenHost, $host) !== 0 && $tokenHost !== 'localhost' && $host !== 'localhost' && $tokenHost !== '127.0.0.1' && $host !== '127.0.0.1') {
             return $this->getUnlicensedDefaults(); // Domain mismatch!
        }

        return [
            'valid' => true,
            'tier' => $data['tier'] ?? 'basic',
            'features' => $data['features'] ?? []
        ];
    }

    private function getUnlicensedDefaults(): array
    {
        return [
            'valid' => false,
            'tier' => 'basic',
            'features' => [
                'PM_ENABLE_FILE_TOOLS' => 0,
                'PM_ENABLE_DB_TOOLS' => 1, // Only basic DB backup allowed
                'PM_ENABLE_QUERY_WIZARD' => 0,
                'PM_ENABLE_GHOST_PURGER' => 0,
                'PM_ENABLE_GDPR_SWEEPER' => 0
            ]
        ];
    }
}
