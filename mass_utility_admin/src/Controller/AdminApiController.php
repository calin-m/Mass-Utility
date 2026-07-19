<?php
namespace MassUtilityAdmin\Controller;

use MassUtilityAdmin\Repository\LicenseRepository;
use MassUtilityAdmin\Service\AdminSettingsManager;

class AdminApiController
{
    private AdminSettingsManager $auth;
    private LicenseRepository $repo;

    public function __construct(AdminSettingsManager $auth)
    {
        $this->auth = $auth;
        $this->repo = new LicenseRepository($auth->getDbConnection());
    }

    public function execute(string $action): void
    {
        $method = str_replace('api_', '', $action);
        if (method_exists($this, $method)) {
            $this->$method();
        } else {
            echo json_encode(['success' => false, 'error' => 'API endpoint not found.']);
        }
    }

    private function list(): void
    {
        $licenses = $this->repo->getAllLicenses();
        $users = $this->repo->getAllUsers();
        $tiers = $this->repo->getAllTiers();
        echo json_encode(['success' => true, 'licenses' => $licenses, 'users' => $users, 'tiers' => $tiers]);
    }

    private function save_tier(): void
    {
        $name = trim($_POST['name'] ?? '');
        $capsJson = $_POST['capabilities'] ?? '';
        if (empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Package tier name is required.']);
            return;
        }

        $caps = json_decode($capsJson, true);
        if (!is_array($caps)) {
            echo json_encode(['success' => false, 'error' => 'Invalid capabilities payload.']);
            return;
        }

        try {
            $success = $this->repo->saveTier($name, $caps);
            echo json_encode(['success' => $success, 'tiers' => $this->repo->getAllTiers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_tier(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid package tier ID.']);
            return;
        }

        try {
            $success = $this->repo->deleteTier($id);
            echo json_encode(['success' => $success, 'tiers' => $this->repo->getAllTiers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function create_user(): void
    {
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $company = $_POST['company'] ?? null;

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
            return;
        }

        try {
            $userId = $this->repo->createUser($email, $password, $company);
            echo json_encode(['success' => true, 'user_id' => $userId, 'users' => $this->repo->getAllUsers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function generate(): void
    {
        $userId = (int)($_POST['user_id'] ?? 0);
        $tier = $_POST['tier'] ?? 'basic';
        $expiry = $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        if ($userId <= 0) {
            echo json_encode(['success' => false, 'error' => 'A valid client user ID is required.']);
            return;
        }

        try {
            $key = $this->repo->createLicense($userId, $tier, $expiry);
            echo json_encode(['success' => true, 'key' => $key, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $status = $_POST['status'] ?? 'active';
        $tier = $_POST['tier'] ?? 'basic';
        $storeUrl = $_POST['store_url'] ?? null;
        if (empty($storeUrl)) {
            $storeUrl = null;
        }
        $expiry = $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid license ID.']);
            return;
        }

        try {
            $success = $this->repo->updateLicense($id, $status, $tier, $expiry, $storeUrl);
            echo json_encode(['success' => $success, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function change_password(): void
    {
        $oldPassword = $_POST['old_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';

        if (empty($oldPassword) || empty($newPassword)) {
            echo json_encode(['success' => false, 'error' => 'Current password and new password are required.']);
            return;
        }

        $username = $_SESSION['pm_admin_user'] ?? 'admin';

        try {
            $pdo = $this->auth->getDbConnection();
            $stmt = $pdo->prepare("SELECT * FROM pm_admins WHERE username = ?");
            $stmt->execute([$username]);
            $admin = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$admin || !password_verify($oldPassword, $admin['password_hash'])) {
                echo json_encode(['success' => false, 'error' => 'Invalid current password.']);
                return;
            }

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE pm_admins SET password_hash = ? WHERE username = ?");
            $stmt->execute([$newHash, $username]);

            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}
