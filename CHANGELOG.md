# 📜 Mass Utility — Version Changelog & Release History

All notable changes, architectural enhancements, security audits, and feature implementations for the Mass Utility Framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0-RC3] - 2026-07-30

### 🚀 Added
- **Standalone Public Demo Mode (`/v2/index.html`)**: Added direct `/v2/` URL path auto-detection across both Merchant Dashboard (`mass_utility_dashboard`) and Super-Admin Portal (`mass_utility_admin`).
- **PHP Gateway Demo Bypass (`$isDemoRequest`)**: Updated `public/index.php` in both portals to allow public demonstration access without PrestaShop Back-Office session lockouts or 404/403 errors.
- **Client-Side In-Memory Air-Gap Execution Engine**: Added 100% in-browser JS memory dispatchers in `FetchService.ts` and `AdminFetchAdapter.ts`. Zero HTTP calls touch host PHP scripts or SQL databases in Demo Mode.
- **MariaDB AST SQL Reconstruction Engine in Demo Mutation History**: Added valid AST JSON payloads to mock responses in `FetchService.ts`, enabling `sqlReconstructor.ts` to render live MariaDB `UPDATE` queries and projected rollback SQL snippets in Demo mode.
- **Simulated Native Safety Governor Telemetry (Option A)**: Added 100% Optimal Health mock response (`load_state: 'OPTIMAL'`, 8 AMD EPYC Virtual Cores, 4 green pre-flight safety audits, CloudLinux LVE Shield Active).
- **OWASP Security Audit & Report**: Published automated threat mitigation analysis (`security_audit_report.md`) confirming 100% JS isolation, zero server traffic, 0 SQL execution risk on host, and HTTP 403 Forbidden backend API shielding.
- **Enterprise Tier Demo Key Activation**: Configured `PM-DEMO-ENTERPRISE-KEY` auto-hydration in Demo Mode to unlock all 6 enterprise capabilities without `PRO LOCK` badges.

### 🎨 Fixed
- **Super-Admin Infinite Loading Spinner in Demo Mode**: Resolved `checkAuth()` initialization bug in `useAdminData.ts` by setting `authChecked: true`, `hasAdmin: true`, `authenticated: true`, and populating mock seed data when `isDemoMode` is active.
- **High-Contrast Dual-Theme Banner Styling**: Updated amber demo banner (`mass_utility_admin`) and purple demo banner (`mass_utility_dashboard`) using explicit `darkMode` React state ternaries (`darkMode ? ... : ...`) for 100% contrast compliance in Light Mode.
- **Normalized Package Tier References**: Synchronized Bob Operator mock license tier from legacy `'Starter Tier'` to `'Basic Tier'` to align with the standard Package Tiers matrix (`basic`, `pro`, `enterprise`, `developer`).

---

## [2.0.0-RC2] - 2026-07-28

### 🚀 Added
- **B2B Multi-Tenant Company License Pools (`pm_companies`)**: Built complete B2B company directory, team member assignment dropdowns, company capacity utilization meters (`usedCount` / `max_licenses`), and 1-click pool key generator.
- **B2B Key Retention Safeguard**: Implemented auto-rebound logic in `LicenseRepository.php` returning assigned keys to the company pool when team members are transferred or updated.
- **Super-Admin Componentization & A11y Refactor**: Extracted `<CompanyHeaderStats>`, `<ClientCredentialsBanner>`, `<SecurityAuditGrid>`, `<ReassignLicenseModal>`, and `<AuditLogPayloadModal>`. Standardized `<TableCellIdentity>`, `<TableCellActions>`, and `<PaginationBar>` across all directory tables.
- **SaaS Server Infrastructure Security Inspector (`SecurityHealthTab.tsx`)**: Added 4-card infrastructure scanner auditing HSTS headers, 301 SSL redirects, database file isolation (`pm_cloud_backups.db` 403), and filesystem permissions (`0755`/`0644`).
- **CSV Audit Log Exporter**: Added 1-click CSV exporter endpoint (`?action=api_export_admin_logs_csv`) and `<ConfirmModal>` backdrop shield for clearing audit trails.

---

## [2.0.0-RC1] - 2026-07-22

### 🚀 Added
- **V2 Standalone React 18 SPA Architecture**: Migrated Merchant Dashboard to Vite + React 18 + TypeScript + Vanilla CSS design tokens.
- **MariaDB AST Query Compiler & SQL Reconstructor (`sqlReconstructor.ts`)**: Built visual query wizard, domain presets, AST condition tree parser, and executable SQL/rollback reconstruction engine.
- **Time-Resilient Backup Engine & Google Drive Sync**: Built paginated 5,000-row chunked database dumper, `.pinned` sidecar metadata subsystem, and 5MB chunked multipart Google Drive Cloud sync client.
- **Zero-CLS Safety Governor (`GovernorTab.tsx`)**: Built real-time CloudLinux LVE telemetry monitor featuring Zero-CLS skeleton shimmer frames.
