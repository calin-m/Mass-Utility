# Mass Utility — Master Product Technical Specification (SPEC.md)

> **Version:** 2.0.0-RC2  
> **Target Environment:** PrestaShop 8.1.4 (PHP 8.1+ / MariaDB 10.4+) & CloudLinux LVE Cgroups  
> **Architecture:** Decoupled Headless SaaS Engine (V2 React 18 SPA + Standalone PHP Proxy + PrestaShop Bridge API)

---

## 1. System Core Overview & Objectives

Mass Utility is an enterprise-grade database manipulation, file backup, AST query compilation, and maintenance suite built for PrestaShop 8.1.4 merchant stores.

### Key Architectural Pillars:
1. **Decoupled Dual UI Architecture:**
   - **V1 Presentation:** Smarty TPL templates inside PrestaShop Admin BackOffice (`mass_utility_admin/`).
   - **V2 Presentation:** Standalone React 18 SPA (`mass_utility_dashboard/frontend/`) powered by Vite, Tailwind CSS tokens, and Lucide SVG iconography.
2. **Headless API Bridge (`mass_utility/api.php`):**
   - Secure JSON REST API gateway connecting the standalone Dashboard Proxy to PrestaShop `Db::getInstance()`.
3. **Safety Governor & Resource Protection:**
   - Real-time Linux Cgroup LVE quota detection (`quota / period`), hypervisor CPU frequency calculation (`GHz`), and memory safety floors (`128M`).

---

## 2. Core Subsystems Specification

### 2.1 🛡️ Safety Governor Subsystem
- **Purpose:** Telemetry monitoring, cgroup quota inspection, and system health protection.
- **Metrics Tracked:**
  - `Processor Model`: Hypervisor physical CPU model (`AMD EPYC 7402`).
  - `Allocated CPU Capacity`: Account aggregate compute allocation (`9.6 GHz (3 Cores @ 3.2 GHz)`).
  - `Virtual Core Limit`: CloudLinux LVE cgroup quota limit (`3 Cores`).
  - `Memory Limit`: PHP `memory_limit` floor.
  - `Database Size`: Total MariaDB store size.

### 2.2 💡 Query & Mutate AST Compiler Engine
- **Purpose:** Visual, non-destructive SQL query builder and bulk product mutation execution engine.
- **AST Tree Compiler:** Recursively converts React JSON condition trees (`queryTree`) into sanitized MariaDB SQL statements.
- **Pure React JSX Sentence Translation:** Translates AST trees into human-readable live sentences without raw HTML string escaping bugs.
- **Mutation Preview:** Computes affected product counts before executing mutations.

### 2.3 🗄️ Database Tools & Historical Repositories
- **Purpose:** Single-click database table backups, compression, and drift comparison.
- **Supported Dump Engines:** Multi-table SQL streaming dumps with gzip compression (`.sql.gz`).
- **Unified Repository Styling:** Rounded `bg-pm-card` container cards, `bg-pm-input/20` header fills, compact `text-[11px] font-mono` row density, and 3-tier action button groups (`.pm-btn-neutral` & `.pm-btn-danger-outline`).

### 2.4 📁 Filesystem Backups Repository
- **Purpose:** Full directory archives (`img/`, `modules/`, `override/`, `download/`, `themes/`, `config/`).
- **Archive Format:** Streamed `.tar.gz` archives with `.pinned` sidecar lock files preventing accidental cleanup sweeps.
- **Cloud Backup:** Direct chunked upload to Google Drive Cloud storage with OAuth callback integration.

### 2.5 🕒 Mutation History Ledger & Rollback Subsystem
- **Purpose:** Time-series mutation transaction ledger stored in SQLite (`mass_utility_dashboard/backups/`).
- **Rollback Engine:** Single-click Gzip snapshot revert engine restoring exact pre-mutation database state with full row diff tracing.

### 2.6 ⚙️ Settings & License Management
- **Purpose:** Admin license key toggle masking (Lucide Eye/Off SVGs), cron schedule token configuration, and auto-pilot sweeper rules.

### 2.7 📜 Live Log Stream Console
- **Purpose:** Polled real-time telemetry log streaming (`telemetry@mass-utility.log`) with auto-scroll, log search filter, and log file clearing.

---

## 3. Data Schemas & State Management

### 3.1 Local SQLite WAL State DB (`mass_utility_dashboard/backups/history.sqlite`)
```sql
CREATE TABLE IF NOT EXISTS history_ledger (
    job_id VARCHAR(64) PRIMARY KEY,
    date DATETIME NOT NULL,
    actions TEXT NOT NULL,
    affected_count INT NOT NULL,
    state VARCHAR(32) NOT NULL,
    undo_snapshot LONGBLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    "cpu_model": "AMD EPYC 7402 24-Core Processor",
    "allocated_cpu_speed": "9.6 GHz (3 Cores @ 3.2 GHz)",
    "virtual_cores": "3 Cores (LVE Quota)",
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
2. **12-Stage Pre-Commit Build Gate:**
   - `cli_commit.py` executes 12 automated validation hooks before every commit (PHP `php -l`, JS validation, `sandbox_preflight`, Vite build, security audit, API contract guard).
3. **Commit Message Sanitizer:**
   - `cli_commit.py` automatically strips internal runner meta-steps (`cli_commit.py`, `git push`, Orchestra steps) from Git commit descriptions.
