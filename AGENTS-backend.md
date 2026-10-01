# AGENTS-backend.md — Backend API (`apps/api/`)

> See also the [Root AGENTS.md](./AGENTS.md) for the monorepo overview and cross-dependencies with frontends.

## Purpose

Fastify monolith in `apps/api/` that receives gas orders via WhatsApp (Evolution API), determines the nearest truck using PostGIS + OSRM, and orchestrates dispatch via an offer cascade with a 45s timeout. Exposes the REST API consumed by the frontends (`cab-pwa`, `ops-portal`) and coordinates in real-time with Centrifugo.

## Stack and Versions

- Node.js ≥ 20, TypeScript 5.6.3 (strict, ESM with `.js` imports, NodeNext resolution)
- Fastify 4.28.1 (`@fastify/cors` 9.0.1, `@fastify/helmet` 11.1.1)
- Prisma 5.22.0 + `@prisma/client` 5.22.0 (PostgreSQL + PostGIS)
- BullMQ 5.21.2 + ioredis 5.4.1 (installed dependencies; queue/timer integrations)
- Centrifuge 5.2.2 (real-time coordination with frontends)
- Zod 3.23.8 + `@gasconnect/contracts` (validation and shared DTOs)
- Pino (logging, via `pino-pretty` in dev)
- Vitest 2.1.4 (tests), TypeScript `tsc --noEmit` (lint)

## Architecture

Modular DDD 4-layer architecture organized into 5 bounded contexts under `apps/api/src/modules/`:

- `whatsapp/` — message reception (Evolution API), conversation FSM, outbound notifications.
- `dispatch/` — nearest truck search (PostGIS) and 45s offer cascade orchestration.
- `routing/` — road ETA calculation via OSRM with Haversine fallback.
- `fleet/` — fleet status, metrics, events, and telemetry updates.
- `orders/` — order lifecycle and delivery completion.
- `shared/` — shared kernel (`Coordinates`, `DomainError`, etc.).
- `lib/prisma.ts` — Prisma client singleton, used strictly by infrastructure repositories.

### Composition Root Architecture (ADR-002)

The composition root is cleanly split across three tiers:
1. `src/server.ts`: Runtime process runner (< 50 lines). Reads environment (`PORT`, `HOST`), calls `buildServer()`, starts listening, triggers non-blocking background initialization (`evolutionClient.ensureConfigured()`), and handles startup failures.
2. `src/app.ts`: HTTP application factory (`buildServer(overrides?: CompositionRootDependencies)`). Registers Fastify plugins (CORS, Helmet), healthcheck (`/api/health`), and assembles modules by calling their factory functions.
3. `src/server.types.ts`: Type definition for `CompositionRootDependencies` used for test overrides.
4. `src/modules/<context>/index.ts`: Module barrel and factory `create<Context>Module(deps)`. Encapsulates internal wiring of domain, application, infrastructure, and presentation, exposing `registerRoutes(server)`.

## Directory Structure

```
apps/api/
├── src/
│   ├── server.ts              # Runtime entrypoint (< 50 lines)
│   ├── app.ts                 # buildServer(): Fastify composition root
│   ├── server.types.ts        # CompositionRootDependencies for testing
│   ├── lib/
│   │   └── prisma.ts          # Prisma client singleton (infrastructure only)
│   ├── shared/                # Shared kernel (Coordinates, DomainError)
│   └── modules/
│       ├── routing/           # index.ts, domain/, application/, infrastructure/
│       ├── fleet/             # index.ts, domain/, application/, infrastructure/, presentation/
│       ├── orders/            # index.ts, domain/, application/, infrastructure/, presentation/
│       ├── dispatch/          # index.ts, domain/, application/, infrastructure/, presentation/
│       └── whatsapp/          # index.ts, domain/, application/, infrastructure/, presentation/
├── prisma/                    # schema.prisma, migrations/, seed.ts
├── tests/                     # unit/ and integration tests
├── package.json               # @gasconnect/api
└── tsconfig.json
```

## Commands

Run from the monorepo root:

- `pnpm dev:api` — runs backend in watch mode (`tsx watch src/server.ts`).
- `pnpm test:api` — runs Vitest suite for `@gasconnect/api`.
- `pnpm --filter @gasconnect/api lint` — type checks backend.
- `pnpm prisma:generate` / `pnpm prisma:migrate` / `pnpm prisma:seed` — Prisma commands.
- `pnpm whatsapp:setup` — auto-configures Evolution API instance and webhook.

Or run from `apps/api/`:
- `pnpm dev`, `pnpm test`, `pnpm build`, `pnpm lint`.

## Exploring with CodeGraph

Backend files are indexed in the root `.codegraph/`. Run all commands from the repository root:

- `codegraph explore "app.ts server.ts createDispatchModule createFleetModule"`
- `codegraph callers start-dispatch.use-case.ts`
- `codegraph callees app.ts`
- `codegraph impact <file/symbol>` — assess impact on frontends before modifying shared endpoint contracts.

## DDD Architecture Rules

Strictly enforced by [`.agents/rules/ddd-backend.md`](.agents/rules/ddd-backend.md):
- `server.ts` must stay under 50 lines with zero use cases or repositories instantiated.
- `app.ts` only imports module factories from `modules/<context>/index.js`, never deep internal subpaths.
- Domain layer has 0 external dependencies.
- Infrastructure layer is the ONLY layer permitted to import Prisma or make HTTP requests.
- No `console.log` in production; use structured Pino logging (`server.log`).

## Relevant ADRs

- [`docs/decisions/ADR-001-monorepo-pnpm-coolify.md`](docs/decisions/ADR-001-monorepo-pnpm-coolify.md) — Monorepo pnpm, Turborepo and Coolify deployment.
- [`docs/decisions/ADR-002-decomposicion-modular-composition-root-app-server.md`](docs/decisions/ADR-002-decomposicion-modular-composition-root-app-server.md) — Modular Composition Root decomposition into `app.ts`, `server.ts`, and module barrels.
