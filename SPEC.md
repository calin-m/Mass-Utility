# Mass Utility — Master Product Technical Specification (SPEC.md)

> **Version:** 2.0.0-RC3  
> **Target Environment:** PrestaShop 8.1.4 (PHP 8.1+ / MariaDB 10.4+) & CloudLinux LVE Cgroups  
> **Architecture:** Decoupled Headless SaaS Engine (V2 React 18 SPA + Standalone PHP Proxy + PrestaShop Bridge API)

---

## 1. System Core Overview & Objectives

Mass Utility is an enterprise-grade database manipulation, file backup, AST query compilation, B2B SaaS licensing engine, and maintenance suite built for PrestaShop 8.1.4 merchant stores.

### Key Architectural Pillars:
1. **Decoupled Dual V2 React 18 SPA Architecture:**
   - **V2 Merchant SaaS Dashboard (`mass_utility_dashboard/frontend/`):** Standalone React 18 SPA compiled to `mass_utility_dashboard/public/v2/`. Powered by Vite, TypeScript, and Vanilla CSS tokens. Launchable from PrestaShop Back-Office via 1-click AES-256 OTT redirection or accessible via standalone URL.
   - **V2 Super-Admin Licensing Portal (`mass_utility_admin/frontend/`):** Standalone React 18 SPA compiled to `mass_utility_admin/public/v2/`. Provides B2B company directory management, license pool generation, team member assignment, capability matrix controls, and SaaS infrastructure security auditing.
2. **Headless API Bridge (`mass_utility/api.php`):**
   - Secure JSON REST API gateway connecting the standalone Dashboard Proxy to PrestaShop core tables (`Db::getInstance()`).
3. **Safety Governor & Resource Protection:**
   - Real-time Linux Cgroup LVE quota detection (`quota / period`), hypervisor CPU frequency calculation (`GHz`), and memory safety floors (`128M`).

---

## 2. Core Subsystems Specification

### 2.1 🛡️ Safety Governor Subsystem
- **Purpose:** Telemetry monitoring, cgroup quota inspection, and system health protection.
- **Metrics Tracked:**
  - `Processor Model`: Physical CPU model or virtual host hypervisor (`AMD EPYC 7763 64-Core Processor`).
  - `Allocated CPU Capacity`: Account aggregate compute allocation (`25.6 GHz (8 Cores @ 3.2 GHz)`).
  - `Virtual Core Limit`: CloudLinux LVE cgroup quota limit (`8 Cores`).
  - `Memory Limit`: PHP `memory_limit` floor (`512M`).
  - `Database Size`: Total MariaDB store size.

### 2.2 💡 Query & Mutate AST Compiler Engine
- **Purpose:** Visual, non-destructive SQL query builder and bulk product mutation execution engine.
- **AST Tree Compiler:** Recursively converts React JSON condition trees (`queryTree`) into sanitized MariaDB SQL statements.
- **Pure React JSX Sentence Translation:** Translates AST trees into human-readable live sentences without raw HTML string escaping bugs.
- **Mutation Preview:** Computes affected product counts before executing mutations.

### 2.3 🗄️ Database Tools & Historical Repositories
- **Purpose:** Single-click database table backups, compression, and drift comparison.
- **Supported Dump Engines:** Multi-table SQL streaming dumps with gzip compression (`.sql.gz`).
- **Checksum Drift Engine:** Computes MariaDB table checksums and line-by-line diffs to detect data drift.
- **Unified Repository Styling:** Rounded `bg-pm-card` container cards, `bg-pm-input/20` header fills, compact `text-[11px] font-mono` row density, and 3-tier action button groups (`.pm-btn-neutral` & `.pm-btn-danger-outline`).

### 2.4 📁 Filesystem Backups Repository
- **Purpose:** Full directory archives (`img/`, `modules/`, `override/`, `download/`, `themes/`, `config/`).
- **Archive Format:** Streamed `.tar.gz` archives with `.pinned` sidecar lock files preventing accidental cleanup sweeps.
- **Cloud Backup:** Direct chunked upload to Google Drive Cloud storage with OAuth callback integration.

### 2.5 🕒 Mutation History Ledger & MariaDB SQL Reconstruction Engine
- **Purpose:** Time-series mutation transaction ledger stored in SQLite (`mass_utility_dashboard/data/pm_cloud_backups.db`).
- **MariaDB SQL Reconstruction Engine:** Client-side AST reconstruction utility (`sqlReconstructor.ts`) dynamically generating executable MariaDB `UPDATE` queries and projected rollback SQL statements from raw JSON AST snapshots.
- **Rollback Engine:** Single-click Gzip snapshot revert engine restoring exact pre-mutation database state with full row diff tracing.

### 2.6 🏢 Super-Admin B2B License Pool & Capability Matrix Engine
- **Purpose:** Multi-tenant licensing server managing company pools (`pm_companies`), team assignments (`pm_users`), domain bindings (`store_url`), and subscription tier capability matrices (`basic`, `pro`, `enterprise`).
- **B2B Key Retention Safeguard:** Automatically unbinds employee license keys back into the company's available pool when team members are transferred or updated.

### 2.7 🧪 Standalone Public Demo Mode Sandbox (`/v2/index.html`)
- **Purpose:** Air-gapped interactive demonstration mode for public web deployments.
- **Routing & Execution:** Auto-detects `/v2/` URL paths, bypasses PrestaShop session checks via PHP Gateway `$isDemoRequest`, and dispatches all operations in 100% browser JS memory (`FetchService.ts` & `AdminFetchAdapter.ts`). Zero HTTP requests touch PHP scripts or host SQL databases.

---

## 3. Data Schemas & State Management

### 3.1 Local SQLite Master State DB (`mass_utility_dashboard/data/pm_cloud_backups.db`)
```sql
CREATE TABLE IF NOT EXISTS mass_update_log (
    id_mass_update_log INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    state VARCHAR(24) NOT NULL,
    affected_count INT DEFAULT 0,
    payload TEXT NOT NULL,
    revert_payload TEXT DEFAULT NULL,
    errors TEXT DEFAULT NULL,
    date_add DATETIME NOT NULL,
    date_upd DATETIME NOT NULL
);
```

### 3.2 PrestaShop MariaDB Core Tables (`ps_`)
- `ps_product`: Core product records (`id_product`, `reference`, `price`, `active`).
- `ps_product_shop`: Multi-store product pricing & active statuses.
- `ps_product_lang`: Multilingual product names & descriptions.
- `ps_category` / `ps_category_lang`: Store catalog hierarchy.
- `ps_stock_available`: Real-time stock quantities.

---

## 4. API Contract & Payload Specifications

All cross-layer requests between Frontend SPA and Backend API communicate via sanitized JSON REST contracts over 95 mapped routes (`.bench/docs/dashboard/architecture/07_api_route_matrix.md`).

### Standard Health Check Payload (`/api/ping`):
```json
{
  "status": "success",
  "data": {
    "cpu_model": "AMD EPYC 7763 64-Core Processor",
    "allocated_cpu_speed": "25.6 GHz (8 Cores @ 3.2 GHz)",
    "virtual_cores": "8 Cores (LVE Quota)",
    "memory_limit": "512M",
    "database_size": "42.5 MB"
  }
}
```

---

## 5. Security, Isolation & Testing Guardrails

1. **Local Sandbox Isolation:**
   - Local dev runner script ([cli_sandbox_runner.py](file:///d:/Project%20Mass/.bench/scripts/cli_sandbox_runner.py)) binds strictly to loopback IP `127.0.0.1` (ports 8000 & 5173).
   - Local testing uses PrestaShop PHP stubs ([prestashop_stubs.php](file:///d:/Project%20Mass/.bench/sandbox/prestashop_stubs.php)) and DDL schema ([prestashop_schema.sql](file:///d:/Project%20Mass/.bench/sandbox/prestashop_schema.sql)).
2. **Automated Static Audit & Pre-Commit Pipeline:**
   - `cli_commit.py` executes automated validation hooks before every commit (PHP `php -l`, JS validation, AST zero-copy re-indexing, security audit, API contract guard).
3. **Commit Message Sanitizer:**
   - `cli_commit.py` automatically ingests exact plan contents into commit messages and strips internal runner meta-steps.
