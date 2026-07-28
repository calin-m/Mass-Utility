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
   - **Single Atomic Operation:** When a task or phase is complete, update all `.md` dictionaries, and then immediately execute `python .orchestra/.conductor/tools/cli_commit.py`. This guarantees the docs, code, and history are perfectly bound and formatted.
3. **Smart Ephemeral Commits:**
   - The `cli_commit.py` script will automatically ingest the exact contents of `.ai_plan.md` into the Git Commit message.
   - Once the commit succeeds, `cli_commit.py` will delete `.ai_plan.md`.
4. **Smart Interconnectivity Tracing & Sequential Investigation:**
   - **Primary Token-Saving Scanner:** You MUST use the custom Python script `.orchestra/.conductor/tools/workspace_inspector.py` as your primary tool to mathematically map architecture, symbols, and dependencies.
   - **Questions & Diagnostics Mandate:** Whenever the user asks any question about how code works, module layout, or system behaviors, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py trace "<keyword>"` (or `lookup "<symbol>"` / `matrix`) to ground your response in live AST symbol maps and generated reports.
   - **Modification & Feature Request Mandate:** Before drafting any plan or making code changes, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py plan "<USER_GOAL>"`, which automatically executes the complete multi-tool chain (`trace`, `frontend_map`, `route_map`, `design_map`, `advisories`) and synthesizes the 360° Architectural Impact Report.
   - **Strict Sequential Investigation Protocol:** You MUST run `workspace_inspector.py trace` (or `plan`) FIRST. ONLY if `workspace_inspector.py` outputs `[INSPECTOR_FALLBACK_RECOMMENDED]` (e.g., when querying UI/React components, CSS tokens, or literal text strings where no AST symbol is found), are you authorized to use native `grep_search`, restricted strictly by target file globs (`Includes: ["*.tsx", "*.ts"]`) to prevent API context bloat.
   - **Dual Plan Synchronization & Architecture Diagram Mandate:** Whenever drafting a plan or presenting feature options, you MUST include Mermaid architecture/sequence diagrams in the plan, write to `.ai_plan.md` on disk AND simultaneously generate/update the interactive `implementation_plan.md` artifact in the brain folder with `request_feedback=true` and `user_facing=true`.
   - **Post-Execution Zero-Copy AST Re-Index:** After any code modification or component refactor, you MUST run `python .orchestra/.conductor/tools/workspace_inspector.py map` to refresh `symbol_map.json`, `00_auto_generated_oop_map.md`, and `00_auto_generated_frontend_map.md`.
   - **Scope Pre-Flight Inspection:** Before editing lines within a component or view file, you MUST inspect lines 1–60 (or the top of the file) to verify all imported symbols, prop interfaces, and `useState`/`useEffect` hook variables in scope.
   - Use `python ".orchestra/.conductor/tools/workspace_inspector.py" map` to rebuild and query the unified class/method AST symbol map registry (`.bench/docs/symbol_map.json`).
   - Use `python ".orchestra/.conductor/tools/workspace_inspector.py" trace "keyword"` to trace full vertical slices.
   - Use `python ".orchestra/.conductor/tools/workspace_inspector.py" lookup "EntityName"` to quickly extract specific classes or CSS tokens.
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
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
<!-- RULE-END[Pipeline Rules] -->

<!-- RULE-START[Enterprise Standards] -->
<RULE[Antigravity_Standards]>
# Antigravity Enterprise Engineering Standards

## 1. Context Alignment & Pre-Flight Authority
Before executing any file modifications, writing code, or making plans, you MUST align your context with the active project state. Never assume state from conversational memory. Write your formal plan to `.ai_plan.md`.

## 2. Mandatory Blueprint Updates (Contextual Reflective Sync)
Before declaring any code task or feature phase complete, you are strictly required to automatically sync all architectural files and dictionary maps on disk to reflect the new state of the project.
- **Zero-Tolerance Clause:** You are strictly forbidden from ending your turn or waiting for user input if you have modified code but have not yet synced the documentation. The sync must happen in the exact same response as the code change.
- Append a detailed technical transaction block to `.ai_plan.md` detailing explicit mutations.
- **Locating Targets:** Use the `Workspace Directory Manifest` (in the project's root `WORKSPACE.md`) or the `.ai_pipeline.json`'s `dictionary_mappings` array to locate the exact architectural documentation targets for this specific project.
- **Universal Scanner Rule (No Manual Markdown):** You are FORBIDDEN from manually writing or editing the architectural Markdown dictionaries yourself. Instead, you must solely use inline annotations in your code (`// @Arch[Tag]`, `// @Description: X`, `// @Calls: X`). The Universal Scanner in the pre-commit hook will automatically generate the dictionaries.
- Documentation updates must be strictly proportional to the physical code changes. Only update the specific dictionaries governing the domains you touched (e.g., Backend Logic, Client Engines, Presentation/UI).
- **Proactive Suggestions:** If you encounter an architectural domain that is unmapped, proactively suggest creating a new, dedicated `.md` dictionary to the User.
- **Manifest Sync Oversight:** Whenever a brand new `.md` architectural file or dictionary map is created, you MUST immediately append its filename and description to the `Workspace Directory Manifest` in `WORKSPACE.md`.

## 3. Decoupling Guardrails
Maintain strict boundaries between backend OOP service layers and decoupled frontend presentation components at all times.

## 4. Atomic Extraction Workflow Constraints
You are forbidden from performing monolithic backend refactoring in a single step. High-risk backend state changes must be broken down into atomic increments.
- **Low-Risk Cosmetic/UI Exemption:** Low-risk, non-breaking cosmetic or UI styling normalizations across related frontend components (e.g. normalizing Tailwind classes or light-mode variables) may be batched into a single phase/transaction.

## 5. Deployment Guardrail
The project's deployment manifest (e.g., `.cpanel.yml`, `github-actions.yml`, `deploy.sh`) is the sole authority for what gets deployed to the live server.
- **Mandatory Audit:** Whenever a new deployable directory or file category is added to the project, you MUST immediately audit the deployment manifest to verify a corresponding deployment task exists.
- You are strictly forbidden from declaring a file extraction or new directory creation task complete without first verifying it will be deployed.
- Instruct the User to trigger the deployment webhook BEFORE asking them to test the functionality.

## 6. Ephemeral Plan Structure Format (Blueprint Mandate)
Your `.ai_plan.md` MUST always maintain a strict separation of concerns and act as a perfect, highly-detailed architectural blueprint.
- **Plan Scope:** Clearly define the `Type`, `Git Summary`, and `Execution Order`.
- **Atomic Phases:** Ensure each phase represents a single unit of work.
- **Hyper-Granularity Constraint:** For every phase, you MUST explicitly detail the **Target** (file path and exact line numbers), the **Vulnerability/Context**, the exact **Action**, and a strict **Specification** block (containing the exact pseudocode or logic you will inject). This ensures absolute zero-guesswork traceability.

## 7. Consistency & Reusability Mandate
- **UI/UX Consistency:** All newly generated UI elements must perfectly match the styling, CSS classes, HTML layout, and text semantics of their existing counterparts globally across the project. Do not create isolated custom designs; reuse the native design tokens.
- **Backend Reusability:** When building backend classes, aggressively pursue code reusability. Ensure methods are atomic.

## 8. Dynamic Granularity Protocol
- **Risk-Based Execution:** The size of a code transaction must be inversely proportional to its systemic risk. Superficial changes may be bundled. High-risk state-management shifts must be broken down into microscopic, single-variable or single-tab commits to ensure zero-regression tracing.

## 9. Graceful Degradation & Enterprise Error Handling
- **The Boundary Shield:** No backend exception is ever allowed to reach the client's screen (no 500 errors or white screens). All backend controller actions and service methods must be wrapped in strict `try/catch` blocks.
- **Sanitized Outputs:** If a failure occurs, the backend must log the stack trace to the project's error log and return a safe, structured JSON payload so the UI can handle it gracefully.

## 10. Pipeline Interconnectivity & Ghost File Prevention
- **Proactive Tracking:** You are strictly forbidden from creating a new functional file without immediately interconnecting it to the architectural pipeline.
- **Mandatory Mapping:** The moment a file is created, it MUST be registered in its respective `.md` architectural dictionary. Untracked "ghost files" that exist in the codebase but not in the documentation are considered a critical pipeline failure.

## 11. Mandatory Dry-Run & Sandbox Pre-Flight Protocol
- **Isolation & Simulation First:** Before mutating production code, applying high-risk database/filesystem refactors, or altering cross-layer bridges, build a rapid sandbox integration script in `.bench/sandbox/` to dry-run test path resolutions, regexes, and environment edge cases in isolation.
- **Dry-Run Mode Requirement:** High-risk backend engines (sweepers, backups, batch purges) MUST support a `--dry-run` or simulation mode to compute targets and validate boundary parameters without committing changes.
- **UI Exemption:** React/JSX frontend components and CSS styling updates are exempt from CLI sandbox scripts.
- **Terminal Validation:** Run the sandbox script via terminal for backend services. Prove that it compiles, simulates expected outcomes, and returns clean results before wiring into core production files.
- **Temporary File Quarantine:** Any generators, testers, or scratch logic MUST be strictly placed in a `.bench/sandbox/` directory (ignored by `.gitignore`) to prevent deployment pollution. Do NOT leave floating files in the root.

## 12. Documentation Birth Protocol
- **User Confirmation Gate:** Before creating any new architectural dictionary or workspace `.md` file, the agent MUST present the proposed filename, absolute path, and a one-line scope description to the user for confirmation.
- **Zero Silent Writes:** The agent MUST NOT write the new `.md` file to disk until the user explicitly approves the proposal. This prevents surprise documentation bloat.
- **Auto-Generated Exclusion:** This rule does NOT apply to machine-generated artifacts (e.g., architecture graphs) or transient `.sandbox/` files.


## 13. Dependency Addition Protocol (Bloat Prevention)
- **Exhaust Native Options first:** Before introducing a new package, search the workspace manifest files (`package.json`, `composer.json`, or `requirements.txt`) to see if a dependency already exists that can solve the problem, or if it can be written cleanly in native code.
- **Explicit Consent:** You must present the package size, purpose, and a brief alternative consideration to the user for approval before running any package installation commands.

## 14. API Contract & Schema Validation (If Applicable)
- **Decoupled Contracts:** For backend stacks exposing web routes or APIs, input/output validation schemas (e.g., Zod, Pydantic, or FormRequests) must be explicitly defined.
- **Schema Drift Prevention:** Ensure the payload models match the frontend type definitions to prevent decoupled state mismatches.

## 15. Secrets & Credentials Security Guardrail
- **Environment Stashing:** Under no circumstances should API keys, passwords, private tokens, or credentials be hardcoded in code files or JSON configs.
- **Git Ignore Integration:** All credentials must live in environment variables (e.g., `.env`), and `.env` files must be registered in `.gitignore`.

## 17. Single-Prompt Self-Healing Execution & Asset Building
- **One-Shot Atomic Execution:** `cli_commit.py` automatically auto-stages modified source files (`git add .`), normalizes plan headings (`### Title`), and compiles frontend production assets (`npm run build` with skip guard) in a single atomic transaction. You do not need to issue multiple manual `git add` or `npm run build` commands before invoking `cli_commit.py`.
- **Instant Tool Routing:** Default to `workspace_inspector.py` for backend OOP AST symbols (PHP, Python), and direct `grep_search` with restricted globs (`Includes: ["*.tsx"]`) for frontend UI components, CSS tokens, and string literals on Call #1.

## 18. Background Task Non-Polling Policy
- **Zero Polling Loops:** When invoking long-running background tasks (such as `run_command` async, `cli_commit.py`, or `git push`), you are strictly forbidden from repeatedly polling `manage_task(status)` in a loop.
- **Reactive Wakeup:** After launching a background task, immediately stop tool execution and end your turn. Antigravity will automatically wake up and notify the agent upon task completion.


</RULE[Antigravity_Standards]>
<!-- RULE-END[Enterprise Standards] -->

<!-- RULE-START[Tool Reusability Policy] -->
## Tool Reusability Policy
- Before writing a new python script or manual sequence to perform tasks (such as dependency checks, code minification, database schema graph compilation), you must read the Central Tools Index ([tools_index.md](file:///.bench/docs/tools_index.md)).
- If a custom tool exists for the task, execute it using:
  `python .orchestra/.conductor/tools/workspace_inspector.py run <tool_name>`
<!-- RULE-END[Tool Reusability Policy] -->
