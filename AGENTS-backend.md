# AGENTS-backend.md — Backend API (monorepo root)

> See also the [Root AGENTS.md](./AGENTS.md) for the monorepo overview and cross-dependencies with frontends.

## Purpose

Fastify monolith that receives gas orders via WhatsApp (Evolution API), determines the nearest truck using PostGIS + OSRM, and orchestrates dispatch via an offer cascade with a 45s timeout. Exposes the REST API consumed by the frontends (`cab-pwa`, `ops-portal`) and is prepared for real-time coordination via Centrifugo.

## Stack and versions

- Node.js ≥ 20, TypeScript 5.6.3 (strict, ESM with `.js` imports, NodeNext resolution)
- Fastify 4.28.1 (`@fastify/cors` 9.0.1, `@fastify/helmet` 11.1.1)
- Prisma 5.22.0 + `@prisma/client` 5.22.0 (PostgreSQL + PostGIS)
- BullMQ 5.21.2 + ioredis 5.4.1 (installed dependencies; future queue/timer integrations)
- Centrifuge 5.2.2 (installed dependency; integration point for real-time to frontends)
- Zod 3.23.8 (validation), Pino (logging, via `pino-pretty` in dev)
- Vitest 2.1.4 (tests), ESLint (lint)

## Architecture

Modules under `src/modules/`, each with its controllers/services:

- `whatsapp/` — message reception (Evolution API), conversation state machine.
- `dispatch/` — nearest truck search (PostGIS) and orchestration of the offer cascade with a 45s timeout.
- `routing/` — road ETA calculation via OSRM.
- `fleet/` — fleet status/metrics/events, consumed by `ops-portal`.
- `orders/` — order lifecycle, including truck telemetry (`POST /api/v1/trucks/telemetry`) consumed by `cab-pwa`.
- `lib/prisma.ts` — Prisma client (ORM) singleton, used by all modules.

`src/server.ts` (`buildServer()`) is the entry point: registers Fastify plugins (cors, helmet), configures healthcheck, and mounts routes for each module.

## Directory structure

```
src/
├── server.ts              # buildServer(): entry point, route and plugin wiring
├── lib/
│   └── prisma.ts          # Prisma client singleton
└── modules/
    ├── whatsapp/          # webhook.controller.ts, conversation.service.ts
    ├── dispatch/          # truck-finder.service.ts, dispatch-orchestrator.service.ts
    ├── routing/           # osrm.service.ts
    ├── fleet/             # fleet.controller.ts
    └── orders/            # orders.controller.ts
prisma/                    # schema, migrations, seed.ts
tasks/                     # plan.md, todo.md
tests/                     # vitest suites
```

## Initial code map (CodeGraph)

Verified with `codegraph explore "webhook.controller conversation.service dispatch-orchestrator truck-finder osrm.service fleet.controller orders.controller server.ts"`:

- `src/server.ts` (`buildServer()`) — entry point, wiring of all routes.
- `src/modules/whatsapp/webhook.controller.ts` + `conversation.service.ts` — WhatsApp message reception and conversation state machine.
- `src/modules/dispatch/truck-finder.service.ts` — filtering candidate trucks by radius/ETA (PostGIS).
- `src/modules/dispatch/dispatch-orchestrator.service.ts` — offer cascade to the nearest truck, with a 45s timeout.
- `src/modules/routing/osrm.service.ts` — road ETA calculation via OSRM.
- `src/modules/fleet/fleet.controller.ts` — exposes `fleet/status|metrics|events` (consumed by `ops-portal`).
- `src/modules/orders/orders.controller.ts` — order lifecycle and `POST /api/v1/trucks/telemetry` (consumed by `cab-pwa`).
- `src/lib/prisma.ts` — data access singleton, used by all previous modules.

## Commands

Run from the repo root:

- `npm install` — install dependencies.
- `npm run dev` — runs in watch mode (`tsx watch src/server.ts`).
- `npm run build` — compiles with `tsc`.
- `npm start` — runs the compiled build (`dist/server.js`).
- `npm test` — runs the vitest suite (`vitest run`); `npm run test:watch` for watch mode.
- `npm run lint` — ESLint on `src` (`--ext .ts`).
- `npm run prisma:generate` / `npm run prisma:migrate` / `npm run prisma:seed` — Prisma client generation, migrations, and seed.
- `npm run dev:cab` / `npm run dev:ops` — shortcuts to launch frontends from the root (delegates to `apps/cab-pwa` / `apps/ops-portal`).

## Code conventions

- Strict TypeScript (`strict: true`), ESM imports with explicit `.js` extension (NodeNext resolution).
- Services implemented as singletons (e.g., `lib/prisma.ts`); do not instantiate additional Prisma/Redis clients.
- It is recommended to implement input validation with Zod in the controllers.
- It is recommended to use structured logging with Pino (avoid `console.log` in production code).
- Each module maintains separate controllers and services (`*.controller.ts` for HTTP routes, `*.service.ts` for business logic).

## Exploring with CodeGraph

The backend is part of the single index at the root (`.codegraph/`), along with `cab-pwa` and `ops-portal`. Always run from the repo root.

Examples specific to the backend:

- `codegraph explore "dispatch-orchestrator truck-finder osrm.service"` — understand the 45s cascade and truck filtering.
- `codegraph callers dispatch-orchestrator.service.ts` — see which controllers trigger dispatch orchestration.
- `codegraph callees orders.controller.ts` — see which services the orders controller uses (including telemetry).
- `codegraph impact <file/symbol>` — before modifying an endpoint (`dispatch/decision`, `orders/complete`, `trucks/telemetry`, `fleet/status|metrics|events`), use it to see the impact on `cab-pwa`/`ops-portal`.
- `codegraph status` — confirm the index is updated before exploring.

Do not use `codegraph deps`, `codegraph usages`, or `codegraph symbols`: they do not exist in the installed CLI. After relevant changes, run `codegraph sync` from the root.

## Task context (`tasks/`)

Tasks live in `tasks/` at the repo root:

- `tasks/plan.md` — complete project specification (phases, tasks, acceptance criteria).
- `tasks/todo.md` — progress checklist (`[x]`/`[ ]`).

Review these files before implementing changes in the backend to understand project context and state.

## DDD Architecture Rules

The backend enforces a DDD layer architecture. Before adding any new file, read:

**`.agents/rules/ddd-backend.md`** — defines the four layers (`domain/`, `application/`, `infrastructure/`, `presentation/`) per bounded context, all import constraints, the pre-commit checklist, and explicit prohibitions.

Applies to: all files under `src/modules/` and `src/shared/`.  
Does NOT apply to: `prisma/`, `tests/`, `scripts/`, `src/server.ts` (composition root).

## Rules for agents

- **Do not touch** `prisma/migrations` manually: generate new migrations with `npm run prisma:migrate`, never edit already applied migration files.
- **Do not touch** `.env` (contains credentials/secrets); use `.env.example` as a reference if you need to document a new variable.
- The `dispatch/decision`, `orders/complete`, `trucks/telemetry` (module `orders`), and `fleet/status|metrics|events` (module `fleet`) endpoints are REST contracts consumed by `cab-pwa` and `ops-portal`: any change to the form/semantics requires reviewing the impact on both frontends (see [Root AGENTS.md](./AGENTS.md)) before merging.
- Do not instantiate new Prisma/Redis clients outside of existing singletons (`lib/prisma.ts`).
- Maintain the 45s dispatch cascade timeout as a critical behavior: any change must be covered by tests in `tests/`.
