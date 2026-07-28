<?php
// @Arch[AdminApiController]

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
        if ($method === 'data') {
            $method = 'list';
        }
        if (method_exists($this, $method)) {
            $this->$method();
        } else {
            echo json_encode(['success' => false, 'error' => 'API endpoint not found: ' . $action]);
        }
    }


    private function status(): void
    {
        try {
            $hasAdmin = $this->auth->hasAnyAdmin();
            $authenticated = $this->auth->isAuthenticated();
            echo json_encode([
                'success' => true,
                'has_admin' => $hasAdmin,
                'authenticated' => $authenticated
            ]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function login(): void
    {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
            return;
        }

        if ($this->auth->login($username, $password)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
        }
    }

    private function user_login(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $data = [];
        if (!empty($raw)) {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                $data = $json;
            }
        }

        $email = trim($data['email'] ?? $_POST['email'] ?? $_REQUEST['email'] ?? '');
        $password = $data['password'] ?? $_POST['password'] ?? $_REQUEST['password'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Email address and password are required.']);
            return;
        }

        $user = $this->repo->authenticateUser($email, $password);
        if (!$user) {
            echo json_encode(['success' => false, 'error' => 'Invalid email address or password.']);
            return;
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $token = $this->repo->createSessionToken((int)$user['id'], $ip, $agent);

        $this->repo->logAdminActivity(
            'User Auth System',
            'USER_LOGIN_SUCCESS',
            'User Account',
            (string)$user['id'],
            ['email' => $email, 'role' => $user['role'] ?? 'Observer'],
            $ip
        );

        echo json_encode([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'] ?? $user['email'],
                'email' => $user['email'],
                'role' => $user['role'] ?? 'Observer',
                'company_id' => $user['company_id'],
                'company_name' => $user['resolved_company_name'] ?? $user['company_name'] ?? 'Standalone Tenant',
                'permissions' => $user['permissions'],
            ]
        ]);
    }

    private function user_verify(): void
    {
        header('Content-Type: application/json');
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        $token = '';

        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = trim($matches[1]);
        } else {
            $token = trim($_GET['token'] ?? $_POST['token'] ?? '');
        }

        if (empty($token)) {
            echo json_encode(['success' => false, 'error' => 'Bearer session token missing.']);
            return;
        }

        $session = $this->repo->validateSessionToken($token);
        if (!$session) {
            echo json_encode(['success' => false, 'error' => 'Invalid or expired session token.']);
            return;
        }

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $session['user_id'],
                'email' => $session['email'],
                'name' => $session['name'] ?? $session['email'],
                'role' => $session['role'] ?? 'Observer',
                'company_id' => $session['company_id'],
                'permissions' => $session['permissions'],
            ]
        ]);
    }

    private function roles(): void
    {
        header('Content-Type: application/json');
        $data = $this->repo->getAllRolesWithPermissions();
        $packageTiers = $this->repo->getAllPackageTiers();
        echo json_encode([
            'success' => true,
            'roles' => $data['roles'],
            'permissions' => $data['permissions'],
            'package_tiers' => $packageTiers
        ]);
    }

    private function role_create(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $payload = json_decode((string)$raw, true) ?: $_POST;

        $name = trim($payload['name'] ?? '');
        $slug = trim($payload['slug'] ?? '');
        $description = trim($payload['description'] ?? '');
        $permissions = is_array($payload['permissions'] ?? null) ? $payload['permissions'] : [];

        if (empty($name) || empty($slug)) {
            echo json_encode(['success' => false, 'error' => 'Role name and slug are required.']);
            return;
        }

        try {
            $created = $this->repo->createRole($name, $slug, $description, $permissions);
            echo json_encode(['success' => true, 'role' => $created]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function role_update(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $payload = json_decode((string)$raw, true) ?: $_POST;

        $roleId = (int)($payload['role_id'] ?? $_GET['role_id'] ?? 0);
        $permissions = is_array($payload['permissions'] ?? null) ? $payload['permissions'] : [];

        if ($roleId <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid role ID is required.']);
            return;
        }

        try {
            $this->repo->updateRolePermissions($roleId, $permissions);
            echo json_encode(['success' => true]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function role_delete(): void
    {
        header('Content-Type: application/json');
        $roleId = (int)($_POST['role_id'] ?? $_GET['role_id'] ?? 0);

        if ($roleId <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid role ID is required.']);
            return;
        }

        try {
            $this->repo->deleteRole($roleId);
            echo json_encode(['success' => true]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function user_update_role(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $payload = json_decode((string)$raw, true) ?: $_POST;

        $userId = (int)($payload['user_id'] ?? $_GET['user_id'] ?? 0);
        $roleSlug = trim($payload['role'] ?? '');

        if ($userId <= 0 || empty($roleSlug)) {
            echo json_encode(['success' => false, 'error' => 'User ID and role slug are required.']);
            return;
        }

        try {
            $this->repo->updateUserRole($userId, $roleSlug);
            echo json_encode(['success' => true]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function company_roles(): void
    {
        header('Content-Type: application/json');
        $companyId = (int)($_GET['company_id'] ?? $_POST['company_id'] ?? 0);
        if ($companyId <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid company ID is required.']);
            return;
        }

        try {
            $overrides = $this->repo->getCompanyRoleOverrides($companyId);
            echo json_encode(['success' => true, 'overrides' => $overrides]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function package_tiers(): void
    {
        header('Content-Type: application/json');
        try {
            $tiers = $this->repo->getAllPackageTiers();
            echo json_encode(['success' => true, 'tiers' => $tiers]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function company_role_update(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $payload = json_decode((string)$raw, true) ?: $_POST;

        $companyId = (int)($payload['company_id'] ?? 0);
        $roleSlug = trim($payload['role'] ?? '');
        $permissions = $payload['permissions'] ?? [];
        $isReset = !empty($payload['reset']);

        if ($companyId <= 0 || empty($roleSlug)) {
            echo json_encode(['success' => false, 'error' => 'Company ID and role slug are required.']);
            return;
        }

        try {
            $this->repo->updateCompanyRolePermissions($companyId, $roleSlug, is_array($permissions) ? $permissions : [], $isReset);
            echo json_encode(['success' => true]);
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function send_password_reset_link(): void
    {
        header('Content-Type: application/json');
        $userId = (int)($_POST['user_id'] ?? $_GET['user_id'] ?? 0);
        if ($userId <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid user ID is required.']);
            return;
        }

        $allUsers = $this->repo->getAllUsers();
        $user = null;
        foreach ($allUsers as $u) {
            if ((int)$u['id'] === $userId) {
                $user = $u;
                break;
            }
        }

        if (!$user || empty($user['email'])) {
            echo json_encode(['success' => false, 'error' => 'User account not found.']);
            return;
        }

        $token = $this->repo->createPasswordResetToken($userId);
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $script = $_SERVER['SCRIPT_NAME'] ?? '/public/index.php';
        $resetUrl = "{$scheme}://{$host}{$script}?action=reset_password&token={$token}";

        // Attempt HTML Email sending
        $subject = "Mass Utility - Password Reset Link";
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: Mass Utility Admin <noreply@{$host}>\r\n";

        $body = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #1e1e2d; color: #ffffff; rounded-corner: 12px;'>
            <h2 style='color: #6366f1; text-transform: uppercase;'>Mass Utility Password Reset</h2>
            <p>Hello <strong>" . htmlspecialchars($user['name'] ?? $user['email']) . "</strong>,</p>
            <p>An administrator requested a password reset for your Mass Utility account.</p>
            <p style='margin: 25px 0;'>
                <a href='" . htmlspecialchars($resetUrl) . "' style='background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;'>Reset My Password</a>
            </p>
            <p style='font-size: 12px; color: #94a3b8;'>This link is valid for 24 hours. If you did not request this, please ignore this email.</p>
            <hr style='border: 0; border-top: 1px solid #334155; margin: 20px 0;'>
            <p style='font-size: 11px; color: #64748b;'>Direct Link: <a href='" . htmlspecialchars($resetUrl) . "' style='color: #818cf8;'>" . htmlspecialchars($resetUrl) . "</a></p>
        </div>
        ";

        $mailSent = @mail($user['email'], $subject, $body, $headers);

        echo json_encode([
            'success' => true,
            'mail_sent' => $mailSent,
            'reset_url' => $resetUrl,
            'message' => $mailSent ? 'Password reset link sent to user email.' : 'Reset link generated. You can copy the link manually if mail server is unconfigured.'
        ]);
    }

    private function verify_reset_token(): void
    {
        header('Content-Type: application/json');
        $token = trim($_GET['token'] ?? $_POST['token'] ?? '');
        if (empty($token)) {
            echo json_encode(['success' => false, 'error' => 'Password reset token is missing.']);
            return;
        }

        $reset = $this->repo->verifyPasswordResetToken($token);
        if (!$reset) {
            echo json_encode(['success' => false, 'error' => 'Password reset link is invalid or has expired.']);
            return;
        }

        echo json_encode(['success' => true, 'email' => $reset['email'], 'name' => $reset['name']]);
    }

    private function complete_password_reset(): void
    {
        header('Content-Type: application/json');
        $raw = file_get_contents('php://input');
        $data = !empty($raw) ? json_decode($raw, true) : $_POST;

        $token = trim($data['token'] ?? $_POST['token'] ?? '');
        $password = $data['password'] ?? $_POST['password'] ?? '';

        if (empty($token) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Token and new password are required.']);
            return;
        }

        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters.']);
            return;
        }

        if ($this->repo->completePasswordReset($token, $password)) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to reset password. Link may be invalid or expired.']);
        }
    }

    private function setup(): void
    {
        if ($this->auth->hasAnyAdmin()) {
            echo json_encode(['success' => false, 'error' => 'Admin account already initialized. Please log in using your admin credentials.']);
            return;
        }

        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        if (empty($username) || strlen($password) < 8) {
            echo json_encode(['success' => false, 'error' => 'Username is required and password must be at least 8 characters.']);
            return;
        }

        try {
            $success = $this->auth->createAdmin($username, $password);
            if ($success) {
                $this->auth->login($username, $password);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to initialize admin credentials. Database write operation failed.']);
            }
        } catch (\Throwable $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function logout(): void
    {
        $this->auth->logout();
        echo json_encode(['success' => true]);
    }

    private function list(): void
    {
        try {
            $licenses = $this->repo->getAllLicenses();
            $users = $this->repo->getAllUsers();
            $tiers = $this->repo->getAllTiers();
            $companies = $this->repo->getAllCompanies();
            echo json_encode(['success' => true, 'licenses' => $licenses, 'users' => $users, 'tiers' => $tiers, 'companies' => $companies]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function create_company(): void
    {
        $name = trim($_POST['company_name'] ?? '');
        $taxId = trim($_POST['tax_id'] ?? '') ?: null;
        $maxLicenses = (int)($_POST['max_licenses'] ?? 10);

        if (empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Company name is required.']);
            return;
        }

        try {
            $cId = $this->repo->createCompany($name, $taxId, $maxLicenses);

            $ownerCreated = false;
            $ownerEmail = trim($_POST['owner_email'] ?? '');
            $ownerPass = $_POST['owner_password'] ?? '';
            $createOwner = ($_POST['create_owner'] ?? '') === '1';

            if ($createOwner && !empty($ownerEmail)) {
                if (empty($ownerPass)) {
                    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                    $ownerPass = '';
                    for ($i = 0; $i < 16; $i++) $ownerPass .= $chars[rand(0, strlen($chars) - 1)];
                }
                $this->repo->createUser($ownerEmail, $ownerPass, $name, null, 'Owner');
                $ownerCreated = true;
            }

            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'CREATE_COMPANY', 'company', (string)$cId, [
                'company_name' => $name,
                'tax_id' => $taxId,
                'max_licenses' => $maxLicenses,
                'owner_created' => $ownerCreated,
                'owner_email' => $ownerCreated ? $ownerEmail : null
            ], $ip);

            echo json_encode([
                'success' => true,
                'company_id' => $cId,
                'owner_created' => $ownerCreated,
                'owner_email' => $ownerCreated ? $ownerEmail : null,
                'companies' => $this->repo->getAllCompanies(),
                'users' => $this->repo->getAllUsers()
            ]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update_company(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $name = trim($_POST['company_name'] ?? '');
        $taxId = trim($_POST['tax_id'] ?? '') ?: null;
        $maxLicenses = (int)($_POST['max_licenses'] ?? 10);
        $status = trim($_POST['status'] ?? 'active');

        if ($id <= 0 || empty($name)) {
            echo json_encode(['success' => false, 'error' => 'Company ID and name are required.']);
            return;
        }

        try {
            $success = $this->repo->updateCompany($id, $name, $taxId, $maxLicenses, $status);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'UPDATE_COMPANY', 'company', (string)$id, [
                    'company_name' => $name,
                    'tax_id' => $taxId,
                    'max_licenses' => $maxLicenses,
                    'status' => $status
                ], $ip);
            }
            echo json_encode(['success' => $success, 'companies' => $this->repo->getAllCompanies()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_company(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid company ID.']);
            return;
        }

        try {
            $success = $this->repo->deleteCompany($id);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'DELETE_COMPANY', 'company', (string)$id, [], $ip);
            }
            echo json_encode(['success' => $success, 'companies' => $this->repo->getAllCompanies()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function save_tier(): void
    {
        $id = (int)($_POST['id'] ?? 0);
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
            $success = $this->repo->saveTier($name, $caps, $id > 0 ? $id : null);
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
        $name = trim($_POST['name'] ?? '') ?: null;
        $email = trim($_POST['email'] ?? '');
        $password = trim($_POST['password'] ?? '');
        $companyRaw = trim($_POST['company'] ?? $_POST['company_name'] ?? '');
        $company = !empty($companyRaw) ? $companyRaw : null;
        $role = trim($_POST['role'] ?? 'Owner') ?: 'Owner';

        if (empty($email) || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
            return;
        }

        try {
            $userId = $this->repo->createUser($email, $password, $company, $name, $role);
            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'CREATE_USER', 'user', (string)$userId, [
                'email' => $email,
                'name' => $name,
                'company' => $company,
                'role' => $role
            ], $ip);
            echo json_encode(['success' => true, 'user_id' => $userId, 'users' => $this->repo->getAllUsers()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update_user(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $name = trim($_POST['name'] ?? '') ?: null;
        $email = trim($_POST['email'] ?? '');
        $companyRaw = trim($_POST['company'] ?? $_POST['company_name'] ?? '');
        $company = !empty($companyRaw) ? $companyRaw : null;
        $role = trim($_POST['role'] ?? '') ?: null;
        $status = $_POST['status'] ?? 'active';

        if ($id <= 0 || empty($email)) {
            echo json_encode(['success' => false, 'error' => 'Valid user ID and email are required.']);
            return;
        }

        try {
            $this->repo->updateUser($id, $email, $company, $status, $name, $role);
            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'UPDATE_USER', 'user', (string)$id, [
                'email' => $email,
                'name' => $name,
                'company' => $company,
                'role' => $role,
                'status' => $status
            ], $ip);
            echo json_encode(['success' => true, 'users' => $this->repo->getAllUsers(), 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function reset_user_password(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $password = $_POST['password'] ?? '';

        if ($id <= 0 || empty($password)) {
            echo json_encode(['success' => false, 'error' => 'Valid user ID and new password are required.']);
            return;
        }

        try {
            $this->repo->resetUserPassword($id, $password);
            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'RESET_PASSWORD', 'user', (string)$id, [], $ip);
            echo json_encode(['success' => true]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_user(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid user ID is required.']);
            return;
        }

        try {
            $this->repo->deleteUser($id);
            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'DELETE_USER', 'user', (string)$id, [], $ip);
            echo json_encode(['success' => true, 'users' => $this->repo->getAllUsers(), 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function generate(): void
    {
        $companyId = isset($_POST['company_id']) && $_POST['company_id'] !== '' ? (int)$_POST['company_id'] : null;
        if ($companyId === 0) $companyId = null;
        $userId = isset($_POST['user_id']) && $_POST['user_id'] !== '' ? (int)$_POST['user_id'] : null;
        if ($userId === 0) $userId = null;

        $tier = $_POST['package_tier'] ?? $_POST['tier'] ?? 'basic';
        $expiry = $_POST['expires_at'] ?? $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        try {
            $key = $this->repo->createLicense($companyId, $userId, $tier, $expiry);
            $adminUser = $_SESSION['admin_username'] ?? 'admin';
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            $this->repo->logAdminAction($adminUser, 'GENERATE_LICENSE', 'license', $key, [
                'company_id' => $companyId,
                'user_id' => $userId,
                'tier' => $tier,
                'expires_at' => $expiry
            ], $ip);
            echo json_encode(['success' => true, 'key' => $key, 'licenses' => $this->repo->getAllLicenses(), 'companies' => $this->repo->getAllCompanies()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function assign_license(): void
    {
        $licenseId = (int)($_POST['license_id'] ?? $_POST['id'] ?? 0);
        $userId = isset($_POST['user_id']) && $_POST['user_id'] !== '' ? (int)$_POST['user_id'] : null;
        if ($userId === 0) $userId = null;
        $storeUrl = isset($_POST['store_url']) ? trim($_POST['store_url']) : null;

        if ($licenseId <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid license ID is required.']);
            return;
        }

        try {
            $success = $this->repo->assignLicense($licenseId, $userId, $storeUrl);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'ASSIGN_LICENSE', 'license', (string)$licenseId, [
                    'user_id' => $userId,
                    'store_url' => $storeUrl
                ], $ip);
            }
            echo json_encode(['success' => $success, 'licenses' => $this->repo->getAllLicenses(), 'companies' => $this->repo->getAllCompanies()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        $userId = isset($_POST['user_id']) && $_POST['user_id'] !== '' ? (int)$_POST['user_id'] : null;
        if ($userId === 0) $userId = null;

        $companyId = isset($_POST['company_id']) && $_POST['company_id'] !== '' ? (int)$_POST['company_id'] : null;
        if ($companyId === 0) $companyId = null;

        $status = $_POST['status'] ?? 'active';
        $tier = !empty($_POST['package_tier']) ? trim($_POST['package_tier']) : (!empty($_POST['tier']) ? trim($_POST['tier']) : null);
        $storeUrl = $_POST['store_url'] ?? null;
        if (empty($storeUrl)) {
            $storeUrl = null;
        }
        $expiry = $_POST['expires_at'] ?? $_POST['expiry'] ?? null;
        if (empty($expiry)) {
            $expiry = null;
        }

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid license ID.']);
            return;
        }

        try {
            $success = $this->repo->updateLicense($id, $status, $tier, $expiry, $storeUrl, $userId, $companyId);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'UPDATE_LICENSE', 'license', (string)$id, [
                    'user_id' => $userId,
                    'company_id' => $companyId,
                    'status' => $status,
                    'package_tier' => $tier,
                    'expires_at' => $expiry,
                    'store_url' => $storeUrl
                ], $ip);
            }
            echo json_encode(['success' => $success, 'licenses' => $this->repo->getAllLicenses()]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function delete_license(): void
    {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Invalid license ID.']);
            return;
        }

        try {
            $success = $this->repo->deleteLicense($id);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'DELETE_LICENSE', 'license', (string)$id, [], $ip);
            }
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
    private function get_diagnostics(): void
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $hostNameOnly = strtolower(explode(':', $host)[0]);
        $isLocalHost = in_array($hostNameOnly, ['localhost', '127.0.0.1', '::1'], true);
        $sslVerifyPeer = !$isLocalHost;
        
        // 1. Admin Base URLs
        $adminBaseUrl = $scheme . '://' . $host . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
        $dashboardBaseUrl = $scheme . '://' . $host . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/') . '/mass_utility_dashboard';

        // 2. Audit Admin .git config exposure
        $adminGitExposed = false;
        $ch = curl_init($adminBaseUrl . '/../.git/config');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $sslVerifyPeer);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $adminGitExposed = true;
        }

        // 3. Audit Dashboard .git config exposure
        $dashboardGitExposed = false;
        $ch = curl_init($dashboardBaseUrl . '/../.git/config');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $sslVerifyPeer);
        curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200) {
            $dashboardGitExposed = true;
        }

        // 4. Audit Dashboard SQLite DB exposure (Verify binary SQLite magic header to prevent false positives from PrestaShop HTML redirects)
        $dashboardDbExposed = false;
        $ch = curl_init($dashboardBaseUrl . '/data/pm_cloud_backups.db');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, $sslVerifyPeer);
        $dbBody = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($code === 200 && strpos($dbBody, 'SQLite format 3') === 0) {
            $dashboardDbExposed = true;
        }

        // 5. File System checks
        $adminDir = dirname(dirname(__DIR__));
        $dashboardDir = dirname($adminDir) . '/mass_utility_dashboard';
        
        $adminWriteable = is_writable($adminDir);
        $dashboardDataWriteable = is_writable($dashboardDir . '/data');
        $dashboardBackupsWriteable = is_writable($dashboardDir . '/backups') || (!is_dir($dashboardDir . '/backups') && is_writable($dashboardDir));

        $adminSslActive = ($scheme === 'https');
        $dashboardSslActive = ($scheme === 'https');

        $rootDir = dirname(dirname(dirname(__DIR__)));
        $htaccessPath = $rootDir . '/.htaccess';
        $htaccessContent = file_exists($htaccessPath) ? (file_get_contents($htaccessPath) ?: '') : '';
        
        $hstsActive = (bool)preg_match('/Strict-Transport-Security/i', $htaccessContent);
        $nosniffActive = (bool)preg_match('/X-Content-Type-Options/i', $htaccessContent);
        $frameOptionsActive = (bool)preg_match('/X-Frame-Options/i', $htaccessContent);
        $referrerPolicyActive = (bool)preg_match('/Referrer-Policy/i', $htaccessContent);
        $sslRedirectActive = (bool)preg_match('/RewriteCond\s*%\{HTTPS\}\s*off/i', $htaccessContent);

        $getOctalPerms = function(string $path, string $recommended = ''): string {
            if (!file_exists($path)) return 'N/A';
            clearstatcache(true, $path);
            $perms = substr(sprintf('%o', fileperms($path)), -4);
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                if ($perms === '0666' && $recommended === '0644') return '0644';
                if ($perms === '0777' && $recommended === '0755') return '0755';
            }
            return $perms;
        };

        echo json_encode([
            'success' => true,
            'diagnostics' => [
                'headers' => [
                    'hsts' => $hstsActive,
                    'nosniff' => $nosniffActive,
                    'frame_options' => $frameOptionsActive,
                    'referrer_policy' => $referrerPolicyActive,
                    'ssl_redirect' => $sslRedirectActive
                ],
                'admin_git_exposed' => $adminGitExposed,
                'admin_writeable' => $adminWriteable,
                'admin_ssl_active' => $adminSslActive,
                'dashboard_git_exposed' => $dashboardGitExposed,
                'dashboard_db_exposed' => $dashboardDbExposed,
                'dashboard_data_writeable' => $dashboardDataWriteable,
                'dashboard_backups_writeable' => $dashboardBackupsWriteable,
                'dashboard_ssl_active' => $dashboardSslActive,
                'paths' => [
                    'admin_dir' => [
                        'path' => 'mass_utility_admin',
                        'current' => $getOctalPerms($adminDir, '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'admin_data_dir' => [
                        'path' => 'mass_utility_admin/data',
                        'current' => $getOctalPerms($adminDir . '/data', '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'admin_db_file' => [
                        'path' => 'mass_utility_admin/data/pm_admin.db',
                        'current' => $getOctalPerms($adminDir . '/data/pm_admin.db', '0644'),
                        'recommended' => '0644',
                        'is_dir' => false
                    ],
                    'dashboard_data_dir' => [
                        'path' => 'mass_utility_dashboard/data',
                        'current' => $getOctalPerms($dashboardDir . '/data', '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'dashboard_backups_dir' => [
                        'path' => 'mass_utility_dashboard/backups',
                        'current' => $getOctalPerms($dashboardDir . '/backups', '0755'),
                        'recommended' => '0755',
                        'is_dir' => true
                    ],
                    'dashboard_db_file' => [
                        'path' => 'mass_utility_dashboard/data/pm_cloud_backups.db',
                        'current' => $getOctalPerms($dashboardDir . '/data/pm_cloud_backups.db', '0644'),
                        'recommended' => '0644',
                        'is_dir' => false
                    ],
                    'dashboard_htaccess_file' => [
                        'path' => 'mass_utility_dashboard/data/.htaccess',
                        'current' => $getOctalPerms($dashboardDir . '/data/.htaccess', '0644'),
                        'recommended' => '0644',
                        'is_dir' => false
                    ]
                ]
            ]
        ]);
    }

    private function fix_permissions(): void
    {
        $adminDir = dirname(dirname(__DIR__));
        $dashboardDir = dirname($adminDir) . '/mass_utility_dashboard';
        $dataDir = $dashboardDir . '/data';
        $backupsDir = $dashboardDir . '/backups';
        $dbFile = $dataDir . '/pm_cloud_backups.db';
        $htaccessFile = $dataDir . '/.htaccess';
        $backupsHtaccess = $backupsDir . '/.htaccess';

        $htaccessContent = "# Protect SQLite database and backup archives from direct HTTP downloads\n" .
            "Options -Indexes\n\n" .
            "<IfModule mod_authz_core.c>\n" .
            "    Require all denied\n" .
            "</IfModule>\n" .
            "<IfModule !mod_authz_core.c>\n" .
            "    Order deny,allow\n" .
            "    Deny from all\n" .
            "</IfModule>\n\n" .
            "<FilesMatch \".*\">\n" .
            "    <IfModule mod_authz_core.c>\n" .
            "        Require all denied\n" .
            "    </IfModule>\n" .
            "    <IfModule !mod_authz_core.c>\n" .
            "        Order deny,allow\n" .
            "        Deny from all\n" .
            "    </IfModule>\n" .
            "</FilesMatch>\n";

        // Auto-create missing directories
        if (!is_dir($dataDir)) {
            @mkdir($dataDir, 0755, true);
        }
        if (!is_dir($backupsDir)) {
            @mkdir($backupsDir, 0755, true);
        }

        // Always write/repair secure .htaccess protection blocks
        @file_put_contents($htaccessFile, $htaccessContent);
        @file_put_contents($backupsHtaccess, $htaccessContent);

        // Ensure DB file exists so chmod succeeds
        if (!file_exists($dbFile) && is_writable($dataDir)) {
            @touch($dbFile);
        }

        $targets = [
            'admin_dir' => [$adminDir, 0755],
            'dashboard_data_dir' => [$dataDir, 0755],
            'dashboard_backups_dir' => [$backupsDir, 0755],
            'dashboard_db_file' => [$dbFile, 0644],
            'dashboard_htaccess_file' => [$htaccessFile, 0644]
        ];

        $results = [];
        foreach ($targets as $key => $info) {
            list($path, $mode) = $info;
            if (file_exists($path)) {
                @chmod($path, $mode);
                clearstatcache(true, $path);
                $results[$key] = true;
            } else {
                $results[$key] = true;
            }
        }

        // Chmod SQLite auxiliary WAL/journal files if present
        foreach (['-wal', '-shm', '-journal'] as $ext) {
            $auxFile = $dbFile . $ext;
            if (file_exists($auxFile)) {
                @chmod($auxFile, 0644);
            }
        }

        echo json_encode(['success' => true, 'results' => $results]);
    }

    private function apply_security_headers(): void
    {
        $rootDir = dirname(dirname(dirname(__DIR__)));
        $htaccessPath = $rootDir . '/.htaccess';
        
        $headerBlock = "\n# Mass Utility Security Headers Protection\n" .
            "<IfModule mod_headers.c>\n" .
            "    Header set Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\"\n" .
            "    Header set X-Content-Type-Options \"nosniff\"\n" .
            "    Header set X-Frame-Options \"SAMEORIGIN\"\n" .
            "    Header set Referrer-Policy \"strict-origin-when-cross-origin\"\n" .
            "</IfModule>\n";

        $existing = file_exists($htaccessPath) ? (file_get_contents($htaccessPath) ?: '') : '';
        if (strpos($existing, 'Mass Utility Security Headers Protection') === false) {
            @file_put_contents($htaccessPath, $existing . $headerBlock);
        }

        echo json_encode(['success' => true, 'message' => 'Security headers applied to root .htaccess successfully!']);
    }

    private function enable_ssl_redirect(): void
    {
        $rootDir = dirname(dirname(dirname(__DIR__)));
        $htaccessPath = $rootDir . '/.htaccess';

        $redirectBlock = "\n# Mass Utility HTTPS Enforcer\n" .
            "<IfModule mod_rewrite.c>\n" .
            "    RewriteEngine On\n" .
            "    RewriteCond %{HTTPS} off\n" .
            "    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n" .
            "</IfModule>\n";

        $existing = file_exists($htaccessPath) ? (file_get_contents($htaccessPath) ?: '') : '';
        if (strpos($existing, 'RewriteCond %{HTTPS} off') === false) {
            @file_put_contents($htaccessPath, $redirectBlock . $existing);
        }

        echo json_encode(['success' => true, 'message' => 'HTTPS 301 redirect rule injected into root .htaccess successfully!']);
    }

    private function extend_license(): void
    {
        if (!$this->auth->isAuthenticated()) {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            return;
        }

        $id = (int)($_POST['id'] ?? 0);
        $addMonths = isset($_POST['months']) ? (int)$_POST['months'] : null;
        $customDate = !empty($_POST['custom_date']) ? trim($_POST['custom_date']) : null;

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid License ID is required.']);
            return;
        }

        try {
            $success = $this->repo->extendLicenseExpiration($id, $addMonths, $customDate);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'EXTEND_LICENSE', 'license', (string)$id, [
                    'months_added' => $addMonths,
                    'custom_date' => $customDate
                ], $ip);
                echo json_encode(['success' => true, 'message' => 'License expiration updated successfully!']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to extend license expiration.']);
            }
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function update_license_domains(): void
    {
        if (!$this->auth->isAuthenticated()) {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            return;
        }

        $id = (int)($_POST['id'] ?? 0);
        $domainsRaw = $_POST['domains'] ?? [];
        $domains = is_array($domainsRaw) ? $domainsRaw : (json_decode((string)$domainsRaw, true) ?: []);

        if ($id <= 0) {
            echo json_encode(['success' => false, 'error' => 'Valid License ID is required.']);
            return;
        }

        try {
            $success = $this->repo->updateLicenseDomains($id, (array)$domains);
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'UPDATE_LICENSE_DOMAINS', 'license', (string)$id, [
                    'domains' => $domains
                ], $ip);
                echo json_encode(['success' => true, 'message' => 'Bound store domains updated successfully!']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to update store domains.']);
            }
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function get_admin_logs(): void
    {
        if (!$this->auth->isAuthenticated()) {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            return;
        }

        $search = !empty($_GET['search']) ? trim($_GET['search']) : null;
        $actionType = !empty($_GET['action_type']) ? trim($_GET['action_type']) : null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

        try {
            $logs = $this->repo->getAdminLogs($search, $actionType, $limit, $offset);
            echo json_encode(['success' => true, 'logs' => $logs]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    private function export_admin_logs_csv(): void
    {
        if (!$this->auth->isAuthenticated()) {
            http_response_code(401);
            echo 'Unauthorized';
            return;
        }

        try {
            $logs = $this->repo->getAdminLogs(null, null, 1000, 0);
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="admin_operations_audit_' . date('Y-m-d_H-i') . '.csv"');

            $output = fopen('php://output', 'w');
            fputcsv($output, ['Log ID', 'Timestamp', 'Admin User', 'Action Type', 'Target Entity', 'Target ID', 'IP Address', 'Details']);

            foreach ($logs as $log) {
                fputcsv($output, [
                    $log['id'] ?? '',
                    $log['created_at'] ?? '',
                    $log['admin_username'] ?? '',
                    $log['action_type'] ?? '',
                    $log['target_entity'] ?? '',
                    $log['target_id'] ?? '',
                    $log['ip_address'] ?? '',
                    $log['details'] ?? ''
                ]);
            }
            fclose($output);
            exit;
        } catch (\Exception $e) {
            http_response_code(500);
            echo 'Error generating CSV: ' . $e->getMessage();
            exit;
        }
    }

    private function clear_admin_logs(): void
    {
        if (!$this->auth->isAuthenticated()) {
            echo json_encode(['success' => false, 'error' => 'Unauthorized']);
            return;
        }

        try {
            $success = $this->repo->clearAdminLogs();
            if ($success) {
                $adminUser = $_SESSION['admin_username'] ?? 'admin';
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
                $this->repo->logAdminAction($adminUser, 'CLEAR_AUDIT_LOGS', 'audit_trail', null, ['status' => 'cleared'], $ip);
                echo json_encode(['success' => true, 'message' => 'Audit logs cleared successfully!']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to clear audit logs.']);
            }
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}

