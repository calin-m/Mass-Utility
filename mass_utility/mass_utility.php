<?php
declare(strict_types=1);

if (!defined('_PS_VERSION_')) {
    exit;
}

class Mass_Utility extends Module
{
    public function __construct()
    {
        $this->name = 'mass_utility';
        $this->tab = 'administration';
        $this->version = '1.0.1';
        $this->author = 'Calin Mois';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = ['min' => '1.7.0.0', 'max' => _PS_VERSION_];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = $this->l('Mass Utility');
        $this->description = $this->l('Enterprise-grade utility suite featuring a Native Safety Governor, AST Database Mutations, Chunked Backups, and Modular Maintenance Sweepers.');
    }

    public function install(): bool
    {
        return parent::install() && $this->registerHook('actionProductSave');
    }

    public function uninstall(): bool
    {
        return parent::uninstall();
    }

    /**
     * Webhook Event Engine: Hook to sync real-time product updates to standalone Dashboard
     */
    public function hookActionProductSave(array $params): void
    {
        $idProduct = (int)($params['id_product'] ?? 0);
        if ($idProduct <= 0) {
            return;
        }

        $saasWebhookUrl = $this->getSaaSWebhookUrl();
        if (empty($saasWebhookUrl)) {
            return;
        }

        $payload = [
            'event' => 'product_updated',
            'id_product' => $idProduct,
            'timestamp' => time()
        ];

        // Perform a quick non-blocking-like request with a low timeout
        $ch = curl_init($saasWebhookUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2); 
        curl_exec($ch);
        curl_close($ch);
    }

    private function getSaaSWebhookUrl(): string
    {
        if (class_exists('\Configuration')) {
            $url = \Configuration::get('PM_SAAS_DASHBOARD_URL');
            if ($url) {
                return rtrim($url, '/') . '/webhook/product-updated';
            }
        }
        return 'http://localhost:8000/webhook/product-updated'; // Local fallback
    }

    /**
     * Standard PrestaShop Module Configuration Page
     * Serves as the Native Staging Unified Dashboard Interface!
     */
    public function getContent(): string
    {
        if (class_exists('\Tools') && \Tools::getValue('action') === 'google_oauth_callback') {
            $code = \Tools::getValue('code');
            $state = \Tools::getValue('state');
            $expectedToken = \Tools::getAdminTokenLite('AdminModules');
            
            if ($state !== $expectedToken) {
                return $this->renderOauthCallbackPage(false, 'Invalid state token. Possible CSRF attack detected.');
            }
            
            $saasUrl = $this->getSaaSUrl();
            $callbackUrl = rtrim($saasUrl, '/') . '/api/v1/google_oauth_callback';
            
            $ch = curl_init($callbackUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'code' => $code,
                'state' => $state,
                'redirect_uri' => $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility&action=google_oauth_callback'
            ]));
            
            $secureToken = \Configuration::get('PM_SECURE_TOKEN');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'X-Bridge-Token: ' . $secureToken
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response === false) {
                return $this->renderOauthCallbackPage(false, 'Failed to connect to Standalone Dashboard.');
            }
            
            $resData = json_decode((string)$response, true);
            if ($httpCode === 200 && !empty($resData['success'])) {
                return $this->renderOauthCallbackPage(true);
            } else {
                $err = $resData['error'] ?? 'Unknown error during token exchange.';
                return $this->renderOauthCallbackPage(false, $err);
            }
        }
        if (class_exists('\Tools') && \Tools::getValue('action') === 'disconnect_gdrive') {
            $saasUrl = $this->getSaaSUrl();
            $secureToken = \Configuration::get('PM_SECURE_TOKEN');
            
            $ch = curl_init(rtrim($saasUrl, '/') . '/api/v1/disconnect_google_drive');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-Bridge-Token: ' . $secureToken
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_exec($ch);
            curl_close($ch);
            
            $redirectUrl = $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility';
            \Tools::redirectAdmin($redirectUrl);
        }

        $secureToken = '';
        if (class_exists('\Configuration')) {
            $secureToken = \Configuration::get('PM_SECURE_TOKEN');
        }
        
        $employeeId = isset($this->context->employee) ? (int)$this->context->employee->id : 0;
        $ott = '';
        if (!empty($secureToken) && $employeeId > 0) {
            $ott = $this->encryptToken($employeeId, $secureToken);
        }

        $standaloneUrl = $this->getSaaSUrl();
        $launcherUrl = $standaloneUrl;
        if (!empty($ott)) {
            $launcherUrl .= '?ott=' . urlencode($ott);
        }

        $apiEndpoint = $this->getApiEndpoint();

        // Convert relative SaaS URL to absolute URL for cURL
        $curlSaaSUrl = $standaloneUrl;
        if (strpos($curlSaaSUrl, 'http') !== 0) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
            $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
            $curlSaaSUrl = $protocol . $host . rtrim($basePath, '/\\') . '/../mass_utility_dashboard/';
        }

        // Query GDrive connection state dynamically from the SaaS Dashboard
        $isGdriveConnected = false;
        $authUrl = '#';
        $gdriveConfigured = false;
        try {
            $ch = curl_init(rtrim($curlSaaSUrl, '/') . '/api/v1/get_auth_status');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-Bridge-Token: ' . $secureToken
            ]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            curl_close($ch);
            
            if ($res) {
                $statusData = json_decode($res, true);
                $isGdriveConnected = !empty($statusData['authenticated']);
                $gdriveConfigured = !empty($statusData['configured']);
                $authUrl = $statusData['auth_url'] ?? '#';
            }
        } catch (\Throwable $e) {}

        return $this->renderBridgeStatusPage($launcherUrl, $apiEndpoint, $isGdriveConnected, $authUrl, $gdriveConfigured);
    }

    private function renderOauthCallbackPage(bool $success, string $errorMsg = ''): string
    {
        if ($success) {
            return '
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #10b981;">
                <h2>Authentication Successful!</h2>
                <p>Connecting to Google Drive... This window will close automatically.</p>
            </div>
            <script>
                if (window.opener) {
                    try {
                        window.opener.postMessage({ type: "google_drive_auth_success" }, "*");
                    } catch (e) {
                        console.error("Failed to postMessage to opener:", e);
                    }
                }
                window.close();
            </script>';
        } else {
            return '
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px; color: #ef4444;">
                <h2>Authentication Failed</h2>
                <p>' . htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8') . '</p>
                <button onclick="window.close()">Close Window</button>
            </div>';
        }
    }

    private function getSaaSUrl(): string
    {
        $url = '';
        if (class_exists('\Configuration')) {
            $url = \Configuration::get('PM_SAAS_DASHBOARD_URL');
        }
        if (empty($url)) {
            $url = '../mass_utility_dashboard/';
        }
        return rtrim($url, '/') . '/';
    }

    private function getApiEndpoint(): string
    {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        return $protocol . $host . $this->_path . 'api.php';
    }

    private function encryptToken(int $employeeId, string $bridgeToken, int $ttlSeconds = 60): string
    {
        $payload = json_encode([
            'id_employee' => $employeeId,
            'bridge_url' => $this->getApiEndpoint(),
            'expiry' => time() + $ttlSeconds
        ]);

        $key = hash('sha256', $bridgeToken, true);
        $ivLength = openssl_cipher_iv_length('aes-256-cbc');
        $iv = random_bytes($ivLength);

        $ciphertext = openssl_encrypt($payload, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        return base64_encode($iv . $ciphertext);
    }

    private function renderBridgeStatusPage(string $launcherUrl, string $apiEndpoint, bool $isGdriveConnected = false, string $authUrl = '#', bool $gdriveConfigured = false): string
    {
        return '
        <style>
            .pm-bridge-card {
                --bridge-bg: linear-gradient(135deg, #1e1e2f 0%, #0f0f1a 100%);
                --bridge-border: #2d2d44;
                --bridge-text: #e3e3e3;
                --bridge-accent-start: #a78bfa;
                --bridge-accent: #8b5cf6;
                --bridge-accent-hover: #6d28d9;
                --bridge-muted: #9ca3af;
                --bridge-success: #10b981;
                --bridge-success-bg: rgba(16, 185, 129, 0.15);
                --bridge-success-border: rgba(16, 185, 129, 0.3);
                --bridge-warning: #f59e0b;
                --bridge-warning-bg: rgba(245, 158, 11, 0.15);
                --bridge-warning-border: rgba(245, 158, 11, 0.3);
                --bridge-danger: #ef4444;
                --bridge-danger-hover: #b91c1c;
                --bridge-danger-bg: rgba(239, 68, 68, 0.15);
                --bridge-danger-border: rgba(239, 68, 68, 0.3);
                --bridge-code-bg: #09090e;
                --bridge-code-text: #38bdf8;
                --bridge-white: #ffffff;

                background: var(--bridge-bg);
                border: 1px solid var(--bridge-border);
                border-radius: 12px;
                padding: 2.5rem;
                color: var(--bridge-text);
                font-family: "Inter", sans-serif;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                margin: 20px 0;
            }
            .pm-bridge-title {
                font-size: 2rem;
                font-weight: 700;
                background: linear-gradient(135deg, var(--bridge-accent-start) 0%, var(--bridge-accent) 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 0.5rem;
            }
            .pm-bridge-subtitle {
                font-size: 0.95rem;
                color: var(--bridge-muted);
                margin-bottom: 2rem;
            }
            .pm-bridge-btn {
                background: linear-gradient(135deg, var(--bridge-accent) 0%, var(--bridge-accent-hover) 100%);
                border: none;
                border-radius: 8px;
                color: var(--bridge-white) !important;
                font-weight: 600;
                padding: 0.85rem 1.75rem;
                display: inline-flex;
                align-items: center;
                gap: 0.75rem;
                text-decoration: none !important;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
                font-size: 1rem;
            }
            .pm-bridge-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(109, 40, 217, 0.5);
                color: var(--bridge-white) !important;
            }
            .pm-bridge-btn-gdrive {
                background: linear-gradient(135deg, var(--bridge-success) 0%, #059669 100%);
                border: none;
                border-radius: 8px;
                color: var(--bridge-white) !important;
                font-weight: 600;
                padding: 0.85rem 1.75rem;
                display: inline-flex;
                align-items: center;
                gap: 0.75rem;
                text-decoration: none !important;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                font-size: 1rem;
            }
            .pm-bridge-btn-gdrive:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
                color: var(--bridge-white) !important;
            }
            .pm-bridge-status-row {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
            }
            .pm-bridge-badge {
                background: var(--bridge-success-bg);
                color: var(--bridge-success);
                border: 1px solid var(--bridge-success-border);
                padding: 0.35rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.8rem;
                font-weight: 600;
                text-transform: uppercase;
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
            }
            .pm-bridge-badge-dot {
                width: 8px;
                height: 8px;
                background-color: var(--bridge-success);
                border-radius: 50%;
                display: inline-block;
                box-shadow: 0 0 8px var(--bridge-success);
            }
            .pm-bridge-info-section {
                border-top: 1px solid var(--bridge-border);
                margin-top: 2rem;
                padding-top: 2rem;
            }
            .pm-bridge-label {
                font-size: 0.8rem;
                font-weight: 700;
                color: var(--bridge-muted);
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 0.5rem;
            }
            .pm-bridge-code {
                background: var(--bridge-code-bg);
                border: 1px solid var(--bridge-border);
                color: var(--bridge-code-text);
                padding: 0.75rem 1rem;
                border-radius: 8px;
                font-family: monospace;
                font-size: 0.9rem;
                margin-top: 0.25rem;
                display: block;
                word-break: break-all;
            }
        </style>
        <div class="pm-bridge-card">
            <div class="pm-bridge-status-row">
                <span class="pm-bridge-badge">
                    <span class="pm-bridge-badge-dot"></span> API Bridge Active
                </span>
            </div>
            <h2 class="pm-bridge-title">⚡ Mass Utility Bridge</h2>
            <p class="pm-bridge-subtitle">Decoupled API gateway and secure telemetry pipeline. The administration UI has been relocated to the Standalone SaaS Dashboard for maximum performance and IP security.</p>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;">
                <a href="' . $launcherUrl . '" class="pm-bridge-btn" target="_blank">
                    Launch Standalone Dashboard <i class="icon-external-link"></i>
                </a>
            </div>

            <!-- Google Drive Status Section -->
            <div class="pm-bridge-info-section">
                <div class="pm-bridge-label">☁️ Google Drive Redundancy</div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.5rem; background: var(--bridge-code-bg); border: 1px solid var(--bridge-border); padding: 1.25rem; border-radius: 8px;">
                    ' . ($isGdriveConnected ? '
                        <div>
                            <span class="pm-bridge-badge" style="background: var(--bridge-success-bg); color: var(--bridge-success); border: 1px solid var(--bridge-success-border); text-transform: none;">
                                <span class="pm-bridge-badge-dot"></span> Connected
                            </span>
                            <span style="font-size: 0.85rem; color: var(--bridge-muted); margin-left: 0.5rem;">Google Drive backups are active.</span>
                        </div>
                        <a href="' . $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility&action=disconnect_gdrive" class="pm-bridge-btn" style="background: linear-gradient(135deg, var(--bridge-danger) 0%, var(--bridge-danger-hover) 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); font-size: 0.85rem; padding: 0.5rem 1rem;">
                            Disconnect Account
                        </a>
                    ' : (
                        $gdriveConfigured ? '
                            <div>
                                <span class="pm-bridge-badge" style="background: var(--bridge-warning-bg); color: var(--bridge-warning); border: 1px solid var(--bridge-warning-border); text-transform: none;">
                                    <span class="pm-bridge-badge-dot" style="background-color: var(--bridge-warning); box-shadow: 0 0 8px var(--bridge-warning);"></span> Disconnected
                                </span>
                                <span style="font-size: 0.85rem; color: var(--bridge-muted); margin-left: 0.5rem;">Authorize Google Drive redundancy.</span>
                            </div>
                            <a href="#" onclick="window.open(\'' . $authUrl . '\', \'GoogleDriveOAuth\', \'width=600,height=650,left=150,top=100\'); return false;" class="pm-bridge-btn-gdrive" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
                                Connect Account
                            </a>
                        ' : '
                            <div>
                                <span class="pm-bridge-badge" style="background: var(--bridge-danger-bg); color: var(--bridge-danger); border: 1px solid var(--bridge-danger-border); text-transform: none;">
                                    <span class="pm-bridge-badge-dot" style="background-color: var(--bridge-danger); box-shadow: 0 0 8px var(--bridge-danger);"></span> Cloud Service Offline
                                </span>
                                <span style="font-size: 0.85rem; color: var(--bridge-muted); margin-left: 0.5rem;">The cloud backup service is currently unavailable. Please contact the administrator.</span>
                            </div>
                        '
                    )) . '
                </div>
            </div>

            <div class="pm-bridge-info-section" style="margin-top: 1.5rem; padding-top: 1.5rem;">
                <div class="pm-bridge-label">API Gateway Endpoint URL</div>
                <span class="pm-bridge-code">' . htmlspecialchars($apiEndpoint) . '</span>
            </div>
        </div>
        
        <script>
            // Reload status page when parent receives OAuth success event
            window.addEventListener("message", function(event) {
                if (event.data && event.data.type === "google_drive_auth_success") {
                    window.location.reload();
                }
            });
        </script>
        ';
    }
}
