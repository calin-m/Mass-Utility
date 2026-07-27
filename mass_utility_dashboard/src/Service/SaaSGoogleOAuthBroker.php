<?php
// @Arch[SaaSGoogleOAuthBroker]

declare(strict_types=1);

namespace MassUtility\SaaS\Service;

use Exception;

class SaaSGoogleOAuthBroker
{
    private Logger $logger;
    private TenantSettingsRepositoryInterface $settingsRepository;
    private string $clientId;
    private string $clientSecret;

    public function __construct(Logger $logger, TenantSettingsRepositoryInterface $settingsRepository)
    {
        $this->logger = $logger;
        $this->settingsRepository = $settingsRepository;

        // Load master credentials from SQLite Vault
        $this->clientId = $this->settingsRepository->get('PM_MASTER_GD_CLIENT_ID') ?? '';
        $this->clientSecret = $this->settingsRepository->get('PM_MASTER_GD_CLIENT_SECRET') ?? '';
    }

    public function isConfigured(): bool
    {
        return !empty($this->clientId) && !empty($this->clientSecret);
    }

    public function isAuthenticated(): bool
    {
        return !empty($this->settingsRepository->get('PM_GD_REFRESH_TOKEN')) || !empty($this->settingsRepository->get('PM_GD_ACCESS_TOKEN'));
    }

    public function disconnect(): void
    {
        $this->settingsRepository->delete('PM_GD_ACCESS_TOKEN');
        $this->settingsRepository->delete('PM_GD_REFRESH_TOKEN');
        $this->settingsRepository->delete('PM_GD_EXPIRES_AT');
    }

    public function getAuthUrl(string $redirectUri, string $state = ''): string
    {
        $clientId = $this->clientId;
        
        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'https://www.googleapis.com/auth/drive.file',
            'access_type' => 'offline',
            'prompt' => 'consent'
        ];
        
        if (!empty($state)) {
            $params['state'] = $state;
        }
        
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    public function exchangeCodeForTokens(string $code, string $redirectUri): array
    {
        $clientId = $this->clientId;
        $clientSecret = $this->clientSecret;

        $postData = [
            'code' => $code,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code'
        ];

        return $this->performTokenRequest($postData);
    }

    public function refreshAccessToken(string $refreshToken): array
    {
        $clientId = $this->clientId;
        $clientSecret = $this->clientSecret;

        $postData = [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token'
        ];

        return $this->performTokenRequest($postData);
    }

    private function performTokenRequest(array $postData): array
    {
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->logger->log("Google token exchange failed (HTTP $httpCode): $response", 'ERROR');
            throw new Exception("Google token exchange failed (HTTP $httpCode)");
        }

        $data = json_decode((string)$response, true);
        if (empty($data['access_token'])) {
            throw new Exception("Google token exchange returned invalid payload.");
        }

        $this->settingsRepository->set('PM_GD_ACCESS_TOKEN', $data['access_token']);
        if (!empty($data['refresh_token'])) {
            $this->settingsRepository->set('PM_GD_REFRESH_TOKEN', $data['refresh_token']);
        }
        $expiresAt = time() + (int)($data['expires_in'] ?? 3600);
        $this->settingsRepository->set('PM_GD_EXPIRES_AT', $expiresAt);

        return [
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token'] ?? $this->settingsRepository->get('PM_GD_REFRESH_TOKEN'),
            'expires_at' => $expiresAt
        ];
    }
}
