<?php
namespace MassUtilityAdmin\Repository;

use PDO;

class LicenseRepository
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function getAllLicenses(): array
    {
        $sql = "SELECT l.*, u.email as user_email 
                FROM pm_licenses l
                LEFT JOIN pm_users u ON l.user_id = u.id
                ORDER BY l.id DESC";
        $stmt = $this->db->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function getAllUsers(): array
    {
        $stmt = $this->db->query("SELECT id, email, company_name, status, created_at FROM pm_users ORDER BY id DESC");
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function createUser(string $email, string $password, ?string $company): int
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_users WHERE email = ?");
        $checkStmt->execute([$email]);
        if ($checkStmt->fetch()) {
            throw new \Exception("A client account with this email address already exists.");
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO pm_users (email, password_hash, company_name) VALUES (?, ?, ?)");
        $stmt->execute([$email, $hash, $company]);
        return (int)$this->db->lastInsertId();
    }

    public function updateUser(int $id, string $email, ?string $company, string $status): bool
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_users WHERE email = ? AND id != ?");
        $checkStmt->execute([$email, $id]);
        if ($checkStmt->fetch()) {
            throw new \Exception("The email address '{$email}' is already registered to another client account.");
        }

        $stmt = $this->db->prepare("UPDATE pm_users SET email = ?, company_name = ?, status = ? WHERE id = ?");
        return $stmt->execute([$email, $company, $status, $id]);
    }

    public function resetUserPassword(int $id, string $newPassword): bool
    {
        if (strlen($newPassword) < 8) {
            throw new \Exception("Password must be at least 8 characters long.");
        }
        $hash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("UPDATE pm_users SET password_hash = ? WHERE id = ?");
        return $stmt->execute([$hash, $id]);
    }

    public function deleteUser(int $id): bool
    {
        // Safe 2-step unbind transaction: preserve licenses as standalone unassigned keys
        $this->db->prepare("UPDATE pm_licenses SET user_id = NULL WHERE user_id = ?")->execute([$id]);
        $stmt = $this->db->prepare("DELETE FROM pm_users WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function createLicense(int $userId, string $tier, ?string $expiry): string
    {
        $key = 'MASS-' . strtoupper(bin2hex(random_bytes(8))) . '-' . strtoupper(bin2hex(random_bytes(8)));
        $stmt = $this->db->prepare("INSERT INTO pm_licenses (user_id, license_key, package_tier, expires_at, status) VALUES (?, ?, ?, ?, 'active')");
        $stmt->execute([$userId, $key, $tier, $expiry]);
        return $key;
    }

    public function updateLicense(int $id, string $status, string $tier, ?string $expiry, ?string $storeUrl = null, ?int $userId = null): bool
    {
        if ($userId !== null) {
            $stmt = $this->db->prepare("UPDATE pm_licenses SET status = ?, package_tier = ?, expires_at = ?, store_url = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            return $stmt->execute([$status, $tier, $expiry, $storeUrl, $userId, $id]);
        }
        $stmt = $this->db->prepare("UPDATE pm_licenses SET status = ?, package_tier = ?, expires_at = ?, store_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$status, $tier, $expiry, $storeUrl, $id]);
    }

    public function deleteLicense(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM pm_licenses WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function verifyLicense(string $key, string $url): array
    {
        $stmt = $this->db->prepare("SELECT * FROM pm_licenses WHERE license_key = ?");
        $stmt->execute([$key]);
        $lic = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lic) {
            return ['valid' => false, 'message' => 'License key not found.'];
        }

        if ($lic['status'] !== 'active') {
            return ['valid' => false, 'message' => 'License key is suspended or expired.'];
        }

        if ($lic['expires_at'] && strtotime($lic['expires_at']) < time()) {
            return ['valid' => false, 'message' => 'License has expired.'];
        }

        // Bind URL if empty
        if (empty($lic['store_url'])) {
            $stmt = $this->db->prepare("UPDATE pm_licenses SET store_url = ? WHERE id = ?");
            $stmt->execute([$url, $lic['id']]);
            $lic['store_url'] = $url;
        } elseif ($lic['store_url'] !== $url) {
            return ['valid' => false, 'message' => 'License is registered to a different store domain.'];
        }

        $isDeveloper = ($lic['package_tier'] === 'developer' || $lic['package_tier'] === 'enterprise');
        $isPro = ($lic['package_tier'] === 'pro' || $isDeveloper);

        // Fetch custom tier capabilities dynamically
        $features = null;
        try {
            $stmtTier = $this->db->prepare("SELECT capabilities FROM pm_package_tiers WHERE name = ?");
            $stmtTier->execute([$lic['package_tier']]);
            $capsJson = $stmtTier->fetchColumn();
            if ($capsJson) {
                $caps = json_decode($capsJson, true);
                if (is_array($caps)) {
                    // Map capabilities with graceful fallback for older missing keys
                    $features = [
                        'PM_ENABLE_FILE_TOOLS' => isset($caps['PM_ENABLE_FILE_TOOLS']) ? (int)$caps['PM_ENABLE_FILE_TOOLS'] : 1,
                        'PM_ENABLE_DB_TOOLS' => isset($caps['PM_ENABLE_DB_TOOLS']) ? (int)$caps['PM_ENABLE_DB_TOOLS'] : 1,
                        'PM_ENABLE_QUERY_WIZARD' => isset($caps['query_visual_execute']) ? (int)$caps['query_visual_execute'] : ($isDeveloper ? 1 : 0),
                        'PM_ENABLE_GHOST_PURGER' => isset($caps['PM_ENABLE_GHOST_PURGER']) ? (int)$caps['PM_ENABLE_GHOST_PURGER'] : 1,
                        'PM_ENABLE_HISTORY' => isset($caps['PM_ENABLE_HISTORY']) ? (int)$caps['PM_ENABLE_HISTORY'] : 1,
                        'PM_ENABLE_GDPR_SWEEPER' => isset($caps['PM_ENABLE_GDPR_SWEEPER']) ? (int)$caps['PM_ENABLE_GDPR_SWEEPER'] : 1,
                        'capabilities' => [
                            'backup_destinations' => $caps['backup_destinations'] ?? ($isPro ? ['local', 'gdrive'] : ['local']),
                            'backup_automation' => $caps['backup_automation'] ?? $isPro,
                            'rollback_history_limit' => $caps['rollback_history_limit'] ?? ($isDeveloper ? 999 : ($isPro ? 10 : 0)),
                            'query_visual_execute' => $caps['query_visual_execute'] ?? $isPro,
                            'governor_autopilot' => $caps['governor_autopilot'] ?? $isPro,
                            'sweeper_execution' => $caps['sweeper_execution'] ?? $isPro
                        ]
                    ];
                }
            }
        } catch (\Throwable $e) {}

        // Fallback default features if dynamic fetch failed entirely (e.g. table empty)
        if (!$features) {
            $features = [
                'PM_ENABLE_FILE_TOOLS' => 1,
                'PM_ENABLE_DB_TOOLS' => 1,
                'PM_ENABLE_QUERY_WIZARD' => $isDeveloper ? 1 : 0,
                'PM_ENABLE_GHOST_PURGER' => 1,
                'PM_ENABLE_HISTORY' => 1,
                'PM_ENABLE_GDPR_SWEEPER' => 1,
                'capabilities' => [
                    'backup_destinations' => $isPro ? ['local', 'gdrive'] : ['local'],
                    'backup_automation' => $isPro,
                    'rollback_history_limit' => $isDeveloper ? 999 : ($isPro ? 10 : 0),
                    'query_visual_execute' => $isPro,
                    'governor_autopilot' => $isPro,
                    'sweeper_execution' => $isPro
                ]
            ];
        }

        $secureToken = hash_hmac('sha256', $lic['license_key'] . ':' . ($lic['store_url'] ?? $url), 'pm_secure_bridge_secret_key_2026');
        return [
            'valid' => true,
            'tier' => $lic['package_tier'],
            'secure_token' => $secureToken,
            'capabilities' => $features['capabilities'],
            'features' => $features
        ];
    }

    public function getAllTiers(): array
    {
        $stmt = $this->db->query("SELECT * FROM pm_package_tiers ORDER BY name ASC");
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function saveTier(string $name, array $capabilities): bool
    {
        $stmt = $this->db->prepare("INSERT INTO pm_package_tiers (name, capabilities, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET capabilities = excluded.capabilities, updated_at = CURRENT_TIMESTAMP");
        return $stmt->execute([$name, json_encode($capabilities)]);
    }

    public function deleteTier(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM pm_package_tiers WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getAllCompanies(): array
    {
        $sql = "SELECT c.*, 
                (SELECT COUNT(*) FROM pm_users u WHERE u.company_id = c.id) as user_count,
                (SELECT COUNT(*) FROM pm_licenses l WHERE l.company_id = c.id) as license_count
                FROM pm_companies c
                ORDER BY c.id DESC";
        $stmt = $this->db->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function createCompany(string $name, ?string $taxId = null, int $maxLicenses = 10): int
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_companies WHERE company_name = ?");
        $checkStmt->execute([$name]);
        if ($checkStmt->fetch()) {
            throw new \Exception("A company profile with this name already exists.");
        }

        $stmt = $this->db->prepare("INSERT INTO pm_companies (company_name, tax_id, max_licenses) VALUES (?, ?, ?)");
        $stmt->execute([$name, $taxId, $maxLicenses]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCompany(int $id, string $name, ?string $taxId, int $maxLicenses, string $status): bool
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_companies WHERE company_name = ? AND id != ?");
        $checkStmt->execute([$name, $id]);
        if ($checkStmt->fetch()) {
            throw new \Exception("A company with the name '{$name}' already exists.");
        }

        $oldStmt = $this->db->prepare("SELECT company_name FROM pm_companies WHERE id = ?");
        $oldStmt->execute([$id]);
        $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
        $oldName = $oldRow['company_name'] ?? null;

        $stmt = $this->db->prepare("UPDATE pm_companies SET company_name = ?, tax_id = ?, max_licenses = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $res = $stmt->execute([$name, $taxId, $maxLicenses, $status, $id]);

        if ($res && $oldName && $oldName !== $name) {
            $this->db->prepare("UPDATE pm_users SET company_name = ? WHERE company_name = ?")->execute([$name, $oldName]);
        }
        return $res;
    }

    public function deleteCompany(int $id): bool
    {
        $oldStmt = $this->db->prepare("SELECT company_name FROM pm_companies WHERE id = ?");
        $oldStmt->execute([$id]);
        $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);
        $oldName = $oldRow['company_name'] ?? null;

        if ($oldName) {
            $this->db->prepare("UPDATE pm_users SET company_name = NULL, company_id = NULL WHERE company_name = ? OR company_id = ?")->execute([$oldName, $id]);
        } else {
            $this->db->prepare("UPDATE pm_users SET company_name = NULL, company_id = NULL WHERE company_id = ?")->execute([$id]);
        }
        $this->db->prepare("UPDATE pm_licenses SET company_id = NULL WHERE company_id = ?")->execute([$id]);
        $stmt = $this->db->prepare("DELETE FROM pm_companies WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
