# 🗃️ Mass Utility - Production Engineering Manual

Welcome to the **Mass Utility Framework**, an enterprise-grade, zero-trust decoupled administration suite designed for PrestaShop. 

This framework separates your **Presentation/SaaS Dashboard UI** from your **PrestaShop Active Core** using a secure, transactional HTTP Bridge API. By segregating complex operations (like AST database operations, chunked backups, search index sweeps, and local transaction log rollbacks) from the main database execution stream, Mass Utility preserves database speed while offering maximum operational security.

---

## 📊 1. System Architecture & Data Flows

Mass Utility is structured as a decoupled monorepo containing two key components: the **Native PrestaShop Module** (acting as the transactional engine and API endpoint) and the **SaaS Dashboard** (acting as the administrative portal).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Store Administrator
    participant Dashboard as Standalone SaaS Dashboard
    participant Bridge as PrestaShop Module Bridge (api.php)
    database MySQL as Shop Database (MariaDB)
    database SQLite as Local Sandbox DB (mass_utility.sqlite)

    Admin->>Dashboard: Input SQL Mutation in Query Wizard
    Note over Dashboard: FetchEngine compiles query to JSON AST
    Dashboard->>Bridge: POST /api.php?action=execute_query_ast (with X-Bridge-Token)
    Note over Bridge: SafetyGovernor checks System Load & Live Status
    Note over Bridge: QueryTranslationEngine validates columns vs Schema Whitelist
    alt Safety Checks Fail
        Bridge-->>Dashboard: Return 403 Forbidden (JSON Error)
        Dashboard-->>Admin: Render safety alert warning on screen
    else Safety Checks Pass
        Bridge->>MySQL: Begin Transaction & Read Row State
        MySQL-->>Bridge: Return Original Row State
        Bridge->>SQLite: Write Row Snapshot to mutation_history
        Bridge->>MySQL: Execute Safe Translated Mutation
        Bridge->>MySQL: Commit Transaction
        MySQL-->>Bridge: Return Mutation Success
        Bridge-->>Dashboard: Return 200 OK (JSON Metadata & Row Count)
        Dashboard-->>Admin: Hydrate transaction tables & success notification
    end
```

### Monorepo Components
*   **`mass_utility/` (PrestaShop Module)**: Houses the local Bridge API (`api.php`), the `QueryTranslationEngine` compiler, database backup chunk engines, Google Drive API upload clients, and safety thresholds.
*   **`mass_utility_dashboard/` (Standalone SaaS App)**: A lightweight PHP router (`public/index.php`) and a single-page administration app powered by modern CSS variables and modular ES6 JavaScript controllers.
*   **`.bench/`**: Local test suite sandbox, schema verification configs, and auto-generated system documentation maps.
*   **`.orchestra/`**: Local git pre-commit pipeline hooks, syntax validators, and workspace inspectors.

---

## 🔒 2. Security & Authentication Matrix

To guarantee that no external actors can execute arbitrary database edits or access files, the Bridge API enforces a zero-trust verification boundary:

### 2.1 Header Authentication
Every request transmitted to `mass_utility/api.php` must carry the following headers:
*   `X-Bridge-Token`: Contains the secure authorization hash. This must match the `PM_SECURE_TOKEN` configuration key stored in the PrestaShop database.
*   `X-Bridge-Version`: Tells the Bridge what API schema version is being requested (default: `1.0.1`).

### 2.2 One-Time Token (OTT) Redirect Flow
When the administrator clicks the **Manage Suite** button inside the PrestaShop Admin Panel, the module generates a secure redirect URL:
1.  The module compiles an temporary token stored in the database with a **60-second Time-To-Live (TTL)**.
2.  The admin is redirected to `https://dashboard-url.com/index.php?ott=<token>`.
3.  The SaaS Router validates the OTT against the Bridge API. If valid, it hydrates a PHP session and issues a local JWT cookie to the administrator's browser.

### 2.3 IP Restriction Gateway
By default, the Bridge API restricts incoming traffic to:
1.  The server's local loopback IP (`127.0.0.1` / `::1`).
2.  Whitelisted administrator IPs configured under **Settings**.
3.  The IP address matching the resolved domain of the Standalone SaaS Dashboard.

---

## 🛠️ 3. Installation & Setup Guide

### 3.1 PrestaShop Module Installation (`mass_utility`)
1.  Compress the `mass_utility/` folder into a standard zip archive: `mass_utility.zip`.
2.  Log into your PrestaShop Admin Backoffice.
3.  Navigate to **Modules** $\rightarrow$ **Module Manager** and click **Upload a Module**.
4.  Upload `mass_utility.zip`.
5.  Upon successful installation, click **Configure** to generate your secure token and view your Bridge API URL (e.g. `https://yourshop.com/modules/mass_utility/api.php`).

### 3.2 SaaS Dashboard Installation (`mass_utility_dashboard`)
1.  Upload the contents of the `mass_utility_dashboard/` folder to a standalone subdomain folder (e.g., `/home/username/public_html/mass_utility_dashboard`).
2.  Verify your server has the **SQLite3 extension** enabled for PHP.
3.  Ensure the `.sandbox/` directory inside `mass_utility_dashboard/` has **write permissions (0755 or 0775)** enabled, allowing the application to initialize the SQLite configuration database.
4.  Access the dashboard domain in your browser. You will be automatically routed to the **Setup Wizard**.
5.  Input your PrestaShop Bridge URL and paste the `PM_SECURE_TOKEN` generated by your PrestaShop module to establish the handshake connection.

---

## 🔌 4. API Gateway Reference (api.php & index.php)

The Bridge API routes all operations through the core controller endpoints. The table below outlines the core API actions:

| HTTP Method | Action | Input Parameters | Success Response (JSON) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `get_server_status` | None | `{"success":true,"load":[0.1,0.05,0.01],"memory":"45%"}` | Returns CPU averages, memory allocations, and disk space usage. |
| `POST` | `execute_query_ast` | `{"ast": {...}}` | `{"success":true,"rows_affected":12,"execution_time_ms":42}` | Compiles JSON AST, executes database write, and registers rollback state. |
| `POST` | `get_mutation_history` | `{"page":1,"limit":20}` | `{"success":true,"items":[{"id":1,"query":"...","timestamp":123}]}` | Fetches transactional log records from the local SQLite engine. |
| `POST` | `clear_mutation_history`| None | `{"success":true,"message":"Log cleared"}` | Wipes database transaction mutation tables. |
| `POST` | `profile_database` | None | `{"success":true,"fragmented_tables":[]}` | Profiles table optimization and index stats. |
| `POST` | `backup_table_chunk` | `{"table":"ps_product","offset":0}` | `{"success":true,"offset":5000,"done":false,"file":"..."}` | Dumps table offset block to compressed local Gzip file. |
| `POST` | `upload_to_gdrive` | `{"filename":"..."}` | `{"success":true,"file_id":"gdrive_abc123"}` | Triggers cloud sync of a local backup file to Google Drive. |
| `POST` | `disconnect_gdrive` | None | `{"success":true,"message":"Drive unlinked"}` | Destroys local Google Drive OAuth credentials. |

---

## ⚙️ 5. Subsystem Architecture Deep-Dives

### 5.1 The Safety Governor (`GovernorEngine`)
The Safety Governor acts as the gatekeeper preventing destructive resource starvation or data loss:
*   **System Load Averages**: Prior to starting large chunked backups or sweeps, the governor evaluates `sys_getloadavg()`. If the 1-minute CPU load average exceeds `4.5` (or a custom threshold), the operation is halted, returning an HTTP 503 response.
*   **Shop Mode Sentinel**: If PrestaShop is currently in "Live" mode (allowing customers to complete checkouts), the governor blocks all destructive query mutations (such as table drops, alters, or global deletions) on transactional tables (like `ps_orders`, `ps_customer`). These actions require the shop to be toggled to "Maintenance Mode" first.
*   **Table Categorization Schema**:
    *   *System Critical*: `ps_orders`, `ps_customer`, `ps_configuration` (Writes require maintenance mode).
    *   *Safe Metadata*: `ps_product`, `ps_category`, `ps_attribute` (Writes allowed live).
    *   *Disposable logs*: `ps_guest`, `ps_connections`, `ps_cart` (Sweeps allowed live).

### 5.2 AST Translation & Rollback Compilation (`QueryTranslationEngine`)
The AST mutation builder translates abstract JSON representations of query statements back into safe, platform-native SQL execution blocks:
1.  **JSON AST Validation**: Ensures keys like `target_table`, `mutation_type`, `where_conditions`, and `update_values` conform to schema specifications.
2.  **Schema Whitelisting**: Resolves columns against the actual active MariaDB column definitions in the database. Any fields not explicitly matching are stripped, eliminating column-injection attack vectors.
3.  **Rollback Telemetry**: Prior to running an `UPDATE` or `DELETE` query, the engine issues a selective `SELECT` statement mapping the target rows. These are serialized into a JSON array and saved to `.sandbox/mass_utility.sqlite` under `mutation_history` alongside the counter-query template required to revert the rows.

### 5.3 Time-Resilient Table Backups (`TableBackupManager`)
To prevent PHP script limits (like `max_execution_time` timeouts) from interrupting database backups on large databases, backups are paginated in chunks:
*   **Chunked Pagination**: Tables are read in fixed offsets (e.g. 5,000 rows at a time).
*   **Gzip Stream Compression**: Output SQL insert rows are written directly into a `.sql.gz` stream.
*   **Google Drive Multipart Upload**: Files exceeding 5MB are split and uploaded to the Google Drive API in sequential chunks with progress logging. If a chunk fail occurs, the OAuth client retries the specific chunk rather than restarting the entire file upload.

---

## 💾 6. SQLite Database Schema Reference

The Standalone SaaS Dashboard maintains its operational state inside the ignored local database located at `mass_utility_dashboard/.sandbox/mass_utility.sqlite`.

### Table: `settings`
Tracks configuration states and active tokens:
```sql
CREATE TABLE settings (
    key_name TEXT PRIMARY KEY,
    value_content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `presets`
Stores reusable AST templates generated by the Query Wizard:
```sql
CREATE TABLE presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preset_name TEXT UNIQUE NOT NULL,
    description TEXT,
    ast_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: `mutation_history`
Tracks query actions and rollback snapshots:
```sql
CREATE TABLE mutation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_raw TEXT NOT NULL,
    table_target TEXT NOT NULL,
    rows_affected INTEGER NOT NULL,
    rollback_json TEXT NOT NULL,
    timestamp INTEGER NOT NULL
);
```

---

## 🔧 7. Troubleshooting & Operational Guide

### 7.1 Reclaiming Access After a Safety Lockout
If the CPU load is high or the shop state is misidentified, you can temporarily bypass the Safety Governor:
1.  Log into your server via SSH.
2.  Navigate to the `mass_utility/` folder.
3.  Create an empty file named `.bypass_governor` in the module directory:
    `touch .bypass_governor`
4.  This bypasses the Safety Governor checks for 15 minutes before the sentinel auto-removes the file.

### 7.2 Recovering a Interrupted Gzip Restore
If a database restoration stops mid-process:
1.  Check `mass_utility/logs/backup.log` to identify the last successfully imported chunk index and line offset.
2.  Ensure your `post_max_size` and `upload_max_filesize` in `php.ini` are set to at least `128M`.
3.  Restart the restore process from the specific chunk index offset using the dashboard recovery panel.
