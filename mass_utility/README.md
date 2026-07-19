# ⚡ Mass Utility Bridge - Module Engine Manual

This directory houses the native PrestaShop module acting as the **decoupled transactional API gateway** and **security telemetry pipeline** for Project Mass.

---

## 🛠️ System Directory Structure

*   `mass_utility.php`: Main PrestaShop module controller handling configuration page, license activation checks, and SQLite synchronization.
*   `api.php`: Unauthenticated central gateway executing commands received from the merchant dashboard.
*   `src/`:
    *   `Compiler/QueryTranslationEngine.php`: Sanitizes, translates, and whites-lists raw input operations into safe structured MySQL transactions.
    *   `Governor/SafetyGovernor.php`: Monitors active server load metrics (CPU, RAM) to prevent heavy updates during high traffic.
*   `upgrade/`: Dynamic migration tables initialization and upgrade logic hooks.

---

## 🔒 Security Gateways & Whitelisting

### 1. Header Validation
All requests hitting `api.php` must carry:
- `X-Bridge-Token`: Matches the locally stored PrestaShop configuration value (`PM_SECURE_TOKEN`).
- `X-Bridge-Version`: Must assert exact compatibility with schema version `1.0.0`.

### 2. Safety Governor Thresholds
The Safety Governor enforces automatic blockades if:
- Server average CPU usage goes above `80%`.
- PHP script execution time approaches maximum limit thresholds.

### 3. Query Whitelisting
The `QueryTranslationEngine` checks AST queries before execution:
- Restricts actions solely to `UPDATE` and `DELETE`.
- Prevents structural alterations (`ALTER`, `DROP`, `CREATE`).
- Matches columns and tables against a hardcoded system safe-list to prevent malicious code injection.

---

## 🔌 API Gateway Endpoints (`api.php`)

| Endpoint Action | HTTP Method | Expected Payload | Response Data | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `ping` | `POST` | None | `{"status":"alive","_DB_PREFIX_":"ps_"}` | Latency and prefix diagnostics. |
| `execute_query_ast` | `POST` | Encrypted AST Query JSON | `{"success":true,"affected_count":12}` | Processes translated database modifications. |
| `stream_job_progress`| `GET` | `job_id` | Server-Sent Event (SSE) stream | Emits real-time progress percentages. |

---

## 🔄 SQLite Sync Connection
When active licenses are activated, the module writes the details into the shared database:
- **Location**: `mass_utility_dashboard/data/pm_cloud_backups.db`
- **Stored Keys**: `PM_LICENSE_KEY`, `PM_BRIDGE_TOKEN`, `PM_LICENSE_TOKEN`, `PM_LICENSE_SIGNATURE`.
