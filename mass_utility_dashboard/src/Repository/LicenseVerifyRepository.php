<?php
// @Arch[LicenseVerifyRepository]

declare(strict_types=1);

namespace MassUtility\Dashboard\Repository;

use PDO;
use Exception;

/**
 * Encapsulates user verification and license key binding queries against the SQLite database.
 */
class LicenseVerifyRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        if ($pdo !== null) {
            $this->pdo = $pdo;
        } else {
            $dbPath = dirname(dirname(__DIR__)) . '/data/pm_cloud_backups.db';
            $this->pdo = new PDO('sqlite:' . $dbPath);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
    }

    /**
     * Finds a user account by email.
     */
    public function findUserByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare("SELECT * FROM pm_users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    /**
     * Finds or binds an active license for a user and store URL.
     */
    public function findOrBindLicense(int $userId, string $storeUrl): ?array
    {
        // 1. Check for existing license assigned to this domain or unassigned
        $stmt = $this->pdo->prepare("SELECT * FROM pm_licenses WHERE user_id = ? AND (store_url = ? OR store_url IS NULL)");
        $stmt->execute([$userId, $storeUrl]);
        $lic = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lic) {
            // Check for unassigned license key
            $stmt = $this->pdo->prepare("SELECT * FROM pm_licenses WHERE user_id = ? AND (store_url IS NULL OR store_url = '') LIMIT 1");
            $stmt->execute([$userId]);
            $lic = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($lic) {
                $this->bindLicenseToStore((int)$lic['id'], $storeUrl);
                $lic['store_url'] = $storeUrl;
            }
        } elseif (empty($lic['store_url'])) {
            $this->bindLicenseToStore((int)$lic['id'], $storeUrl);
            $lic['store_url'] = $storeUrl;
        }

        return $lic ?: null;
    }

    /**
     * Binds a license ID to a store URL.
     */
    public function bindLicenseToStore(int $licenseId, string $storeUrl): bool
    {
        $stmt = $this->pdo->prepare("UPDATE pm_licenses SET store_url = ? WHERE id = ?");
        return $stmt->execute([$storeUrl, $licenseId]);
    }
}
