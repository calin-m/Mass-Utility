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

    public function updateLicense(int $id, string $status, string $tier, ?string $expiry): bool
    {
        $stmt = $this->db->prepare("UPDATE pm_licenses SET status = ?, package_tier = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$status, $tier, $expiry, $id]);
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

        // Tier Feature Bitmaps
        $features = [
            'PM_ENABLE_FILE_TOOLS' => ($lic['package_tier'] === 'pro' || $lic['package_tier'] === 'developer') ? 1 : 0,
            'PM_ENABLE_DB_TOOLS' => 1,
            'PM_ENABLE_QUERY_WIZARD' => ($lic['package_tier'] === 'developer') ? 1 : 0,
            'PM_ENABLE_GHOST_PURGER' => ($lic['package_tier'] === 'pro' || $lic['package_tier'] === 'developer') ? 1 : 0,
            'PM_GDRIVE_SYNC' => ($lic['package_tier'] === 'pro' || $lic['package_tier'] === 'developer') ? 1 : 0,
            'PM_RETENTION_RULE' => ($lic['package_tier'] === 'pro' || $lic['package_tier'] === 'developer') ? 1 : 0
        ];

        return [
            'valid' => true,
            'tier' => $lic['package_tier'],
            'features' => $features
        ];
    }
}
