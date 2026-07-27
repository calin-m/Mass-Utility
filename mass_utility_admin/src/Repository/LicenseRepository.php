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
        $sql = "SELECT l.*, 
                COALESCE(l.company_id, u.company_id) as company_id_resolved,
                c.company_name as company_name,
                u.email as user_email,
                u.name as user_name
                FROM pm_licenses l
                LEFT JOIN pm_companies c ON (l.company_id = c.id OR (l.company_id IS NULL AND l.user_id IS NOT NULL AND c.id = (SELECT company_id FROM pm_users WHERE id = l.user_id)))
                LEFT JOIN pm_users u ON l.user_id = u.id
                ORDER BY l.id DESC";
        $stmt = $this->db->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function getAllUsers(): array
    {
        $stmt = $this->db->query("SELECT id, name, email, company_name, company_id, role, status, created_at FROM pm_users ORDER BY id DESC");
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function createUser(string $email, string $password, ?string $company, ?string $name = null, ?string $role = 'Owner'): int
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_users WHERE email = ?");
        $checkStmt->execute([$email]);
        if ($checkStmt->fetch()) {
            throw new \Exception("A client account with this email address already exists.");
        }

        $companyId = null;
        if (!empty($company)) {
            $cStmt = $this->db->prepare("SELECT id FROM pm_companies WHERE company_name = ?");
            $cStmt->execute([$company]);
            $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) $companyId = (int)$cRow['id'];
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO pm_users (name, email, password_hash, company_name, company_id, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $email, $hash, $company, $companyId, $role]);
        return (int)$this->db->lastInsertId();
    }

    public function updateUser(int $id, string $email, ?string $company, string $status, ?string $name = null, ?string $role = null): bool
    {
        $checkStmt = $this->db->prepare("SELECT id FROM pm_users WHERE email = ? AND id != ?");
        $checkStmt->execute([$email, $id]);
        if ($checkStmt->fetch()) {
            throw new \Exception("The email address '{$email}' is already registered to another client account.");
        }

        // Fetch current user details to check for company transfer
        $currStmt = $this->db->prepare("SELECT company_name, company_id FROM pm_users WHERE id = ?");
        $currStmt->execute([$id]);
        $currUser = $currStmt->fetch(PDO::FETCH_ASSOC);

        $newCompanyId = null;
        if (!empty($company)) {
            $cStmt = $this->db->prepare("SELECT id FROM pm_companies WHERE company_name = ?");
            $cStmt->execute([$company]);
            $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $newCompanyId = (int)$cRow['id'];
            }
        }

        // If user is transferring companies, unbind keys from user so keys STAY with old company pool
        if ($currUser && !empty($currUser['company_id']) && $newCompanyId !== (int)$currUser['company_id']) {
            $unbindStmt = $this->db->prepare("UPDATE pm_licenses SET user_id = NULL WHERE user_id = ? AND company_id = ?");
            $unbindStmt->execute([$id, $currUser['company_id']]);
        }

        $stmt = $this->db->prepare("UPDATE pm_users SET name = COALESCE(?, name), email = ?, company_name = ?, company_id = ?, status = ?, role = COALESCE(?, role) WHERE id = ?");
        return $stmt->execute([$name, $email, $company, $newCompanyId, $status, $role, $id]);
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
        // 0. Pre-fetch Client-owned licenses to notify store webhooks upon deletion
        $stmtFetch = $this->db->prepare("SELECT license_key, store_url FROM pm_licenses WHERE user_id = ? AND (company_id IS NULL OR company_id = 0)");
        $stmtFetch->execute([$id]);
        $revokedLics = $stmtFetch->fetchAll(PDO::FETCH_ASSOC);

        $this->db->beginTransaction();
        try {
            // 1. Delete Client-owned licenses (where company_id IS NULL)
            $stmtDelLic = $this->db->prepare("DELETE FROM pm_licenses WHERE user_id = ? AND (company_id IS NULL OR company_id = 0)");
            $stmtDelLic->execute([$id]);

            // 2. Unassign Company-owned licenses (where company_id IS NOT NULL), preserving key with Company
            $stmtUnbind = $this->db->prepare("UPDATE pm_licenses SET user_id = NULL WHERE user_id = ? AND company_id IS NOT NULL AND company_id > 0");
            $stmtUnbind->execute([$id]);

            // 3. Delete Client user account
            $stmtUser = $this->db->prepare("DELETE FROM pm_users WHERE id = ?");
            $res = $stmtUser->execute([$id]);

            $this->db->commit();

            if ($res && !empty($revokedLics)) {
                $this->notifyRevocation($revokedLics);
            }
            return $res;
        } catch (\Throwable $t) {
            $this->db->rollBack();
            throw $t;
        }
    }

    public function createLicense(?int $companyId, ?int $userId, string $tier, ?string $expiry): string
    {
        if ($companyId === null && $userId !== null) {
            $stmtUser = $this->db->prepare("SELECT company_id FROM pm_users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $uRow = $stmtUser->fetch(PDO::FETCH_ASSOC);
            if ($uRow && !empty($uRow['company_id'])) {
                $companyId = (int)$uRow['company_id'];
            }
        }

        $key = 'MASS-' . strtoupper(bin2hex(random_bytes(8))) . '-' . strtoupper(bin2hex(random_bytes(8)));
        $stmt = $this->db->prepare("INSERT INTO pm_licenses (company_id, user_id, license_key, package_tier, expires_at, status) VALUES (?, ?, ?, ?, ?, 'active')");
        $stmt->execute([$companyId, $userId, $key, $tier, $expiry]);
        return $key;
    }

    public function assignLicense(int $licenseId, ?int $userId, ?string $storeUrl = null): bool
    {
        $cleanStoreUrl = !empty($storeUrl) ? trim($storeUrl) : null;
        if ($userId === null) {
            $stmt = $this->db->prepare("UPDATE pm_licenses SET user_id = NULL, store_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            return $stmt->execute([$cleanStoreUrl, $licenseId]);
        }
        $stmt = $this->db->prepare("UPDATE pm_licenses SET user_id = ?, store_url = COALESCE(?, store_url), updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$userId, $cleanStoreUrl, $licenseId]);
    }

    public function updateLicense(int $id, string $status, ?string $tier, ?string $expiry, ?string $storeUrl = null, ?int $userId = null, ?int $companyId = null): bool
    {
        $cleanStoreUrl = null;
        if (!empty($storeUrl)) {
            $raw = trim($storeUrl);
            $parsed = [];
            if (str_starts_with($raw, '[')) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $d) {
                        $n = $this->normalizeDomainHost($d);
                        if (!empty($n)) $parsed[] = $n;
                    }
                }
            } else {
                $parts = preg_split('/[\n,]+/', $raw);
                if (is_array($parts)) {
                    foreach ($parts as $d) {
                        $n = $this->normalizeDomainHost($d);
                        if (!empty($n)) $parsed[] = $n;
                    }
                }
            }

            $uniqueDomains = array_values(array_unique($parsed));
            if (count($uniqueDomains) > 1) {
                $cleanStoreUrl = json_encode($uniqueDomains, JSON_UNESCAPED_SLASHES);
            } elseif (count($uniqueDomains) === 1) {
                $cleanStoreUrl = $uniqueDomains[0];
            }
        }

        // If companyId is not explicitly provided but userId is given, resolve company_id from user
        if ($companyId === null && $userId !== null) {
            $uStmt = $this->db->prepare("SELECT company_id FROM pm_users WHERE id = ?");
            $uStmt->execute([$userId]);
            $cVal = $uStmt->fetchColumn();
            if ($cVal !== false && $cVal !== null) {
                $companyId = (int)$cVal;
            }
        }

        $stmt = $this->db->prepare("UPDATE pm_licenses SET status = ?, package_tier = COALESCE(NULLIF(?, ''), package_tier), expires_at = ?, store_url = ?, user_id = ?, company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$status, $tier, $expiry, $cleanStoreUrl, $userId, $companyId, $id]);
    }

    public function deleteLicense(int $id): bool
    {
        $stmtFetch = $this->db->prepare("SELECT license_key, store_url FROM pm_licenses WHERE id = ?");
        $stmtFetch->execute([$id]);
        $lic = $stmtFetch->fetch(PDO::FETCH_ASSOC);

        $stmt = $this->db->prepare("DELETE FROM pm_licenses WHERE id = ?");
        $res = $stmt->execute([$id]);

        if ($res && $lic) {
            $this->notifyRevocation([$lic]);
        }
        return $res;
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

        // Multi-Domain Host Normalization & Verification (Company, Client, and Standalone keys)
        $incomingDomain = $this->normalizeDomainHost($url);
        $rawStoreUrl = $lic['store_url'] ?? '';

        $boundDomains = [];
        $decoded = json_decode($rawStoreUrl, true);
        if (is_array($decoded)) {
            foreach ($decoded as $d) {
                $norm = $this->normalizeDomainHost($d);
                if (!empty($norm)) {
                    $boundDomains[] = $norm;
                }
            }
        } else {
            $norm = $this->normalizeDomainHost($rawStoreUrl);
            if (!empty($norm)) {
                $boundDomains[] = $norm;
            }
        }

        if (empty($boundDomains)) {
            // Bind domain host on first activation
            $stmt = $this->db->prepare("UPDATE pm_licenses SET store_url = ? WHERE id = ?");
            $stmt->execute([$incomingDomain, $lic['id']]);
            $lic['store_url'] = $incomingDomain;
        } elseif (!in_array($incomingDomain, $boundDomains, true)) {
            $displayList = implode(', ', $boundDomains);
            return ['valid' => false, 'message' => "License is registered to a different store domain ({$displayList})."];
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
        $sql = "SELECT t.*, 
                (SELECT COUNT(*) FROM pm_licenses l WHERE LOWER(l.package_tier) = LOWER(t.name)) as active_licenses 
                FROM pm_package_tiers t 
                ORDER BY t.name ASC";
        $stmt = $this->db->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (is_array($res)) {
            foreach ($res as &$row) {
                $row['active_licenses'] = (int)($row['active_licenses'] ?? 0);
                if (isset($row['capabilities']) && is_string($row['capabilities'])) {
                    $decoded = json_decode($row['capabilities'], true);
                    $row['capabilities'] = is_array($decoded) ? $decoded : [];
                }
            }
        }
        return is_array($res) ? $res : [];
    }

    public function saveTier(string $name, array $capabilities, ?int $id = null): bool
    {
        if ($id && $id > 0) {
            // Update tier name on bound licenses if tier name changes
            $stmtOld = $this->db->prepare("SELECT name FROM pm_package_tiers WHERE id = ?");
            $stmtOld->execute([$id]);
            $oldName = trim((string)$stmtOld->fetchColumn());
            if (!empty($oldName) && strtolower($oldName) !== strtolower($name)) {
                $stmtMigrate = $this->db->prepare("UPDATE pm_licenses SET package_tier = ? WHERE LOWER(package_tier) = LOWER(?)");
                $stmtMigrate->execute([$name, $oldName]);
            }

            $stmt = $this->db->prepare("UPDATE pm_package_tiers SET name = ?, capabilities = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            return $stmt->execute([$name, json_encode($capabilities), $id]);
        }

        $stmt = $this->db->prepare("INSERT INTO pm_package_tiers (name, capabilities, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET capabilities = excluded.capabilities, updated_at = CURRENT_TIMESTAMP");
        return $stmt->execute([$name, json_encode($capabilities)]);
    }

    public function deleteTier(int $id): bool
    {
        $stmtCheck = $this->db->prepare("SELECT name FROM pm_package_tiers WHERE id = ?");
        $stmtCheck->execute([$id]);
        $tierName = trim((string)$stmtCheck->fetchColumn());

        if (!empty($tierName)) {
            // Auto-migrate any active assigned licenses to basic fallback before deletion
            $stmtMigrate = $this->db->prepare("UPDATE pm_licenses SET package_tier = 'basic' WHERE LOWER(package_tier) = LOWER(?)");
            $stmtMigrate->execute([$tierName]);
        }

        $stmt = $this->db->prepare("DELETE FROM pm_package_tiers WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getAllCompanies(): array
    {
        $sql = "SELECT c.*, 
                (SELECT COUNT(*) FROM pm_users u WHERE u.company_id = c.id OR (u.company_name IS NOT NULL AND LOWER(u.company_name) = LOWER(c.company_name))) as user_count,
                (SELECT COUNT(*) FROM pm_licenses l 
                 JOIN pm_users u2 ON l.user_id = u2.id
                 WHERE u2.company_id = c.id OR (u2.company_name IS NOT NULL AND LOWER(u2.company_name) = LOWER(c.company_name))) as license_count
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

        // Pre-fetch all licenses bound to this company OR its users before deletion
        $revokedLics = [];
        try {
            if ($oldName) {
                $stmtFetch = $this->db->prepare("SELECT license_key, store_url FROM pm_licenses WHERE company_id = ? OR user_id IN (SELECT id FROM pm_users WHERE company_id = ? OR (company_name IS NOT NULL AND LOWER(company_name) = LOWER(?)))");
                $stmtFetch->execute([$id, $id, $oldName]);
            } else {
                $stmtFetch = $this->db->prepare("SELECT license_key, store_url FROM pm_licenses WHERE company_id = ? OR user_id IN (SELECT id FROM pm_users WHERE company_id = ?)");
                $stmtFetch->execute([$id, $id]);
            }
            $revokedLics = $stmtFetch->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $t) {}

        $this->db->beginTransaction();
        try {
            // 1. Delete all Company-owned licenses AND licenses assigned to the company's users
            $this->db->prepare("DELETE FROM pm_licenses WHERE company_id = ?")->execute([$id]);

            // 2. Delete all Clients assigned to this company
            if ($oldName) {
                // Delete licenses bound to users being deleted
                $this->db->prepare("DELETE FROM pm_licenses WHERE user_id IN (SELECT id FROM pm_users WHERE company_id = ? OR (company_name IS NOT NULL AND LOWER(company_name) = LOWER(?)))")->execute([$id, $oldName]);
                $this->db->prepare("DELETE FROM pm_users WHERE company_id = ? OR (company_name IS NOT NULL AND LOWER(company_name) = LOWER(?))")->execute([$id, $oldName]);
            } else {
                $this->db->prepare("DELETE FROM pm_licenses WHERE user_id IN (SELECT id FROM pm_users WHERE company_id = ?)")->execute([$id]);
                $this->db->prepare("DELETE FROM pm_users WHERE company_id = ?")->execute([$id]);
            }

            // 3. Delete Company record
            $stmt = $this->db->prepare("DELETE FROM pm_companies WHERE id = ?");
            $res = $stmt->execute([$id]);

            $this->db->commit();

            if ($res && !empty($revokedLics)) {
                $this->notifyRevocation($revokedLics);
            }
            return $res;
        } catch (\Throwable $t) {
            $this->db->rollBack();
            throw $t;
        }
    }

    private function notifyRevocation(array $licensesToRevoke): void
    {
        foreach ($licensesToRevoke as $lic) {
            $key = $lic['license_key'] ?? '';
            $rawUrl = $lic['store_url'] ?? '';
            if (empty($key)) continue;

            // 1. Instantly synchronize deletion with Dashboard SQLite DB
            try {
                $dashDbPath = dirname(dirname(__DIR__)) . '/mass_utility_dashboard/data/pm_cloud_backups.db';
                if (!file_exists($dashDbPath)) {
                    $dashDbPath = dirname(dirname(dirname(__DIR__))) . '/mass_utility_dashboard/data/pm_cloud_backups.db';
                }
                if (file_exists($dashDbPath)) {
                    $dashPdo = new \PDO('sqlite:' . $dashDbPath);
                    $dashPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
                    $dashStmt = $dashPdo->prepare("DELETE FROM pm_licenses WHERE license_key = ?");
                    $dashStmt->execute([$key]);

                    // Also wipe license keys from tenant settings table
                    $dashDel = $dashPdo->prepare("DELETE FROM tenant_settings WHERE key IN ('PM_LICENSE_KEY', 'PM_LICENSE_TOKEN', 'PM_LICENSE_TIER')");
                    $dashDel->execute();
                }
            } catch (\Throwable $t) {}

            // 2. Real-Time Push Revocation Webhooks to BOTH Store Module AND Standalone Dashboard
            if (!empty($rawUrl)) {
                $domains = json_decode($rawUrl, true);
                if (!is_array($domains)) {
                    $domains = [$rawUrl];
                }

                foreach ($domains as $domain) {
                    $domain = trim($domain);
                    if (empty($domain)) continue;

                    $scheme = (strpos($domain, 'http') === 0) ? '' : 'https://';
                    $baseDomainUrl = rtrim($scheme . $domain, '/');

                    // Target 1: PrestaShop Store Module Webhook
                    $moduleWebhookUrl = $baseDomainUrl . '/modules/mass_utility/api.php?action=revoke_license';

                    // Target 2: Dashboard SaaS Webhook
                    $dashboardWebhookUrl = $baseDomainUrl . '/mass_utility_dashboard/public/index.php?action=revoke_license';

                    $webhookEndpoints = [$moduleWebhookUrl, $dashboardWebhookUrl];

                    foreach ($webhookEndpoints as $targetUrl) {
                        try {
                            $ch = curl_init($targetUrl);
                            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                            curl_setopt($ch, CURLOPT_POST, true);
                            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                                'license_key' => $key,
                                'timestamp' => time()
                            ]));
                            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
                            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                            curl_exec($ch);
                            curl_close($ch);
                        } catch (\Throwable $t) {}
                    }
                }
            }
        }
    }

    public function extendLicenseExpiration(int $id, ?int $addMonths = null, ?string $customDate = null): bool
    {
        $stmt = $this->db->prepare("SELECT expires_at FROM pm_licenses WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new \Exception("License not found.");
        }

        $newDate = null;
        if ($customDate !== null && trim($customDate) !== '') {
            $newDate = date('Y-m-d H:i:s', strtotime($customDate));
        } elseif ($addMonths !== null) {
            $baseTime = (!empty($row['expires_at']) && strtotime($row['expires_at']) > time())
                ? strtotime($row['expires_at'])
                : time();
            $newDate = date('Y-m-d H:i:s', strtotime("+{$addMonths} months", $baseTime));
        }

        $updateStmt = $this->db->prepare("UPDATE pm_licenses SET expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $updateStmt->execute([$newDate, $id]);
    }

    public function updateLicenseDomains(int $id, array $domains): bool
    {
        $cleaned = array_values(array_unique(array_filter(array_map('trim', $domains))));
        $encoded = !empty($cleaned) ? json_encode($cleaned, JSON_UNESCAPED_SLASHES) : null;
        $stmt = $this->db->prepare("UPDATE pm_licenses SET store_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        return $stmt->execute([$encoded, $id]);
    }

    public function logAdminAction(string $adminUsername, string $actionType, string $targetEntity, ?string $targetId, array $details, string $ipAddress = '127.0.0.1'): bool
    {
        try {
            $stmt = $this->db->prepare("INSERT INTO pm_admin_logs (admin_username, action_type, target_entity, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)");
            return $stmt->execute([
                $adminUsername,
                $actionType,
                $targetEntity,
                $targetId,
                json_encode($details, JSON_UNESCAPED_SLASHES),
                $ipAddress
            ]);
        } catch (\Throwable $t) {
            return false;
        }
    }

    public function getAdminLogs(?string $search = null, ?string $actionType = null, int $limit = 100, int $offset = 0): array
    {
        $where = [];
        $params = [];
        if ($search !== null && trim($search) !== '') {
            $where[] = "(admin_username LIKE ? OR target_id LIKE ? OR details LIKE ?)";
            $s = '%' . trim($search) . '%';
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
        }
        if ($actionType !== null && trim($actionType) !== '' && $actionType !== 'ALL') {
            $where[] = "action_type = ?";
            $params[] = trim($actionType);
        }

        $sql = "SELECT * FROM pm_admin_logs";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY id DESC LIMIT " . (int)$limit . " OFFSET " . (int)$offset;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            $row['details_parsed'] = !empty($row['details']) ? json_decode($row['details'], true) : [];
            return $row;
        }, is_array($rows) ? $rows : []);
    }

    public function clearAdminLogs(): bool
    {
        try {
            $stmt = $this->db->prepare("DELETE FROM pm_admin_logs");
            return $stmt->execute();
        } catch (\PDOException $e) {
            error_log("[MassUtilityAdmin] Failed to clear admin logs: " . $e->getMessage());
            return false;
        }
    }

    private function normalizeDomainHost(?string $url): string
    {
        if (empty($url)) {
            return '';
        }
        $host = strtolower(trim($url));
        $host = preg_replace('/^https?:\/\//i', '', $host);
        $host = preg_replace('/^www\./i', '', $host);
        $host = strtok($host, '/');
        $host = strtok($host, ':'); // Strip port numbers
        return trim((string)$host);
    }

    public function authenticateUser(string $email, string $password): ?array
    {
        $stmt = $this->db->prepare("SELECT u.*, c.company_name as resolved_company_name FROM pm_users u LEFT JOIN pm_companies c ON u.company_id = c.id WHERE u.email = ? AND u.status = 'active'");
        $stmt->execute([trim($email)]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password_hash'])) {
            // Update last_login_at timestamp
            $up = $this->db->prepare("UPDATE pm_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?");
            $up->execute([$user['id']]);

            unset($user['password_hash']);
            $user['permissions'] = $this->getUserPermissions((int)$user['id'], $user['role'] ?? 'Observer');
            return $user;
        }

        return null;
    }

    public function getUserPermissions(int $userId, string $roleSlug = 'Observer'): array
    {
        // Fetch role permissions via join
        $sql = "SELECT p.slug FROM pm_permissions p 
                JOIN pm_role_permissions rp ON p.id = rp.permission_id 
                JOIN pm_roles r ON rp.role_id = r.id 
                WHERE r.slug = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$roleSlug]);
        $perms = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($perms)) {
            // Fallback default permissions based on role slug
            $map = [
                'SuperAdmin' => ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'],
                'CompanyAdmin' => ['ast.query', 'ast.mutate', 'db.backup', 'db.restore', 'db.drop', 'files.backup', 'files.delete', 'settings.update', 'users.manage'],
                'CatalogManager' => ['ast.query', 'ast.mutate', 'db.backup', 'files.backup'],
                'Operator' => ['ast.query', 'db.backup', 'files.backup'],
                'Observer' => ['ast.query'],
            ];
            $perms = $map[$roleSlug] ?? ['ast.query'];
        }

        return array_values(array_unique($perms));
    }

    public function createSessionToken(int $userId, ?string $ipAddress = null, ?string $userAgent = null): string
    {
        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));

        $stmt = $this->db->prepare("INSERT INTO pm_user_sessions (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $tokenHash, $ipAddress, $userAgent, $expiresAt]);

        return $rawToken;
    }

    public function validateSessionToken(string $rawToken): ?array
    {
        $tokenHash = hash('sha256', $rawToken);
        $stmt = $this->db->prepare("SELECT s.*, u.email, u.name, u.role, u.company_id, u.status FROM pm_user_sessions s JOIN pm_users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'active'");
        $stmt->execute([$tokenHash]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($session) {
            $session['permissions'] = $this->getUserPermissions((int)$session['user_id'], $session['role'] ?? 'Observer');
            return $session;
        }

        return null;
    }

    public function getAllRoles(): array
    {
        $stmt = $this->db->query("SELECT * FROM pm_roles ORDER BY id ASC");
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }
}


