# Constraints

Last reviewed: 2026-10-01 by @stan

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, `biome-ignore`, `istanbul ignore`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`, `TODO`
- No skipped or deleted tests without a reason in the commit message: `.skip`, `.todo`, `xit`
- No secrets in source: database passwords, Evolution API tokens, Centrifugo secrets, JWT private keys
- This file does not get weakened to make a change pass

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at | Rationale |
|-----------|------|-----------|---------|-----------|
| Types | Zero TypeScript errors across all workspaces | `pnpm check:types` | every edit, CI | Ensures end-to-end type safety between shared contracts and subprojects |
| Architecture: DDD Layers | Zero layer leaks (domain never imports outer layers/Prisma/Fastify; application never imports infrastructure/Prisma; presentation never imports Prisma) | `node scripts/check-ddd-boundaries.mjs` | every edit, task end, CI | Preserves domain model purity and strict DDD decoupling |
| Architecture: Frontend | Zero raw `fetch()` calls in presentation components | `node scripts/check-ddd-boundaries.mjs` | every edit, task end, CI | Keeps React UI presentational; data fetching remains in infrastructure adapters |
| Architecture: Process Entrypoint | `apps/api/src/server.ts` must remain under 50 lines | `node scripts/check-ddd-boundaries.mjs` | every edit, task end, CI | Keeps HTTP wiring in `app.ts` and module barrels, preserving clean process lifecycle |
| Floor Guard | Zero floor violations in git diff (suppressions, stubs, skips, lowered thresholds) | `node scripts/floor-guard.mjs` | every edit, task end, CI | Stops regressions, silent check silencing, and stubbing in automated tasks |
| Tests: Functional | 100% test suite passing (≥ 40 unit and integration tests) | `pnpm test` | task end, CI | Guarantees business and dispatch flow correctness before delivery |
| Bundle Budget: cab-pwa | Production JS bundle ≤ 300 kB uncompressed (gzip ≤ 80 kB) | `pnpm --filter cab-pwa run build` | task end, preview deploy | Mobile PWA responsiveness and instant loading on cellular networks |
| Bundle Budget: ops-portal | Production JS bundle ≤ 500 kB uncompressed (gzip ≤ 150 kB) | `pnpm --filter ops-portal run build` | task end, preview deploy | Fast initial rendering for operations control dashboard |

Every row names the command that produces the verdict. A dimension with a number and no command in this column is an aspiration, not a constraint.

## Lifecycle Execution

| Phase | Command | What runs | Budget |
|-------|---------|-----------|--------|
| FAST EDIT | `pnpm check:fast` | Floor guard + DDD boundaries + Monorepo TypeScript check | < 5s |
| TASK END | `pnpm check:task` | `pnpm check:fast` + Full Vitest test suite | < 90s |
| FULL / CI | `pnpm check:full` | `pnpm check:task` + Monorepo production builds (`pnpm build`) | < 180s |

## Measured, not yet enforced (Ratchets)

| Metric | Today | Direction | Rationale |
|--------|-------|-----------|-----------|
| Unit & Integration Tests | 40 passed | must not fall | Prevents regression or test suite thinning |
| Coverage on changed lines | Active adoption (warn) | ≥ 80% on new/modified lines | Incremental coverage adoption without blocking ongoing delivery |
| cab-pwa bundle size | 251.82 kB (73.15 kB gzip) | must not grow (budget ≤ 300 kB) | Prevents dependency and bundle bloat on mobile |
| ops-portal bundle size | 416.06 kB (120.89 kB gzip) | must not grow (budget ≤ 500 kB) | Keeps operational panel lightweight and responsive |

## Exceptions

| ID | Rule | Path | Reason | Owner | Expires |
|----|------|------|--------|-------|---------|
| - | None active | - | Repository operates at 100% compliance with zero exceptions | - | - |
