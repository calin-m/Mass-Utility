<?php
// @Arch[LicenseVerifyController]

namespace MassUtility\Dashboard\Controller\Api;

class LicenseVerifyController
{
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
            $dbPath = dirname(dirname(dirname(__DIR__))) . '/data/pm_cloud_backups.db';
            $pdo = new \PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

            // 1. Verify user credentials
            $stmt = $pdo->prepare("SELECT * FROM pm_users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$user || !password_verify($password, $user['password_hash'])) {
                echo json_encode(['success' => false, 'error' => 'Invalid email or password credentials.']);
                exit;
            }

            if (isset($user['status']) && $user['status'] === 'suspended') {
                echo json_encode(['success' => false, 'error' => 'Client account is suspended. Please contact portal administrator.']);
                exit;
            }

            // 2. Get active license for user and bind domain
            $stmt = $pdo->prepare("SELECT * FROM pm_licenses WHERE user_id = ? AND (store_url = ? OR store_url IS NULL)");
            $stmt->execute([$user['id'], $storeUrl]);
            $lic = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$lic) {
                // Check if user has an unassigned license key to bind to this domain
                $stmt = $pdo->prepare("SELECT * FROM pm_licenses WHERE user_id = ? AND (store_url IS NULL OR store_url = '') LIMIT 1");
                $stmt->execute([$user['id']]);
                $lic = $stmt->fetch(\PDO::FETCH_ASSOC);
                
                if ($lic) {
                    $stmt = $pdo->prepare("UPDATE pm_licenses SET store_url = ? WHERE id = ?");
                    $stmt->execute([$storeUrl, $lic['id']]);
                    $lic['store_url'] = $storeUrl;
                } else {
                    echo json_encode(['success' => false, 'error' => 'No active license key found for this store domain. Please contact portal administrator.']);
                    exit;
                }
            } elseif (empty($lic['store_url'])) {
                $stmt = $pdo->prepare("UPDATE pm_licenses SET store_url = ? WHERE id = ?");
                $stmt->execute([$storeUrl, $lic['id']]);
                $lic['store_url'] = $storeUrl;
            }

            $tier = $lic['package_tier'];
            $features = [
                'PM_ENABLE_FILE_TOOLS' => ($tier === 'pro' || $tier === 'developer') ? 1 : 0,
                'PM_ENABLE_DB_TOOLS' => 1,
                'PM_ENABLE_QUERY_WIZARD' => ($tier === 'developer') ? 1 : 0,
                'PM_ENABLE_GHOST_PURGER' => ($tier === 'pro' || $tier === 'developer') ? 1 : 0,
                'PM_GDRIVE_SYNC' => ($tier === 'pro' || $tier === 'developer') ? 1 : 0,
                'PM_RETENTION_RULE' => ($tier === 'pro' || $tier === 'developer') ? 1 : 0
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
