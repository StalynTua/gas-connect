# AGENTS.md — @gasconnect/api (`apps/api/`)

> See also: [`../../AGENTS.md`](../../AGENTS.md) (GasConnect Ibarra monorepo overview).
> Read [CONSTRAINTS.md](../../CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

## Purpose

Fastify monolith that receives gas orders via WhatsApp (Evolution API), determines the nearest truck using PostGIS + OSRM, and orchestrates dispatch via an offer cascade with a 45s timeout. Exposes the REST API consumed by the frontends (`cab-pwa`, `ops-portal`) and coordinates in real-time with Centrifugo.

## Skill-Driven Specialization (`agent-skills`)

Inherits the lifecycle and methodological constitution of [`../../AGENTS.md`](../../AGENTS.md). In this subproject, the following apply with particular rigor:

- **Contracts & Endpoints:** When modifying routes or DTOs in `modules/`, invoke `api-and-interface-design` and run `codegraph impact <file>` from the root to ensure neither `cab-pwa` nor `ops-portal` are broken.
- **Testing & TDD:** `pnpm test` (Vitest suite). Every new use case or bug fix strictly requires TDD (`test-driven-development` with a Red-Green-Refactor cycle).
- **Type Verification:** `pnpm lint` (`tsc --noEmit`).
- **DDD Architecture:** Validation against [`../../.agents/rules/ddd-backend.md`](../../.agents/rules/ddd-backend.md) (pure domain, Prisma strictly confined to infrastructure).
- **Pre-Merge Audit:** Invoke `code-review-and-quality` focused on concurrency and database transactions.

## Stack and Versions

Verified in `apps/api/package.json`:
- Node.js ≥ 20, TypeScript 5.6.3 (strict, ESM with explicit `.js` imports, NodeNext resolution)
- Fastify 4.28.1 (`@fastify/cors` 9.0.1, `@fastify/helmet` 11.1.1)
- Prisma 5.22.0 + `@prisma/client` 5.22.0 (PostgreSQL + PostGIS)
- BullMQ 5.21.2 + ioredis 5.4.1 (installed dependencies; queue/timer integrations)
- Centrifuge 5.2.2 (real-time coordination with frontends)
- Zod 3.23.8 + `@gasconnect/contracts` (validation and shared DTOs)
- Pino (logging, via `pino-pretty` in dev)
- Vitest 2.1.4 (tests), TypeScript `tsc --noEmit` (lint)

## Modular Composition Root Architecture (ADR-002)

The backend composition root is strictly decomposed into:
1. `src/server.ts` (< 50 lines): Process entrypoint (reads `PORT`/`HOST`, runs `buildServer().listen()`, executes background startup hooks such as WhatsApp auto-configuration).
2. `src/app.ts`: HTTP application factory `buildServer(overrides?: CompositionRootDependencies)`. Configures Fastify, plugins, `/api/health`, and assembles modules.
3. `src/server.types.ts`: `CompositionRootDependencies` interface for test overrides.
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

Run from `apps/api/`:
- `pnpm dev` — runs backend in watch mode (`tsx watch src/server.ts`).
- `pnpm test` — runs Vitest suite.
- `pnpm lint` — checks types (`tsc --noEmit`).
- `pnpm build` — compiles TypeScript (`prisma generate && tsc`).

Run from repo root:
- `pnpm dev:api`, `pnpm test:api`.

## DDD Architecture Rules

Strictly enforced by [`../../.agents/rules/ddd-backend.md`](../../.agents/rules/ddd-backend.md):
- `server.ts` must stay under 50 lines with zero use cases or repositories instantiated.
- `app.ts` only imports module factories from `modules/<context>/index.js`, never deep internal subpaths.
- Domain layer has 0 external dependencies.
- Infrastructure layer is the ONLY layer permitted to import Prisma or make HTTP requests.
- No `console.log` in production; use structured Pino logging (`server.log`).

## Relevant ADRs

- [`../../docs/decisions/ADR-001-monorepo-pnpm-coolify.md`](../../docs/decisions/ADR-001-monorepo-pnpm-coolify.md)
- [`../../docs/decisions/ADR-002-decomposicion-modular-composition-root-app-server.md`](../../docs/decisions/ADR-002-decomposicion-modular-composition-root-app-server.md)
