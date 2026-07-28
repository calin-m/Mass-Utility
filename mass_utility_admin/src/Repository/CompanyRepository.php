<?php
// @Arch[CompanyRepository]

namespace MassUtilityAdmin\Repository;

use PDO;
use MassUtilityAdmin\Service\SQLiteConnectionManager;

class CompanyRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? SQLiteConnectionManager::getConnection();
    }

    public function getAllCompanies(): array
    {
        $sql = "SELECT c.*, 
                (SELECT COUNT(*) FROM pm_licenses WHERE company_id = c.id) as active_licenses_count,
                (SELECT COUNT(*) FROM pm_users WHERE company_id = c.id) as total_users_count
                FROM pm_companies c ORDER BY c.id DESC";
        $stmt = $this->db->query($sql);
        $res = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return is_array($res) ? $res : [];
    }

    public function createCompany(string $name, ?string $taxId = null, int $maxLicenses = 10): int
    {
        $stmt = $this->db->prepare("INSERT INTO pm_companies (company_name, tax_id, max_licenses, status, created_at) VALUES (?, ?, ?, 'active', DATETIME('now'))");
        $stmt->execute([$name, $taxId, $maxLicenses]);
        return (int)$this->db->lastInsertId();
    }

    public function updateCompany(int $id, string $name, ?string $taxId, int $maxLicenses, string $status = 'active'): bool
    {
        $stmt = $this->db->prepare("UPDATE pm_companies SET company_name = ?, tax_id = ?, max_licenses = ?, status = ? WHERE id = ?");
        return $stmt->execute([$name, $taxId, $maxLicenses, $status, $id]);
    }

    public function deleteCompany(int $id): bool
    {
        $stmt = $this->db->prepare("DELETE FROM pm_companies WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
