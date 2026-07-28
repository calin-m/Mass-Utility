<?php
// @Arch[LicenseVerifyController]

declare(strict_types=1);

namespace MassUtility\Dashboard\Controller\Api;

use MassUtility\Dashboard\Repository\LicenseVerifyRepository;

require_once dirname(__DIR__, 2) . '/Repository/LicenseVerifyRepository.php';

class LicenseVerifyController
{
    private LicenseVerifyRepository $repository;

    public function __construct(?LicenseVerifyRepository $repository = null)
    {
        $this->repository = $repository ?? new LicenseVerifyRepository();
    }

    public function handleActivate(): void
    {
        header('Content-Type: application/json');
        
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $storeUrl = $_POST['store_url'] ?? '';

        if (empty($email) || empty($password) || empty($storeUrl)) {
            echo json_encode(['success' => false, 'error' => 'Missing parameter email, password, or store_url.']);
            exit;
        }

        try {
            // 1. Verify user credentials via repository
            $user = $this->repository->findUserByEmail($email);

            if (!$user || !password_verify($password, $user['password_hash'])) {
                echo json_encode(['success' => false, 'error' => 'Invalid email or password credentials.']);
                exit;
            }

            if (isset($user['status']) && $user['status'] === 'suspended') {
                echo json_encode(['success' => false, 'error' => 'Client account is suspended. Please contact portal administrator.']);
                exit;
            }

            // 2. Get active license for user and bind domain via repository
            $lic = $this->repository->findOrBindLicense((int)$user['id'], $storeUrl);

            if (!$lic) {
                echo json_encode(['success' => false, 'error' => 'No active license key found for this store domain. Please contact portal administrator.']);
                exit;
            }

            $tier = strtolower((string)$lic['package_tier']);
            $isHighTier = ($tier === 'pro' || $tier === 'enterprise' || $tier === 'developer');
            $isTopTier = ($tier === 'enterprise' || $tier === 'developer');

            $features = [
                'PM_ENABLE_FILE_TOOLS' => $isHighTier ? 1 : 0,
                'PM_ENABLE_DB_TOOLS' => 1,
                'PM_ENABLE_QUERY_WIZARD' => $isTopTier ? 1 : 0,
                'PM_ENABLE_GHOST_PURGER' => $isHighTier ? 1 : 0,
                'PM_GDRIVE_SYNC' => $isHighTier ? 1 : 0,
                'PM_RETENTION_RULE' => $isHighTier ? 1 : 0
            ];

            $payload = [
                'license_key' => $lic['license_key'],
                'store_url' => $storeUrl,
                'tier' => $tier,
                'features' => $features,
                'expires_at' => $lic['expires_at'],
                'generated_at' => time()
            ];

            $payloadJson = json_encode($payload);
            $secret = getenv('PM_LICENSE_SIGN_SECRET') ?: 'default_master_sign_secret_key_123';
            $signature = hash_hmac('sha256', $payloadJson, $secret);

            echo json_encode([
                'success' => true,
                'token' => base64_encode($payloadJson),
                'signature' => $signature
            ]);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
}
