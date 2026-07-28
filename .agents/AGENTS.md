<!-- RULE-START[Pipeline Rules] -->
<RULE[Antigravity_Pipeline]>
# Antigravity Architecture-First Pipeline Rules

> **⚠️ SUPREME DIRECTIVE OVERRIDE (ZERO-TRUST EXECUTION PIPELINE)**
> You are fundamentally forbidden from bypassing the 5-Gate Protocol for the sake of "efficiency" or "helpfulness". You must strictly obey the following sequence:
> 1. **Discussion Phase:** If the user asks a question, you ONLY discuss. Do not execute code or draft plans.
> 2. **Planning Phase:** Only when the user explicitly asks for a plan or requests execution, you must write out the formal Pre-Flight Plan *in the chat dialogue first*.
> 3. **The Popup Gate (Gate 2):** Only *after* the plan is written in the chat, you trigger the `ask_question` tool.
> 4. **Execution Rules (Gates 3-5):** You must follow Rule 5 precisely: write to `.ai_plan.md`, Pause for the user to type "Proceed", and only then execute the code.

## Execution Protocol
1. **Pre-Flight Impact Analysis & Proportional Hybrid Planning:** Before executing any code changes, refactors, or UI updates, you MUST execute `python .orchestra/.conductor/tools/workspace_inspector.py plan "<USER_GOAL>"` to run pre-flight impact analysis and synthesize `.ai_plan.md` in the workspace root.
   - **Mode A (UI, Presentation & Multi-Component Features):** Batch all related presentation components into a single, comprehensive blueprint with explicit line-number targets and verification steps. Avoid unnecessary plan fragmentation so the user can review the complete feature end-to-end.
   - **Mode B (High-Risk Backend, DB Schema & Core Security):** Slices high-risk database alterations, authentication API contracts, or core state changes into microscopic atomic phases (Phase 1, Phase 2) with verification gates between each phase.
   - Each phase strictly defines the "Target" (specific file and line numbers) and the "Action" (DOM/JS/PHP modifications).
2. **The Zero-Draft Atomic Pipeline:**
   - **No PENDING states:** Ensure your logic is complete.
   - **Single Atomic Operation:** When a task or phase is complete, update all `.md` dictionaries, and then immediately execute `python .orchestra/.conductor/tools/cli_commit.py`. `cli_commit.py` automatically handles staging (`git add .`), running pre-commit static audits, compiling frontend assets (`npm run build`), committing, and auto-deploying. You do not need to execute a manual `git push` command after invoking `cli_commit.py`.
3. **Smart Ephemeral Commits:**
   - The `cli_commit.py` script will automatically ingest the exact contents of `.ai_plan.md` into the Git Commit message.
   - Once the commit succeeds, `cli_commit.py` will delete `.ai_plan.md`.
4. **Smart Interconnectivity Tracing & Sequential Investigation:**
   - **Primary Token-Saving Scanner:** You MUST use the custom Python script `.orchestra/.conductor/tools/workspace_inspector.py` as your primary tool to mathematically map architecture, symbols, and dependencies.
   - **Questions & Diagnostics Mandate:** Whenever the user asks any question about how code works, module layout, or system behaviors, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py trace "<keyword>"` (or `lookup "<symbol>"` / `matrix`) to ground your response in live AST symbol maps and generated reports.
   - **Modification & Feature Request Mandate:** Before drafting any plan or making code changes, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py plan "<USER_GOAL>"`, which automatically executes the complete multi-tool chain (`trace`, `frontend_map`, `route_map`, `design_map`, `advisories`) and synthesizes the 360° Architectural Impact Report.
   - **Strict Sequential Investigation Protocol:** You MUST run `workspace_inspector.py trace` (or `plan`) FIRST. ONLY if `workspace_inspector.py` outputs `[INSPECTOR_FALLBACK_RECOMMENDED]` (e.g., when querying UI/React components, CSS tokens, or literal text strings where no AST symbol is found), are you authorized to use native `grep_search`, restricted strictly by target file globs (`Includes: ["*.tsx", "*.ts"]`) to prevent API context bloat.
   - **Dual Plan Synchronization Mandate:** Whenever drafting a plan or presenting feature options, you MUST write to `.ai_plan.md` on disk AND simultaneously generate/update the interactive `implementation_plan.md` artifact in the brain folder with `request_feedback=true` and `user_facing=true`.
   - **Post-Execution Zero-Copy AST Re-Index:** After any code modification or component refactor, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py map` to refresh `symbol_map.json`, `00_auto_generated_oop_map.md`, and `00_auto_generated_frontend_map.md`.
   - **Scope Pre-Flight Inspection:** Before editing lines within a component or view file, you MUST inspect lines 1–60 (or the top of the file) to verify all imported symbols, prop interfaces, and `useState`/`useEffect` hook variables in scope.
5. **Unified Tool Registry & Gitignore Guideline:**
    - Whenever you create a new JIT tool, compiler, or script inside `.bench/scripts/`, you MUST register it using:
      `python .orchestra/.conductor/tools/workspace_inspector.py register <name> "<command>" "<description>"`
    - If dependencies, configuration environment variables, or secrets need validation, run `python .orchestra/.conductor/tools/cli_doctor.py` (or the `"doctor"` script) to verify project environment health.
    - If you introduce a new core framework tool inside `.orchestra/.conductor/tools/`, you MUST register it in the `tools` array of `install_framework.py` and list it in the file structure tree in `.orchestra/README.md`.
    - Any directories or file extensions generated by tools (e.g. `__pycache__/`, `*.pyc`, custom databases) must be added to the `ignore_lines` list inside `install_framework.py` to ensure `.gitignore` synchronization.
6. **Workspace Paths & Renaming Rules:**
    - If the user requests to rename, move, or re-target the project's source or documentation folders, you MUST:
      1. Physically move/rename the directory.
      2. Update the `directories` mapping inside `.ai_pipeline.json`.
      3. Run the installer/doctor script `python .orchestra/.conductor/tools/install_framework.py` to re-syndicate the rules across all IDE configuration files.
7. **JIT Failure Telemetry (Self-Healing Loop):**
    - If a validation run fails, check `.bench/agents/custom_rules/_failures.md` for compiler and gate error details. You MUST immediately adapt your implementation plan to resolve the specific compilation/linters errors logged in that file.
</RULE[Antigravity_Pipeline]>
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks, read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using: `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->

<!-- RULE-START[Workspace Constitution] -->
# Workspace Constitution & Architecture Directives

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
- **Active Refactor Scope:** All active styling, telemetry visualizers, AST query tools, and UI component enhancements target the **V2 React SPA**. Never mix or cross-import components between Admin (`mass_utility_admin/frontend/`) and Dashboard (`mass_utility_dashboard/frontend/`).

## 📁 OPIS: Workspace Directory Manifest
This serves as the overarching **Agent Workflow Constitution**:
* `GEMINI.md`: Primary entry point referencing WORKSPACE.md for workspace rules, directory manifests, and Zero-Trust architecture directives.
* `.ai_plan.md`: The active, ephemeral pre-flight plan for the current execution.
* `.bench/docs/roadmap.md`: The persistent queue for future features and tasks. Always read this file to understand long-term context.
* `.bench/docs/dashboard/`: Architecture diagrams, OOP maps, database schema maps, and CSS token maps for the SaaS Dashboard.
* `.bench/docs/bridge/`: API pipeline maps, integration matrices, and setting contracts for the PrestaShop Bridge Module.
* `.bench/docs/admin/`: OOP maps and i18n localization maps for the Super Admin Portal.
<!-- RULE-END[Workspace Constitution] -->

<!-- RULE-START[Enterprise Standards] -->
<RULE[Antigravity_Standards]>
# Antigravity Enterprise Engineering Standards

## 1. Context Alignment & Pre-Flight Authority
Before executing any file modifications, writing code, or making plans, you MUST align your context with the active project state. Never assume state from conversational memory. Write your formal plan to `.ai_plan.md`.

## 2. Mandatory Blueprint Updates (Contextual Reflective Sync)
Before declaring any code task or feature phase complete, you are strictly required to automatically sync all architectural files and dictionary maps on disk to reflect the new state of the project.
- Append a detailed technical transaction block to `.ai_plan.md` detailing explicit mutations.
- **Universal Scanner Rule (No Manual Markdown):** Use inline annotations in your code (`// @Arch[Tag]`, `// @Description: X`, `// @Calls: X`). The Universal Scanner in the pre-commit hook will automatically generate the dictionaries.

## 3. SOLID & Clean Architecture Principles
- **Single Responsibility Principle (SRP):** Classes and controllers must maintain single responsibility boundaries. Enforce strict line count thresholds: Controllers must remain under 250 LOC; Service classes must remain under 500 LOC.
- **Interface Segregation:** Define explicit TypeScript interfaces and backend schema contracts for all state payloads to prevent untyped `any` or ambiguous dictionary drift.
- **Decoupled Architecture:** Maintain strict separation between backend business logic service engines and decoupled presentation UI components.

## 4. OWASP Top 10 Security Guardrails
- **SQL Injection Prevention:** Enforce parameterized queries & prepared statements across all database engines. Direct concatenation of user variables into SQL strings is strictly forbidden.
- **XSS & Injection Safeguards:** Do not pass un-sanitized user inputs into dangerous sinks (`innerHTML`, raw `eval()`, or unescaped `dangerouslySetInnerHTML`). Use strict HTML entity escaping.
- **CSRF & Credential Hygiene:** Validate CSRF tokens on state-mutating endpoints and stash secrets strictly in `.env`.

## 5. 12-Factor App & Performance Guardrails
- **Stateless Execution & Zero-RAM Streaming:** Large file I/O operations (backups, restores, streaming exports) must use chunked zero-RAM memory streams to prevent memory exhaustion under resource clamps.
- **Query Optimization:** Prevent N+1 query patterns in processing loops by pre-fetching relations or using batch payload lookups.
- **Graceful Error Shields:** Wrap controller endpoints and worker loops in strict `try/catch` error boundaries to log stack traces silently and return sanitized JSON responses.

## 6. WCAG 2.1 AA Accessibility & Responsive UX
- **Legibility Contrast Ratio:** Text-to-background contrast ratios must meet or exceed WCAG 2.1 AA standards (≥ 4.5:1 for normal text, ≥ 3.0:1 for large headers).
- **ARIA & Input Accessibility:** All interactive elements (`<button>`, `<input>`, `<select>`) must include descriptive `aria-label` or `htmlFor` bindings and visible keyboard focus rings.

## 7. Atomic Extraction Workflow Constraints
You are forbidden from performing monolithic backend refactoring in a single step. High-risk backend state changes must be broken down into atomic increments.

## 8. Deployment Guardrail
The project's deployment manifest is the sole authority for what gets deployed to the live server.
- Whenever a new deployable directory or file category is added to the project, you MUST immediately audit the deployment manifest to verify a corresponding deployment task exists.

## 9. Ephemeral Plan Structure Format (Blueprint Mandate)
Your `.ai_plan.md` MUST always maintain a strict separation of concerns and act as a detailed architectural blueprint defining `Type`, `Git Summary`, and hyper-granular target line targets.

## 10. Consistency & Reusability Mandate
- **UI/UX Consistency:** All newly generated UI elements must perfectly match the styling, CSS classes, HTML layout, and text semantics of their existing counterparts globally across the project.
- **Backend Reusability:** When building backend classes, aggressively pursue code reusability. Ensure methods are atomic.

## 11. Dynamic Granularity Protocol
The size of a code transaction must be inversely proportional to its systemic risk. Superficial changes may be bundled; high-risk state shifts must be broken down into microscopic single-variable commits.

## 12. Graceful Degradation & Enterprise Error Handling
- **The Boundary Shield:** No backend exception is ever allowed to reach the client's screen (no 500 errors or white screens). All backend controller actions and service methods must be wrapped in strict `try/catch` blocks.
- **Sanitized Outputs:** If a failure occurs, the backend must log the stack trace to the project's error log and return a safe, structured JSON payload.

## 13. Pipeline Interconnectivity & Ghost File Prevention
- **Proactive Tracking:** You are strictly forbidden from creating a new functional file without immediately interconnecting it to the architectural pipeline.
- **Mandatory Mapping:** The moment a file is created, it MUST be registered in its respective `.md` architectural dictionary.

## 14. Mandatory Dry-Run & Sandbox Pre-Flight Protocol
- **Isolation & Simulation First:** Before mutating production code, applying high-risk database/filesystem refactors, or altering cross-layer bridges, build a rapid sandbox integration script in `.bench/sandbox/` or support `--dry-run` validation to test path resolutions and boundary parameters in isolation.
- **Temporary File Quarantine:** Any generators, testers, or scratch logic MUST be strictly placed in a `.bench/sandbox/` directory (ignored by `.gitignore`) to prevent deployment pollution.

## 15. Documentation Birth Protocol
- **User Confirmation Gate:** Before creating any new architectural dictionary or workspace `.md` file, the agent MUST present the proposed filename, absolute path, and a one-line scope description to the user for confirmation.
- **Zero Silent Writes:** The agent MUST NOT write the new `.md` file to disk until the user explicitly approves the proposal.

## 16. Dependency Addition Protocol (Bloat Prevention)
- **Exhaust Native Options First:** Before introducing a new package, search the workspace manifest files (`package.json`, `composer.json`, `requirements.txt`) to see if a dependency already exists.
- **Explicit Consent:** Present the package size, purpose, and alternative consideration to the user for approval before running installation commands.

## 17. API Contract & Schema Validation
- **Decoupled Contracts:** For backend stacks exposing web routes or APIs, input/output validation schemas must be explicitly defined.
- **Schema Drift Prevention:** Ensure payload models match frontend type definitions to prevent decoupled state mismatches.

## 18. Secrets & Credentials Security Guardrail
- All credentials must live in environment variables (e.g., `.env`), and `.env` files must be registered in `.gitignore`.

## 19. Single-Prompt Self-Healing Execution & Asset Building
- **One-Shot Atomic Execution:** `cli_commit.py` automatically auto-stages modified source files (`git add .`), normalizes plan headings (`### Title`), and compiles frontend production assets (`npm run build` with skip guard) in a single atomic transaction. You do not need to issue multiple manual `git add` or `npm run build` commands before invoking `cli_commit.py`.

## 20. Background Task Non-Polling Policy
- **Zero Polling Loops:** When invoking long-running background tasks (such as `run_command` async, `cli_commit.py`, or `git push`), you are strictly forbidden from repeatedly polling `manage_task(status)` in a loop.
- **Reactive Wakeup:** After launching a background task, immediately stop tool execution and end your turn. Antigravity will automatically wake up and notify the agent upon task completion.

</RULE[Antigravity_Standards]>
<!-- RULE-END[Enterprise Standards] -->
