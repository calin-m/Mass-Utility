# 📊 Mass Standalone SaaS Dashboard Manual

This directory contains the decoupled Single-Page SaaS Application used by merchants to control backup rotations, review database states, write custom AST queries, and manage Google Drive synchronization.

---

## 🛠️ System Directory Structure

*   `public/`
    *   `index.php`: Main entry point, serving the static Single-Page App and handling authentication.
    *   `views/`:
        *   `css/`: Dark-mode themed layout variables and typography styles.
        *   `js/`: ES6 Javascript modules.
            *   `core/UiEngine.js`: Orchestrates view panels transitions and modal logic.
            *   `modules/`: Tool-specific controllers (FileTools, DatabaseTools, History, Settings).
*   `src/`
    *   `Service/`
        *   `SQLiteConnectionManager.php`: Handles SQLite database connections pointing to the centralized `data/pm_cloud_backups.db` file.
        *   `TenantSettingsRepository.php`: Manages localized settings configuration reads/writes with JSON decoders and plain-text fallbacks.
        *   `SaaSGoogleOAuthBroker.php`: Handles Google OAuth tokens broker callback handshake.

---

## 🔑 Single Sign-On (SSO) & OTT Security

The dashboard blocks direct unauthorized connections. Access is established through a cryptographically signed **One-Time Token (OTT)**:

1.  **Redirection**: Clicking **Launch Standalone Dashboard** in PrestaShop redirects the employee to `https://store.com/mass_utility_dashboard/?ott=TOKEN`.
2.  **Decryption**: The dashboard reads `PM_BRIDGE_TOKEN` from the shared SQLite database, derives an AES-256 decryption key, and decrypts the token payload.
3.  **Validation**: It validates the `expiry` timestamp (60 seconds TTL) and confirms the `id_employee` parameter matches the active store administrator session.
4.  **Token Stripping**: The application immediately saves the employee session and redirects to the clean home URL, scrubbing the OTT parameter from browser memory to prevent replay hijacking.

---

## ☁️ Google Drive Redundancy Sync

*   **OAuth Broker**: The dashboard implements a dynamic OAuth Broker. When connecting to Google Drive, the client authorizer communicates via state payloads signed with the local bridge token, ensuring no merchant-specific client IDs are exposed publicly.
*   **Zero-Retention Webhook Logs**: Webhook callback events logging writes minimal metadata (Event ID and Type) to prevent customer information exposure, satisfying strict privacy policies.
