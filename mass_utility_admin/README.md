# 👑 Project Mass - Super-Admin Licensing Portal Manual

This directory houses the decoupled SaaS Super-Admin Licensing Management console. It enables the system operator to issue merchant license keys, manage subscription tiers, bind store domains, and control feature availability.

---

## 🛠️ System Directory Structure

*   `public/`
    *   `index.php`: Main entry point, hosting unauthenticated public activation endpoints (`activate_key`) and routing admin actions.
*   `src/`
    *   `Controller/AdminApiController.php`: Action dispatcher for license details, domain updates, and admin password checks.
    *   `Repository/LicenseRepository.php`: Manages SQLite database CRUD statements.
    *   `Service/AdminSettingsManager.php`: Governs Super-Admin session cookies and password validation.
*   `views/`
    *   `css/admin.css`: Core obsidian theme variables, capsule tab styles, and glassmorphic card elements.
    *   `js/AdminEngine.js`: Front-end handler managing modals, password generation, and AJAX data tables.

---

## 💾 Database Registry & Table Schemas

All administrative details are stored within the centralized SQLite file located at `mass_utility_dashboard/data/pm_cloud_backups.db`:

1.  **`pm_admins`**: Stores super-admin accounts and hashed access passwords.
2.  **`pm_users`**: Client client accounts (Email, Hashed Password, Company).
3.  **`pm_licenses`**: Active merchant keys mapped to bound store URLs, tiers (`basic`, `pro`, `developer`), and expiration dates.

---

## 🔒 Domain Locking & Activation Sequence

To prevent license sharing and unauthorized installations:
1.  **Key Generation**: The Super-Admin generates a key without binding it to a domain (domain field defaults to `NULL`).
2.  **Module Activation**: The merchant types the key inside PrestaShop. The module makes a cURL post request containing the store's domain (`HTTP_HOST`).
3.  **Binding Handshake**: The Licensing Portal receives the request. If the domain is blank, the portal permanently binds the license key to that specific store URL.
4.  **Verification**: If the key is already bound, the portal verifies that the request originates from the bound URL. Any mismatch returns a domain error, blocking module activation.
5.  **Admin Override**: The Super-Admin can edit or clear the bound domain at any time inside the Portal Registry table.
