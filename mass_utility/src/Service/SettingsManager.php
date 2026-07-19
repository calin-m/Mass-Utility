<?php
declare(strict_types=1);

namespace MassUtility\Service;

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

    // Safety & Quotas
    const PM_DEFAULT_DRY_RUN = 'PM_DEFAULT_DRY_RUN';
    const PM_CUSTOM_DISK_QUOTA_GB = 'PM_CUSTOM_DISK_QUOTA_GB';

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
        self::PM_CUSTOM_DISK_QUOTA_GB => "0",
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
        $val = Configuration::getGlobalValue($key);
        return (string)(($val !== false) ? $val : self::$defaults[$key]);
    }
}
