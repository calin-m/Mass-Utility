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
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO pm_users (email, password_hash, company_name) VALUES (?, ?, ?)");
        $stmt->execute([$email, $hash, $company]);
        return (int)$this->db->lastInsertId();
    }

    public function createLicense(int $userId, string $tier, ?string $expiry): string
    {
        $key = 'MASS-' . strtoupper(bin2hex(random_bytes(8))) . '-' . strtoupper(bin2hex(random_bytes(8)));
        $stmt = $this->db->prepare("INSERT INTO pm_licenses (user_id, license_key, package_tier, expires_at, status) VALUES (?, ?, ?, ?, 'active')");
        $stmt->execute([$userId, $key, $tier, $expiry]);
        return $key;
    }

    public function updateLicense(int $id, string $status, string $tier, ?string $expiry, ?string $storeUrl = null): bool
    {
        $stmt = $this->db->prepare("UPDATE pm_licenses SET status = ?, package_tier = ?, expires_at = ?, store_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$status, $tier, $expiry, $storeUrl, $id]);
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

        // Fetch custom tier capabilities dynamically
        $features = null;
        try {
            $stmtTier = $this->db->prepare("SELECT capabilities FROM pm_package_tiers WHERE name = ?");
            $stmtTier->execute([$lic['package_tier']]);
            $capsJson = $stmtTier->fetchColumn();
            if ($capsJson) {
                $caps = json_decode($capsJson, true);
                if (is_array($caps)) {
                    // Map capabilities to features array
                    $features = [
                        'PM_ENABLE_FILE_TOOLS' => 1,
                        'PM_ENABLE_DB_TOOLS' => 1,
                        'PM_ENABLE_QUERY_WIZARD' => 1,
                        'PM_ENABLE_GHOST_PURGER' => 1,
                        'PM_ENABLE_HISTORY' => 1,
                        'PM_ENABLE_GDPR_SWEEPER' => 1,
                        'capabilities' => $caps
                    ];
                }
            }
        } catch (\Throwable $e) {}

        // Fallback default features if dynamic fetch failed
        if (!$features) {
            $isDeveloper = ($lic['package_tier'] === 'developer');
            $isPro = ($lic['package_tier'] === 'pro' || $isDeveloper);
            $features = [
                'PM_ENABLE_FILE_TOOLS' => 1,
                'PM_ENABLE_DB_TOOLS' => 1,
                'PM_ENABLE_QUERY_WIZARD' => 1,
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

        return [
            'valid' => true,
            'tier' => $lic['package_tier'],
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
}
