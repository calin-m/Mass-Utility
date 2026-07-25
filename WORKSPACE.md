# Antigravity Workspace Rules: Architecture-First Framework

## Target Environment & Performance Guardrails
- **Core Platform:** PrestaShop 8.1.4 (Namespace: `ProjectMass`)
- **Runtime Engine:** PHP 8.1.34 (Adhere to strict typings and language restrictions)
- **Infrastructure context:** SiteBunker Shared Hosting (SSD Business Pack)
  - Runs under CloudLinux LVE Cgroup resource clamps (3 virtual cores CPU limit fallback).
  - Restricted MariaDB query connection structures and query thread ceilings.
  - Highly sensitive to memory footprint limits (mandatory zero-RAM file streaming for backup and restorations).
  - Adaptive processing loops must strictly monitor CPU averages to avoid CloudLinux Cgroup 503 limits or gateway timeouts.

## 🎨 User Interface Architecture Policy (V2 React SPA + PrestaShop Launcher)
- **V2 Standalone React SaaS UI (`mass_utility_dashboard/frontend/src/`):** Primary production UI. React 18 SPA built with Vite, TypeScript, and Vanilla CSS tokens (`var(--pm-*)`), compiled to `public/v2/`.
- **PrestaShop Back-Office Launcher (`mass_utility_dashboard/views/templates/admin/configure.tpl`):** Native PrestaShop Back-Office launcher card providing 1-click single sign-on (AES-256 OTT) launch link to the V2 Standalone Dashboard.
- **Active Refactor Scope:** All active styling, telemetry visualizers, AST query tools, and UI component enhancements target the **V2 React SPA**.


## 📁 OPIS: Workspace Directory Manifest
This `WORKSPACE.md` file serves purely as the overarching **Agent Workflow Constitution** (How to commit, sync docs, run tests). 
For specific PHP/JS coding rules, use the following directory manifest to dispatch yourself to the correct architectural dictionary:
### Core Documentation
*   `GEMINI.md`: Primary entry point referencing WORKSPACE.md for workspace rules, directory manifests, and Zero-Trust architecture directives.
*   `.ai_plan.md`: The active, ephemeral pre-flight plan for the current execution.
*   `.bench/docs/roadmap.md`: The persistent queue for future features and tasks. Always read this file to understand the long-term context of the project.

### 📱 SaaS Dashboard Docs (`.bench/docs/dashboard/`)
*   `.bench/docs/dashboard/architecture/00_auto_generated_oop_map.md`: Mathematically accurate mapping of SaaS OOP classes, methods, and interfaces.
*   `.bench/docs/dashboard/architecture/01_backend_pipeline.md`: Details `TransactionProcessor`, `ResourceMonitor`, database diff engines, and SaaS WAL SQLite state-management logic.
*   `.bench/docs/dashboard/architecture/02_interconnectivity_map.md`: End-to-end dependency traces linking UI grids to Bridge hooks.
*   `.bench/docs/dashboard/architecture/07_engine_capabilities_map.md`: The `TransactionProcessor` and AST payload execution capabilities.
*   `.bench/docs/dashboard/architecture/05_database_schema_map.md`: Auto-generated SQLite Database Schema & ER-Diagram map.
*   `.bench/docs/dashboard/frontend/01_ui_component_map.md`: Standalone dashboard GUI component maps, styling tokens, and view layouts.
*   `.bench/docs/dashboard/frontend/02_dom_and_modals_map.md`: Raw HTML view DOM mappings and polymorphic modal systems.
*   `.bench/docs/dashboard/frontend/00_auto_generated_frontend_map.md`: Auto-generated mapping of all JS modules and CSS stylesheets.
*   `.bench/docs/dashboard/frontend/03_javascript_engine_map.md`: HTTP fetch engine calls to the SaaS Router and isolated UI modules.
*   `.bench/docs/dashboard/frontend/04_css_tokens_map.md`: Pure Vanilla CSS variables, glassmorphic layout styles, and animations.
*   `.bench/docs/dashboard/frontend/05_v2_react_component_map.md`: Auto-generated V2 React SPA TSX Component AST Hierarchy map.
*   `.bench/docs/audits/active_audit.md`: Active audit log tracking open issues and technical debt.
*   `.bench/docs/audits/severity_index.md`: Severity level descriptions and SLAs for open findings.
*   `.bench/docs/audits/security_remediation_report.md`: A comprehensive report evaluating every active security bypass comment in the codebase.

### 🔌 PrestaShop Bridge Module Docs (`.bench/docs/bridge/`)
*   `.bench/docs/bridge/architecture/00_auto_generated_oop_map.md`: Mathematically accurate mapping of Bridge OOP classes and methods.
*   `.bench/docs/bridge/architecture/01_backend_pipeline.md`: Documents the headless API gateway (`api.php`), webhook post-save hooks, and execution receivers.
*   `.bench/docs/bridge/architecture/02_integration_matrix.md`: Maps the REST API endpoints (`/api/ping`, `/api/execute-chunk`) between Bridge and SaaS.
*   `.bench/docs/bridge/architecture/08_settings_contract_map.md`: Documenting `PM_SAAS_API_KEY` configuration logic inside the PrestaShop DB.

### 🔑 Super Admin Portal Docs (`.bench/docs/admin/`)
*   `.bench/docs/admin/architecture/00_auto_generated_oop_map.md`: Mathematically accurate mapping of Super-Admin OOP controllers, repositories, and licensing services.
*   `.bench/docs/admin/architecture/06_i18n_localization_map.md`: Componentized multi-language localization subsystem, locale dictionaries (`en`, `ro`, `de`, `fr`, `es`), `TranslationSchema` typing, and fallback inheritance rules.

### 🛡️ Mandatory Reverse-Dependency Documentation Sync Map
When modifying physical code files, you are **legally bound** to verify and sync the following architectural dictionaries to prevent documentation drift:
*   `mass_utility/api.php` -> REQUIRED: `.bench/docs/bridge/architecture/01_backend_pipeline.md`, `.bench/docs/bridge/architecture/00_auto_generated_oop_map.md`.
*   `mass_utility_dashboard/src/*` -> REQUIRED: `.bench/docs/dashboard/architecture/01_backend_pipeline.md`, `.bench/docs/dashboard/architecture/00_auto_generated_oop_map.md`.
*   `mass_utility_admin/src/*` -> REQUIRED: `.bench/docs/admin/architecture/00_auto_generated_oop_map.md`.
*   `mass_utility_admin/frontend/src/i18n/*` -> REQUIRED: `.bench/docs/admin/architecture/06_i18n_localization_map.md`.
*   `mass_utility_admin/frontend/src/*` -> REQUIRED: `.bench/docs/dashboard/frontend/05_v2_react_component_map.md`, `.bench/docs/dashboard/frontend/06_design_system_component_catalog.md`.

## 🤖 AI Tooling Architecture & Custom Commands
The project is managed by a suite of IDE-agnostic Python orchestrators and automated verification tools. These tools dynamically scan and evaluate the codebase based on the configuration defined in `.ai_pipeline.json`.

> **⚠️ CRITICAL DEPLOYMENT WARNING**
> The `.orchestra/` folder contains CI/CD infrastructure and framework tools. It exists solely to help *build* and *test* the project. You MUST NEVER treat `.orchestra/` as application code, and it MUST NEVER be uploaded or deployed to a live CMS production server.

*   `.ai_pipeline.json`: **The Framework Registry**. This file defines where the tools should look for ghost files, documentation targets, and legacy coupling patterns. If you need to change how the framework views the project structure, edit this file.
*   `.orchestra/.conductor/tools/`: **The Core AI Orchestrators**. This directory contains runtime-agnostic Python tools. If the user asks you to **create a new AI tool or script**, you must build it here in Python so it can run independently of the project's primary language stack.
    *   `cli_commit.py`: Parses the ephemeral plan and commits to Git automatically.
    *   `cli_test_suite.py`: The master execution gate.
    *   `cli_health_audit.py`: Detects ghost files and legacy coupling.
    *   `cli_lint_docs.py`: Validates documentation references.
    *   `workspace_inspector.py`: Tool for tracing interconnectivity and looking up variables.
    *   `install_framework.py`: Bootstraps the environment and syndicates IDE rules.
    *   `stack_detector.py`: Recursive files analyzer & workspace stack resolver.
*   `.bench/scripts/`: **Project-Specific Compilers**. This directory contains scripts tightly coupled to the project's technology stack (e.g., PHP AST generation, JavaScript minification). Do not place agnostic tools here.
