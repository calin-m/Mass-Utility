<?php
// @Arch[test_license_encryption]

declare(strict_types=1);

// Mock class Configuration representing PrestaShop Configuration storage
class Configuration
{
    private static array $store = [];

    public static function getGlobalValue(string $key)
    {
        return self::$store[$key] ?? false;
    }

    public static function updateGlobalValue(string $key, string $value): void
    {
        self::$store[$key] = $value;
    }
}

require_once __DIR__ . '/../src/Service/SettingsManager.php';

echo "==================================================\n";
echo "🛠️ STARTING CRYPTOGRAPHIC LICENSE HANDSHAKE TESTS\n";
echo "==================================================\n";

$secret = 'test_master_secret_key_999';
putenv("PM_LICENSE_SIGN_SECRET={$secret}");

$manager = new \MassUtility\Service\SettingsManager();

// Test Case 1: Unlicensed Default Gate Check
echo "Test 1: Running unlicensed gate check...\n";
$unlicensed = $manager->getLicenseStatus();
assert($unlicensed['valid'] === false);
assert($unlicensed['features']['PM_ENABLE_FILE_TOOLS'] === 0);
assert($unlicensed['features']['PM_ENABLE_QUERY_WIZARD'] === 0);
echo "✅ Test 1 Passed: Unlicensed fail-closed status works.\n\n";

// Test Case 2: Valid Signed Token Check
echo "Test 2: Injecting valid signed pro license token...\n";
$_SERVER['HTTP_HOST'] = 'myteststore.com';

$payload = [
    'license_key' => 'MASS-AAAA-BBBB',
    'store_url' => 'myteststore.com',
    'tier' => 'pro',
    'features' => [
        'PM_ENABLE_FILE_TOOLS' => 1,
        'PM_ENABLE_DB_TOOLS' => 1,
        'PM_ENABLE_QUERY_WIZARD' => 0,
        'PM_ENABLE_GHOST_PURGER' => 1,
        'PM_ENABLE_GDPR_SWEEPER' => 1
    ],
    'expires_at' => null,
    'generated_at' => time()
];

$payloadJson = json_encode($payload);
$signature = hash_hmac('sha256', $payloadJson, $secret);
$token = base64_encode($payloadJson);

Configuration::updateGlobalValue('PM_LICENSE_TOKEN', $token);
Configuration::updateGlobalValue('PM_LICENSE_SIGNATURE', $signature);

$status = $manager->getLicenseStatus();
assert($status['valid'] === true);
assert($status['tier'] === 'pro');
assert($status['features']['PM_ENABLE_FILE_TOOLS'] === 1);
assert($status['features']['PM_ENABLE_QUERY_WIZARD'] === 0);
echo "✅ Test 2 Passed: Valid signed token verification works.\n\n";

// Test Case 3: Tampered Token Protection Check
echo "Test 3: Attempting to bypass gate by tampering with base64 payload data...\n";
$tamperedPayload = $payload;
$tamperedPayload['features']['PM_ENABLE_QUERY_WIZARD'] = 1; // Inject unauthorized query wizard access
$tamperedToken = base64_encode(json_encode($tamperedPayload));

Configuration::updateGlobalValue('PM_LICENSE_TOKEN', $tamperedToken); // Replace token but leave old signature

$tamperedStatus = $manager->getLicenseStatus();
assert($tamperedStatus['valid'] === false); // Must fail check!
assert($tamperedStatus['features']['PM_ENABLE_QUERY_WIZARD'] === 0); // Must be locked down
echo "✅ Test 3 Passed: Cryptographic signature mismatch detected, system successfully failed closed!\n\n";

echo "==================================================\n";
echo "🎉 ALL CRYPTOGRAPHIC LICENSING TESTS PASSED!\n";
echo "==================================================\n";
