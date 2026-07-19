# Project Mass - Super-Admin Licensing Portal

This is the decoupled SaaS Super-Admin licensing management panel for Project Mass. It enables admins to register merchant client accounts, issue license keys, manage subscription tiers, and control feature gates.

## Directory Structure

*   `public/`
    *   `index.php`: Router gateway / Entry point.
*   `src/`
    *   `Controller/`
        *   `AdminApiController.php`: Handlers for AJAX management API.
    *   `Repository/`
        *   `LicenseRepository.php`: SQLite queries for CRUD operations on users and licenses.
    *   `Service/`
        *   `AdminSettingsManager.php`: Handles administrative authentication and session state.
*   `views/`
    *   `css/`
        *   `admin.css`: Core design system variables and styles.
    *   `js/`
        *   `AdminEngine.js`: Frontend dynamic UI controller.
    *   `templates/`
        *   `login.tpl`: Administrator login card layout.
        *   `admin_dashboard.tpl`: Administration console layout.

## Database & Tables

Reads from the shared SQLite database located at `mass_utility_dashboard/data/pm_cloud_backups.db`.

1.  `pm_admins`: Admin credentials and authentication.
2.  `pm_users`: Client merchant/user accounts.
3.  `pm_licenses`: Licensing keys bound to store URLs, tiers, and statuses.

## Setup & Migrations

To establish the SQLite schemas and seed the initial super-admin credentials (`admin` / `admin123`), execute the migration script:

```bash
php mass_utility_dashboard/bin/migration.php
```

## Security & Verification

*   **HMAC-SHA256 Token Signatures**: Licensing tokens issued by the API include a signature generated using a shared `PM_LICENSE_SIGN_SECRET` environment variable (defaults to a static key if not defined). The client-side PrestaShop module verifies this signature to prevent payload tampering.
*   **Fail-Closed Logic**: If verification fails or domain limits are breached, premium features are disabled instantly without interrupting standard operations.
*   **PDO Parameters**: All queries use structured PDO parameters to neutralize SQL injections.
*   **XSS Protection**: String templates sanitize database output values.
