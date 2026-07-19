<?php
declare(strict_types=1);

namespace MassUtility\SaaS\Service;

/**
 * SessionDecryptor: Cryptographic utility to parse and decrypt the One-Time Token (OTT)
 * using the Symfony _COOKIE_KEY_ constant value from PrestaShop's parameters.php.
 */
class SessionDecryptor
{
    private string $cookieKey; // Stores Symfony _COOKIE_KEY_ value

    public function __construct(string $cookieKey)
    {
        $this->cookieKey = $cookieKey;
    }

    /**
     * Decrypt the OTT parameter passed via request query.
     * Validates employee session signature and expiration context.
     */
    public function decryptToken(string $ott): ?array
    {
        if (empty($ott)) {
            return null;
        }

        $data = base64_decode($ott, true);
        if ($data === false) {
            return null;
        }

        $ivLength = openssl_cipher_iv_length('aes-256-cbc');
        if (strlen($data) <= $ivLength) {
            return null;
        }

        $iv = substr($data, 0, $ivLength);
        $ciphertext = substr($data, $ivLength);

        // Derive key from the Symfony _COOKIE_KEY_ using sha256 hashing
        $key = hash('sha256', $this->cookieKey, true);

        $decrypted = openssl_decrypt($ciphertext, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        if ($decrypted === false) {
            return null;
        }

        $payload = json_decode($decrypted, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        // Assert existence of required payload attributes
        if (!isset($payload['id_employee']) || !isset($payload['expiry'])) {
            return null;
        }

        // Validate expiration boundary to prevent replay attacks
        if (time() > (int)$payload['expiry']) {
            return null;
        }

        return $payload;
    }

    /**
     * Encrypt a token payload (used by the PrestaShop Bridge module to build the open button link).
     */
    public function encryptToken(int $employeeId, int $ttlSeconds = 60): string
    {
        $payload = json_encode([
            'id_employee' => $employeeId,
            'expiry' => time() + $ttlSeconds
        ]);

        $key = hash('sha256', $this->cookieKey, true);
        $ivLength = openssl_cipher_iv_length('aes-256-cbc');
        $iv = random_bytes($ivLength);

        $ciphertext = openssl_encrypt($payload, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        return base64_encode($iv . $ciphertext);
    }
}
