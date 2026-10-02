# AGENTS.md — GasConnect Ibarra (monorepo)

## What this repository is

GasConnect Ibarra is a monolith that receives gas orders through WhatsApp (Evolution API), determines the nearest truck using PostGIS + OSRM, and orchestrates dispatch through an offer cascade with a 45s timeout. The backend exposes the API and coordinates in real time (Centrifugo) with two frontends: a cabin PWA for the truck assistant and an operations panel (ops-portal) for the dispatch team.

This repository contains 3 independent projects coupled through REST/real-time contracts:

| Project | Path | AGENTS.md |
|---|---|---|
| Backend API | `apps/api/` | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) |
| cab-pwa | `apps/cab-pwa/` | [`apps/cab-pwa/AGENTS.md`](apps/cab-pwa/AGENTS.md) |
| ops-portal | `apps/ops-portal/` | [`apps/ops-portal/AGENTS.md`](apps/ops-portal/AGENTS.md) |

Before working on any of the three, also read the project-specific AGENTS.md — this root document covers the global governance, shared engineering rules, and cross-project concerns.

Read [CONSTRAINTS.md](CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

---

## 🏛️ Governance & Skill-Driven Engineering (`agent-skills`)

This repository operates under a production-grade engineering skill model (`agent-skills`). Quality, empirical verification, and DDD architecture take precedence over speed.

Antigravity and coding agents must follow this lifecycle in a non-negotiable manner:

### 1. Intent → Skill Mapping

Before writing or modifying code, identify the intent and apply the corresponding skill:

| Intent / Task | Mandatory Skill | Monorepo Protocol |
|---|---|---|
| **New feature or architectural change** | `spec-driven-development` | Write technical spec or update `tasks/plan.md` before coding. |
| **Ambiguous requirements or open-ended design** | `interview-me` | Ask questions one by one until reaching 95% confidence. |
| **Task breakdown** | `planning-and-task-breakdown` | Atomic tasks recorded in `tasks/todo.md`. |
| **Endpoint or contract design/change** | `api-and-interface-design` | **Crucial:** Run `codegraph impact` to analyze impact on frontends. |
| **Construction and implementation** | `incremental-implementation` + `test-driven-development` | Small vertical slices, TDD (Red-Green-Refactor), and commits of ~100 lines. |
| **UI development (cab-pwa / ops-portal)** | `frontend-ui-engineering` | WCAG 2.1 AA accessibility, responsive layouts, and strict adherence to UI DDD layers. |
| **Database schema change or extension** | `documentation-and-adrs` + `spec-driven-development` | Protocol: `pnpm prisma:push`, `pnpm prisma:generate`, and `pnpm prisma:seed` (see ADR-004). |
| **Runtime bugs or failures** | `debugging-and-error-recovery` | 5-step triage (*reproduce → localize → reduce → fix → guard*). |
| **Refactoring** | `code-simplification` | Respect *Chesterton's Fence*; do not refactor code without prior characterization tests. |
| **Browser verification** | `browser-testing-with-devtools` | Verify DOM, polling, console, and network errors via Chrome DevTools MCP. |
| **Prior to Merge / Pull Request** | `code-review-and-quality` | 5-axis audit (correctness, readability, architecture, security, performance). |

### 2. Lifecycle: The Golden Path

```
 [1. DEFINE]           [2. PLAN]             [3. BUILD]            [4. VERIFY]          [5. REVIEW]
Technical Spec ───▶   Atomic Tasks   ───▶  TDD + Slices    ───▶  Real Tests     ───▶  5-Axis Review
 (tasks/plan)         (tasks/todo)         (~100 lines)         (Vitest/tsc/MCP)        Pre-merge
```

1. **DEFINE:** Do not implement changes affecting more than one file without specifying objectives, boundaries, and contracts.
2. **PLAN:** Decompose the solution into small tasks ordered by dependencies in `tasks/todo.md`.
3. **BUILD:** Apply TDD: first write the failing test, then write the minimal necessary code, and refactor.
4. **VERIFY:** Verify using real commands (`pnpm test`, `pnpm lint`, `pnpm build`). "Looks right" is never enough.
5. **REVIEW:** Audit the change against the *Definition of Done* and DDD rules before considering it complete.

### 3. Anti-Rationalizations (Shortcut Destruction)

| Typical AI Excuse | Technical Reality in GasConnect |
|---|---|
| *"It's a simple API change, I don't need to check the frontends."* | **False.** A change in `apps/api` can break `cab-pwa` or `ops-portal`. Always run `codegraph impact`. |
| *"I commented out this test or used `@ts-ignore` to move quickly."* | **Unacceptable.** If a test or type fails, stop the line (*Stop the Line*) and resolve the root cause. |
| *"I'll write the code first and add tests afterwards."* | Violates TDD. Post-hoc tests bias towards the implemented code and mask subtle bugs. |
| *"I modified schema.prisma and generated the client, no need to push to DB."* | **False (Error P2021).** Client types ≠ live database tables. Always run `pnpm prisma:push`. |
| *"I'll clean up this old block of code that doesn't seem to be used."* | **Chesterton's Fence:** Understand and verify its role with CodeGraph before removing it. |
| *"I put a fetch() inside the React component because it was just a button."* | Violates frontend DDD architecture. All HTTP calls belong in `infrastructure/`. |

### 4. Monorepo Definition of Done (DoD)

No task is considered complete until verifying:
- [ ] Acceptance criteria met according to `tasks/plan.md`.
- [ ] Test coverage with green unit/integration tests (zero regressions in `pnpm test`).
- [ ] Strict type checking passed (`tsc --noEmit` in affected projects).
- [ ] Absolute adherence to DDD layer rules (Backend and Frontends).
- [ ] If a contract or endpoint was modified, cross-impact was verified with `codegraph impact`.
- [ ] If database schema was modified, schema was pushed to PostgreSQL (`pnpm prisma:push`), client generated (`pnpm prisma:generate`), and seed validated (`pnpm prisma:seed`).
- [ ] Zero `console.log` or residual debugging code (use Pino in backend).
- [ ] Checkpoint recorded via a clean atomic Git commit.

---

## 🗄️ Database Schema & Synchronization Protocol (ADR-004)

Whenever modifying or adding models, fields, relations, or enums in `apps/api/prisma/schema.prisma`:

1. **Modify Schema:** Edit `apps/api/prisma/schema.prisma` with explicit snake_case mappings (`@map`, `@@map`).
2. **Push to PostgreSQL (`pnpm prisma:push`):** Never rely solely on `prisma generate`. Live PostgreSQL tables must be created/updated with:
   ```bash
   pnpm prisma:push
   ```
   *Why:* GasConnect uses native PostGIS `Unsupported("geometry(Point, 4326)")` types and shares the PostgreSQL cluster with Evolution API. `pnpm prisma:push` (`prisma db push`) provides safe, direct DDL synchronization without migration table conflicts.
3. **Adapt Repositories:** Update infrastructure repositories under `apps/api/src/modules/<context>/infrastructure/` to map between Prisma models and pure domain entities.
4. **Seed Validation (`pnpm prisma:seed`):** Keep `apps/api/prisma/seed.ts` synchronized with any table cleanups or initial data inserts, and execute `pnpm prisma:seed`.
5. **Quality Verification (`pnpm check:task`):** Run floor guards, DDD layer checks, typechecking, and the full test suite.

---

## Cross-dependencies between the backend and frontends

Verified with `codegraph explore` (see the CodeGraph section below):

- **cab-pwa** (`apps/cab-pwa/src/stores/cabStore.ts`) consumes:
  - `POST /api/v1/dispatch/decision` (accept/reject dispatch offer)
  - `POST /api/v1/orders/complete` (mark delivery as completed)
  - `POST /api/v1/trucks/telemetry` (send position every ~15s, implemented in the `orders` module)
- **ops-portal** (`apps/ops-portal/src/App.tsx`) polls every ~5s:
  - `GET /api/v1/fleet/status`
  - `GET /api/v1/fleet/metrics`
  - `GET /api/v1/fleet/events`

Changes to these endpoint contracts in the backend (the `dispatch`, `orders`, and `fleet` modules; telemetry consumed by cab-pwa belongs to `orders`) require reviewing the impact on both frontends before merging.

---

## Shared conventions

- Strict TypeScript (`strict: true`) in all 3 projects.
- ESM imports with an explicit `.js` extension in the backend (NodeNext resolution).
- Node.js ≥ 20.
- Backend services implemented as singletons (e.g. `lib/prisma.ts`).
- Structured logging with Pino in the backend.
- Each subproject maintains its own `package.json` and `node_modules` under `apps/` or `packages/`. Install dependencies from root with `pnpm`.

---

## Exploring with CodeGraph

The repository uses **a single CodeGraph index at the root** (`.codegraph/`), covering all projects (backend `apps/api/src/`, `apps/cab-pwa/src/`, `apps/ops-portal/src/`, `packages/contracts/`) in one graph. There are no separate indexes per project: the primary use case is tracing cross-dependencies between the backend and frontends, and a single index makes this possible without switching between different databases. Run all commands from the repository root.

Actual available commands (verified with `codegraph --help`): `init`, `index`, `sync`, `status`, `query`, `explore`, `context`, `node`, `files`, `callers`, `callees`, `impact`, `affected`.

> Note: commands such as `codegraph deps`, `codegraph usages`, or `codegraph symbols` **do not exist** in the installed CLI — do not use them, even if they are mentioned in older README drafts.

Examples used during the initial discovery:

- `codegraph status` → confirms that the index is up to date (51 files, 299 nodes, 564 edges).
- `codegraph explore "webhook.controller conversation.service dispatch-orchestrator truck-finder osrm.service fleet.controller orders.controller server.ts"` → maps route wiring in `buildServer()`, the 45s dispatch cascade, and truck filtering by radius/ETA.
- `codegraph explore "cabStore App.tsx LiveFleetMap MetricsCards WhatsAppStatusCard"` → confirms 5s polling in ops-portal and 15s telemetry in cab-pwa.
- `codegraph impact <archivo/símbolo>` → before changing a shared endpoint or contract, use it to see which frontend files are affected.

When the code changes, run `codegraph sync` from the root to update the index incrementally, or `codegraph index` for a complete rebuild. Do not run `codegraph init` in this repository: the index already exists.

---

## Task context (`tasks/`)

Project tasks live in `tasks/` at the repository root (a `.task/` directory does not exist and must not be created):

- `tasks/plan.md` — complete project specification (phases, tasks, acceptance criteria).
- `tasks/todo.md` — progress checklist (`[x]`/`[ ]`).

Before implementing a new task, review these files to understand the context and current state. This root AGENTS.md and the AGENTS.md files for each subproject complement `tasks/`; they do not replace it.

---

## DDD Architecture Rules

Each project enforces a DDD layer architecture. Before adding code to any project, read the project-specific rule:

| Project | Rule file | Scope |
|---|---|---|
| Backend API | [`.agents/rules/ddd-backend.md`](.agents/rules/ddd-backend.md) | `apps/api/src/modules/`, `apps/api/src/shared/` |
| cab-pwa | [`apps/cab-pwa/AGENTS.md`](apps/cab-pwa/AGENTS.md) — "DDD Architecture Rules" section | `apps/cab-pwa/src/` |
| ops-portal | [`apps/ops-portal/AGENTS.md`](apps/ops-portal/AGENTS.md) — "DDD Architecture Rules" section | `apps/ops-portal/src/` |

Full rationale in `docs/architecture/` (01-analisis-*, 02-arquitectura-objetivo-*, 03-estandares-rules.md).
