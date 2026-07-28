<?php
// @Arch[UserRepository]

namespace MassUtilityAdmin\Repository;

use PDO;
use MassUtilityAdmin\Service\SQLiteConnectionManager;

class UserRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? SQLiteConnectionManager::getConnection();
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
            $cStmt = $this->db->prepare("SELECT id FROM pm_companies WHERE LOWER(company_name) = LOWER(?)");
            $cStmt->execute([trim($company)]);
            $cRow = $cStmt->fetch(PDO::FETCH_ASSOC);
            if ($cRow) {
                $companyId = (int)$cRow['id'];
            }
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO pm_users (email, password_hash, company_name, company_id, name, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'active', DATETIME('now'))");
        $stmt->execute([$email, $hash, $company, $companyId, $name, $role]);
        return (int)$this->db->lastInsertId();
    }
}
