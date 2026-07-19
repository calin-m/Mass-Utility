<?php
declare(strict_types=1);

if (!defined('_PS_VERSION_')) {
    exit;
}

class Mass_Utility extends Module
{
    private const LICENSING_SERVER_URL = 'https://startviziune.ro/mass_utility_admin';

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
        // Handle OAuth callback first
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

        // Handle License Deactivation
        if (class_exists('\Tools') && \Tools::getValue('action') === 'deactivate_license') {
            if (class_exists('\Configuration')) {
                \Configuration::deleteByName('PM_LICENSE_KEY');
                \Configuration::deleteByName('PM_SECURE_TOKEN');
                \Configuration::deleteByName('PM_LICENSE_TIER');
            }
            try {
                $dbPath = _PS_ROOT_DIR_ . '/mass_utility_dashboard/data/pm_cloud_backups.db';
                if (file_exists($dbPath)) {
                    $pdo = new \PDO('sqlite:' . $dbPath);
                    $pdo->exec("DROP TABLE IF EXISTS tenant_settings;"); // nosec
                }
            } catch (\Throwable $e) {}
            
            $redirectUrl = $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility';
            \Tools::redirectAdmin($redirectUrl);
        }

        // Handle License Activation Submission
        $activationError = '';
        if (class_exists('\Tools') && \Tools::isSubmit('btnSubmitActivation')) {
            $licenseKey = trim(\Tools::getValue('pm_license_key'));
            $licensingServer = self::LICENSING_SERVER_URL;
            
            if (empty($licenseKey)) {
                $activationError = 'License Key is required.';
            } else {
                $storeUrl = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $activationUrl = rtrim($licensingServer, '/') . '/?action=activate_key';
                
                $ch = curl_init($activationUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                    'license_key' => $licenseKey,
                    'store_url' => $storeUrl
                ]));
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                $res = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($res === false) {
                    $activationError = 'Failed to connect to the licensing server. Please verify the Super Admin Portal URL.';
                } else {
                    $data = json_decode((string)$res, true);
                    if ($httpCode === 200 && !empty($data['success'])) {
                        if (class_exists('\Configuration')) {
                            \Configuration::updateValue('PM_LICENSE_KEY', $licenseKey);
                            \Configuration::updateValue('PM_SECURE_TOKEN', $data['secure_token']);
                            \Configuration::updateValue('PM_LICENSE_TIER', $data['tier']);
                            \Configuration::updateValue('PM_SAAS_DASHBOARD_URL', rtrim($licensingServer, '/') . '/../mass_utility_dashboard/');
                        }
                        
                        $this->syncLocalSQLite($licenseKey, $data['secure_token']);
                        
                        $redirectUrl = $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility';
                        \Tools::redirectAdmin($redirectUrl);
                    } else {
                        $activationError = $data['error'] ?? 'Invalid license key or activation failed.';
                    }
                }
            }
        }

        $secureToken = '';
        $licenseKey = '';
        if (class_exists('\Configuration')) {
            $secureToken = \Configuration::get('PM_SECURE_TOKEN');
            $licenseKey = \Configuration::get('PM_LICENSE_KEY');
        }

        // Live status verification check
        if (!empty($secureToken) && !empty($licenseKey)) {
            $licensingServer = self::LICENSING_SERVER_URL;
            $storeUrl = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $checkUrl = rtrim($licensingServer, '/') . '/?action=activate_key';
            
            $ch = curl_init($checkUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
                'license_key' => $licenseKey,
                'store_url' => $storeUrl
            ]));
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($res !== false) {
                $data = json_decode((string)$res, true);
                if ($httpCode === 200 && empty($data['success'])) {
                    $serverError = $data['error'] ?? '';
                    if (strpos(strtolower($serverError), 'suspended') !== false || strpos(strtolower($serverError), 'expired') !== false) {
                        // Deactivate locally
                        \Configuration::deleteByName('PM_SECURE_TOKEN');
                        \Configuration::deleteByName('PM_LICENSE_TIER');
                        try {
                            $dbPath = _PS_ROOT_DIR_ . '/mass_utility_dashboard/data/pm_cloud_backups.db';
                            if (file_exists($dbPath)) {
                                $pdo = new \PDO('sqlite:' . $dbPath);
                                $pdo->exec("DROP TABLE IF EXISTS tenant_settings;"); // nosec
                            }
                        } catch (\Throwable $e) {}
                        
                        $secureToken = '';
                        $activationError = 'Your license key has been suspended or expired. Please contact the administrator.';
                    }
                }
            }
        }

        if (empty($secureToken)) {
            return $this->renderActivationForm($activationError);
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
            $chClosed = curl_close($ch);
            
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
                <a href="' . $this->context->link->getAdminLink('AdminModules', true) . '&configure=mass_utility&action=deactivate_license" class="pm-bridge-btn" style="background: linear-gradient(135deg, var(--bridge-danger) 0%, var(--bridge-danger-hover) 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);" onclick="return confirm(\'Are you sure you want to deactivate and remove your Pro license from this store?\');">
                    Deactivate License
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

    private function renderActivationForm(string $errorMsg = ''): string
    {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        
        // Build a highly educated guess for the relative Admin Panel URL
        $scriptPath = $_SERVER['SCRIPT_NAME'] ?? '';
        $baseDir = rtrim(dirname(dirname($scriptPath)), '/\\');
        $guessedUrl = $protocol . $host . $baseDir . '/mass_utility_admin';

        $errorHtml = '';
        if (!empty($errorMsg)) {
            $errorHtml = '
            <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; font-weight: 500;">
                ⚠️ ' . htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8') . '
            </div>';
        }

        return '
        <style>
            .pm-activation-card {
                background: linear-gradient(135deg, #1e1e2f 0%, #0f0f1a 100%);
                border: 1px solid #2d2d44;
                border-radius: 12px;
                padding: 2.5rem;
                color: #e3e3e3;
                font-family: "Inter", sans-serif;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
                max-width: 600px;
                margin: 20px auto;
            }
            .pm-activation-title {
                font-size: 2rem;
                font-weight: 700;
                background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 0.5rem;
                text-align: center;
            }
            .pm-activation-subtitle {
                font-size: 0.95rem;
                color: #9ca3af;
                margin-bottom: 2rem;
                text-align: center;
            }
            .pm-form-group {
                margin-bottom: 1.5rem;
            }
            .pm-form-label {
                display: block;
                font-size: 0.85rem;
                font-weight: 600;
                color: #a78bfa;
                margin-bottom: 0.5rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .pm-form-input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #2d2d44;
                border-radius: 8px;
                background: #09090e;
                color: #ffffff;
                font-size: 1rem;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }
            .pm-form-input:focus {
                border-color: #8b5cf6;
                outline: none;
            }
            .pm-activation-btn {
                background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
                border: none;
                border-radius: 8px;
                color: #ffffff !important;
                font-weight: 600;
                padding: 0.85rem;
                width: 100%;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
                font-size: 1rem;
                margin-top: 1rem;
            }
            .pm-activation-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(109, 40, 217, 0.5);
            }
        </style>
        <div class="pm-activation-card">
            <h2 class="pm-activation-title">🔓 Activate Mass Utility</h2>
            <p class="pm-activation-subtitle">Enter your merchant license key to activate the suite.</p>
            
            ' . $errorHtml . '
            
            <form action="" method="post">
                <div class="pm-form-group">
                    <label class="pm-form-label">License Key</label>
                    <input type="text" name="pm_license_key" class="pm-form-input" placeholder="MASS-XXXX-XXXX-XXXX" required style="font-family: monospace;">
                </div>
                <button type="submit" name="btnSubmitActivation" class="pm-activation-btn">Activate License</button>
            </form>
        </div>';
    }

    private function syncLocalSQLite(string $licenseKey, string $secureToken): void
    {
        try {
            $dbPath = _PS_ROOT_DIR_ . '/mass_utility_dashboard/data/pm_cloud_backups.db';
            $dbDir = dirname($dbPath);
            if (!is_dir($dbDir)) {
                @mkdir($dbDir, 0755, true);
            }
            $pdo = new \PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            
            // Create table if missing
            $sqlSettings = "CREATE TABLE IF NOT EXISTS tenant_settings (
                name VARCHAR(255) PRIMARY KEY,
                value TEXT
            );";
            $pdo->exec($sqlSettings); // nosec

            // Save settings
            $stmt = $pdo->prepare("INSERT OR REPLACE INTO tenant_settings (name, value) VALUES (?, ?)");
            $stmt->execute(['PM_LICENSE_KEY', json_encode($licenseKey)]);
            $stmt->execute(['PM_BRIDGE_TOKEN', json_encode($secureToken)]);
            
            // Generate token payload for local verification
            $payloadData = [
                'license_key' => $licenseKey,
                'store_url' => $_SERVER['HTTP_HOST'] ?? 'localhost',
                'tier' => 'pro',
                'features' => [
                    'PM_ENABLE_FILE_TOOLS' => 1,
                    'PM_ENABLE_DB_TOOLS' => 1,
                    'PM_ENABLE_QUERY_WIZARD' => 1,
                    'PM_ENABLE_GHOST_PURGER' => 1,
                    'PM_GDRIVE_SYNC' => 1,
                    'PM_RETENTION_RULE' => 1
                ],
                'expires_at' => null,
                'generated_at' => time()
            ];
            $payloadJson = json_encode($payloadData);
            $secret = getenv('PM_LICENSE_SIGN_SECRET') ?: 'default_master_sign_secret_key_123';
            $signature = hash_hmac('sha256', $payloadJson, $secret);
            $token = base64_encode($payloadJson);

            $stmt->execute(['PM_LICENSE_TOKEN', json_encode($token)]);
            $stmt->execute(['PM_LICENSE_SIGNATURE', json_encode($signature)]);
        } catch (\Throwable $e) {
            // Ignore error silently
        }
    }
}

