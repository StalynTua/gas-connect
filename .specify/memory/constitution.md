# GasConnect Ibarra Constitution

## Core Principles

### I. Strict DDD Layer Boundaries (NON-NEGOTIABLE)
All code in `apps/api`, `apps/cab-pwa`, and `apps/ops-portal` MUST obey strict Domain-Driven Design layer isolation:
- **Backend (`apps/api/src/modules/<context>/`)**: `presentation → application → domain`, `infrastructure → domain`. `domain/` MUST have zero external dependencies (only `src/shared/`). `application/` MUST NEVER import `infrastructure/` or Prisma. `presentation/` MUST NEVER import Prisma or HTTP clients directly. Cross-context imports MUST go exclusively through `modules/<context>/index.js` barrels.
- **Process Entrypoint**: `apps/api/src/server.ts` MUST remain strictly a process lifecycle runner under 50 lines; HTTP wiring belongs in `apps/api/src/app.ts`.
- **Frontends (`cab-pwa`, `ops-portal`)**: React presentation components MUST NEVER call raw `fetch()` directly; all HTTP/real-time adapters belong in `infrastructure/`.
- **Verification**: Enforced automatically by `node scripts/check-ddd-boundaries.mjs` (via `pnpm check:fast`).

### II. Contract & Cross-Project Compatibility
The monorepo couples `apps/api`, `apps/cab-pwa`, `apps/ops-portal`, and `packages/contracts/` over REST and Centrifugo real-time channels:
- Any change to shared endpoints (e.g., `/api/v1/dispatch/*`, `/api/v1/orders/*`, `/api/v1/trucks/telemetry`, `/api/v1/fleet/*`, `/api/v1/auth/*`) MUST be impact-checked across both frontends using `codegraph impact` before implementation.
- Strict TypeScript (`strict: true`) with explicit `.js` ESM extensions (`NodeNext`) in the backend MUST compile with zero errors (`pnpm check:types`).

### III. Test-First & Zero Floor Violations (NON-NEGOTIABLE)
Quality gates defined in `CONSTRAINTS.md` are non-negotiable and MUST NEVER be weakened to make a change pass:
- **TDD**: Write failing unit/integration tests before implementing production logic (Red-Green-Refactor).
- **Floor Guard**: Zero new `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`, `istanbul ignore`, unimplemented stubs (`TODO`, empty `catch {}`, `throw new Error("Not implemented")`), skipped/deleted tests (`.skip`, `.todo`, `xit`), or hardcoded secrets.
- **No Regression**: 100% of the test suite (`pnpm test`, ratchet ≥ 40 tests) MUST pass. Zero residual `console.log` statements in backend code (use Pino structured logging).

### IV. Database & PostGIS Synchronization (ADR-004)
Whenever `apps/api/prisma/schema.prisma` is modified:
- Models, fields, and enums MUST use explicit snake_case mappings (`@map`, `@@map`).
- Schema changes MUST be synchronized against live PostgreSQL + PostGIS via `pnpm prisma:push`, followed by `pnpm prisma:generate` and `pnpm prisma:seed` validation. Relying solely on client generation is forbidden.

### V. Mobile Performance & Operational Accessibility
Frontends operate under real field conditions in Ibarra (cellular networks, sunlight/night cabin operation):
- **Bundle Budgets**: `cab-pwa` production JS bundle MUST stay ≤ 300 kB uncompressed (≤ 80 kB gzip); `ops-portal` MUST stay ≤ 500 kB uncompressed (≤ 150 kB gzip).
- **Accessibility**: UI changes MUST meet WCAG 2.1 AA (and AAA on critical cabin metrics/countdowns) with touch-friendly controls in `cab-pwa`.

## Technical Stack & Boundaries

- **Runtime**: Node.js ≥ 20, pnpm workspaces + Turborepo, TypeScript 5.6 (`strict: true`).
- **Backend**: Fastify 4, Prisma 5 + PostgreSQL/PostGIS (`Point(4326)`), Redis/BullMQ (45s dispatch cascade), OSRM (local routing), Centrifugo (real-time), Evolution API (WhatsApp), Zod 3, Pino, Vitest 2.
- **Frontends**: Vite + React + Tailwind CSS (`apps/cab-pwa` PWA, `apps/ops-portal` dashboard).
- **Code Intelligence**: Single root CodeGraph index (`.codegraph/`). Keep synchronized with `codegraph sync` after structural changes.

## Development Workflow & Quality Gates

All feature implementations and bug fixes MUST pass the monorepo verification tiers defined in `CONSTRAINTS.md`:
1. **Fast Edit (`pnpm check:fast`, < 5s)**: Floor guard + DDD boundaries + Monorepo TypeScript check.
2. **Task End (`pnpm check:task`, < 90s)**: `pnpm check:fast` + full Vitest suite (`pnpm test`).
3. **Full / CI (`pnpm check:full`, < 180s)**: `pnpm check:task` + production builds (`pnpm build`, verifying bundle budgets).

## Governance

- This constitution works alongside `AGENTS.md`, `CONSTRAINTS.md`, and `.agents/rules/ddd-backend.md`. In case of numerical threshold conflict, `CONSTRAINTS.md` is the authoritative floor.
- Amendments follow Semantic Versioning (`MAJOR` for removing/redefining principles, `MINOR` for adding principles/sections, `PATCH` for clarifications) and MUST be performed via `/speckit-constitution`.
- All `/speckit-plan`, `/speckit-analyze`, and `/speckit-converge` runs MUST treat violations of `NON-NEGOTIABLE` principles as `CRITICAL` blockers.

**Version**: 1.0.0 | **Ratified**: 2026-11-25 | **Last Amended**: 2026-11-25
