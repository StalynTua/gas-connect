# AGENTS.md — GasConnect Ibarra (monorepo)

## What this repository is

GasConnect Ibarra is a monolith that receives gas orders through WhatsApp (Evolution API), determines the nearest truck using PostGIS + OSRM, and orchestrates dispatch through an offer cascade with a 45s timeout. The backend exposes the API and coordinates in real time (Centrifugo) with two frontends: a cabin PWA for the truck assistant and an operations panel (ops-portal) for the dispatch team.

This repository contains 3 independent projects coupled through REST/real-time contracts:

| Project | Path | AGENTS.md |
| Project | Path | AGENTS.md |
|---|---|---|
| Backend API | `apps/api/` | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) / [`./AGENTS-backend.md`](./AGENTS-backend.md) |
| cab-pwa | `apps/cab-pwa/` | [`apps/cab-pwa/AGENTS.md`](apps/cab-pwa/AGENTS.md) |
| ops-portal | `apps/ops-portal/` | [`apps/ops-portal/AGENTS.md`](apps/ops-portal/AGENTS.md) |

Before working on any of the three, also read the project-specific AGENTS.md — this root document covers only the global overview and shared concerns.

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

## Shared conventions

- Strict TypeScript (`strict: true`) in all 3 projects.
- ESM imports with an explicit `.js` extension in the backend (NodeNext resolution).
- Node.js ≥ 20.
- Backend services implemented as singletons (e.g. `lib/prisma.ts`).
- Structured logging with Pino in the backend.
- Each subproject maintains its own `package.json` and `node_modules` under `apps/` or `packages/`. Install dependencies from root with `pnpm`.

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

## Task context (`tasks/`)

Project tasks live in `tasks/` at the repository root (a `.task/` directory does not exist and must not be created):

- `tasks/plan.md` — complete project specification (phases, tasks, acceptance criteria).
- `tasks/todo.md` — progress checklist (`[x]`/`[ ]`).

Before implementing a new task, review these files to understand the context and current state. This root AGENTS.md and the AGENTS.md files for each subproject complement `tasks/`; they do not replace it.

## DDD Architecture Rules

Each project enforces a DDD layer architecture. Before adding code to any project, read the project-specific rule:

| Project | Rule file | Scope |
|---|---|---|
| Backend API | [`.agents/rules/ddd-backend.md`](.agents/rules/ddd-backend.md) | `apps/api/src/modules/`, `apps/api/src/shared/` |
| cab-pwa | [`apps/cab-pwa/AGENTS.md`](apps/cab-pwa/AGENTS.md) — "DDD Architecture Rules" section | `apps/cab-pwa/src/` |
| ops-portal | [`apps/ops-portal/AGENTS.md`](apps/ops-portal/AGENTS.md) — "DDD Architecture Rules" section | `apps/ops-portal/src/` |

Full rationale in `docs/architecture/` (01-analisis-*, 02-arquitectura-objetivo-*, 03-estandares-rules.md).
