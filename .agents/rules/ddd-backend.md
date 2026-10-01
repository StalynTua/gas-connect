# DDD Architecture Rules — Backend API

Applies to: all files under `apps/api/src/` (and root `src/` in backend).  
Stack: Fastify 4, TypeScript 5.6 (strict, ESM NodeNext), Prisma 5 + PostGIS, OSRM, Zod 3, Vitest 2.

---

## 1. Context and Layers

The backend is organized into bounded contexts under `src/modules/<context>/`. Each context has four layers and a public barrel:

```
src/modules/<context>/
  domain/        # Types, interfaces, value objects, domain events — zero external dependencies
  application/   # Use cases and application services — depends only on domain interfaces
  infrastructure/# Repository implementations, HTTP adapters — depends on domain + shared lib
  presentation/  # Fastify route handlers, Zod schemas — depends on application layer
  index.ts       # Public module barrel: exports public API & create<Context>Module factory
src/lib/         # Shared infrastructure singletons (prisma.ts); no business logic allowed here
src/shared/      # Types shared across contexts (e.g., Coordinates); domain-only, no I/O
src/server.types.ts # Composition root dependency interfaces for testing overrides
src/app.ts       # HTTP application factory: Fastify, plugins (CORS, Helmet), health check & module assembly
src/server.ts    # Process lifecycle entrypoint only: listen, port, graceful shutdown, startup hooks (< 50 lines)
```

Recognized bounded contexts: `routing`, `fleet`, `orders`, `dispatch`, `whatsapp`.  
File `src/app.ts` is the HTTP composition root (assembles module factories). File `src/server.ts` is strictly the runtime process runner.

---

## 2. Mandatory Folder Structure

When adding a new file, place it in the correct layer folder. Role suffix in the file name must match the layer:

| Role | Layer | File suffix | Example |
|---|---|---|---|
| Interfaces, value objects, domain types | domain | `.types.ts` or `.domain.ts` | `coordinates.types.ts` |
| Repository interface | domain | `.repository.ts` | `truck.repository.ts` |
| Domain event | domain | `.event.ts` | `order-received.event.ts` |
| Use case / application service | application | `.use-case.ts` or `.service.ts` | `start-dispatch.use-case.ts` |
| Repository implementation | infrastructure | `.repository.ts` (prefixed) | `prisma-truck.repository.ts` |
| External HTTP adapter | infrastructure | `.client.ts` | `osrm-http.client.ts` |
| Fastify route handler | presentation | `.controller.ts` | `webhook.controller.ts` |
| Zod schema | presentation | `.schema.ts` | `dispatch-decision.schema.ts` |
| Public module barrel & factory | module root | `index.ts` | `modules/dispatch/index.ts` |

---

## 3. Dependency Rules (Import Constraints)

The dependency rule: **outer layers depend on inner layers; never the reverse.**

```
presentation  ->  application  ->  domain
infrastructure  ->  domain
modules/<context>/index.ts (factory)  ->  internal layers of the same context
app.ts (HTTP composition root)  ->  modules/<context>/index.js (public barrels only)
server.ts (process entrypoint)  ->  app.js + background startup hooks (< 50 lines)
```

### Permitted imports per layer

**domain/** — imports NOTHING from outside its own folder except `src/shared/`.
```typescript
// CORRECT: domain type used by domain
import type { Coordinates } from '../../shared/coordinates.types.js';
// WRONG: domain importing infrastructure
import { prisma } from '../../../lib/prisma.js'; // FORBIDDEN in domain/
```

**application/** — imports domain types and interfaces; NEVER imports infrastructure implementations.
```typescript
// CORRECT: depend on the interface, not the implementation
constructor(private readonly truckRepo: ITruckRepository) {}
// WRONG: application importing infrastructure directly
import { PrismaTruckRepository } from '../infrastructure/prisma-truck.repository.js'; // FORBIDDEN
```

**infrastructure/** — imports domain interfaces and `src/lib/prisma.ts`; NEVER imports application or presentation.
```typescript
// CORRECT: repository implementation depends on domain interface + prisma
import type { ITruckRepository } from '../domain/truck.repository.js';
import { prisma } from '../../../lib/prisma.js';
```

**presentation/** — imports application use cases and Zod schemas; NEVER imports Prisma or HTTP clients directly.

**modules/<context>/index.ts** — wires internal layers; exposes `create<Context>Module()` factory and public types.

**app.ts** — imports ONLY module factories from `modules/<context>/index.js`; NEVER imports internal layers directly.

**server.ts** — imports `app.js` and startup background adapters; NEVER instantiates use cases or repositories.

---

## 4. Cross-Context Communication Rules

- **Never import a service or type from another bounded context's `application/` or `infrastructure/` layer.**
- **Never import a service from another bounded context's `domain/` unless it is in `src/shared/`.**
- **Always import other bounded contexts via their public barrel `modules/<context>/index.js`.** Deep imports into internal folders of other contexts are strictly forbidden.
- Cross-context calls go through: (a) a shared domain port interface, (b) a domain event, or (c) an explicit application-layer call to an injected interface.

```typescript
// WRONG: ConversationService directly imports DispatchOrchestratorService from internal path
import { dispatchOrchestrator } from '../../dispatch/application/dispatch-orchestrator.service.js'; // FORBIDDEN
// CORRECT: inject an IDispatchService port into the use case constructor
constructor(private readonly dispatchService: IDispatchService) {}
```

- `Coordinates` and `RouteResult` are shared domain types in `src/shared/` and are imported from there by ALL contexts.

---

## 5. Cohesion Rules

- **One use case per class, one public method.** Use cases are named as `<Verb><Noun>UseCase` with a single `execute(dto)` method.
- **Each aggregate has exactly one repository interface and one repository implementation.**
- **The 45-second dispatch timeout is an invariant owned by `dispatch/application/start-dispatch.use-case.ts`.** Do not replicate timeout logic elsewhere.
- **Session state** (`DispatchSession`, `UserSession`) is always owned by the context that created it. No other context reads or writes it directly.

---

## 6. Low-Coupling Rules

- **Inject all infrastructure dependencies through constructor parameters.** No module-level singleton access inside use cases.
- **`evolutionClient` (Evolution API) is injected through `IMessageSender`.** No use case or domain service imports `EvolutionApiClient` directly.
- **`prisma` is never imported outside of `src/lib/prisma.ts` and infrastructure repository implementations.**
- **`app.ts` is the HTTP composition root.** Wiring across contexts occurs exclusively via module factories (`create<Context>Module`).
- **`server.ts` is strictly the process runner (< 50 lines).** No use cases, repositories, route registrations, or plugins are instantiated in `server.ts`.

---

## 7. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| File | kebab-case, role suffix | `start-dispatch.use-case.ts`, `prisma-truck.repository.ts` |
| Class | PascalCase, role suffix | `StartDispatchUseCase`, `PrismaTruckRepository` |
| Interface | Prefix I + PascalCase | `ITruckRepository`, `IMessageSender`, `IRoutingService` |
| DTO | PascalCase + Dto suffix | `StartDispatchDto`, `DispatchDecisionDto` |
| Module factory | `create<Context>Module` | `createDispatchModule(deps?: DispatchModuleDeps)` |
| ESM imports | Always include .js extension | `from './truck.repository.js'` |

---

## 8. Pre-Commit Checklist

Before submitting any new backend code, verify each item:

- [ ] Every new file is in the correct layer folder (`domain/`, `application/`, `infrastructure/`, `presentation/`).
- [ ] No `prisma` import exists in any `domain/`, `application/`, or `presentation/` file.
- [ ] No `fetch` or HTTP client import exists in any `domain/` or `application/` file.
- [ ] No Fastify type (`FastifyInstance`, `FastifyRequest`) exists in any `domain/` or `application/` file.
- [ ] Cross-context dependencies are through port interfaces (`IXxx`) and imported via `modules/<context>/index.js`.
- [ ] Every new class with the `UseCase` suffix has exactly one public method named `execute` and a corresponding Dto type.
- [ ] Input validation uses a Zod schema defined in `presentation/<feature>.schema.ts`.
- [ ] Every caught error logs at minimum one structured message (no empty `catch {}`).
- [ ] New ESM imports include `.js` extension.
- [ ] `server.ts` remains under 50 lines with zero use case or repository instantiations.

---

## 9. Explicit Prohibitions

- **NEVER** write Prisma ORM calls or raw SQL inside a `*.controller.ts` file.
- **NEVER** call `evolutionClient.sendTextMessage()` or `evolutionClient.sendButtonMessage()` inside a domain state machine or use case.
- **NEVER** define `Coordinates`, `RouteResult`, or any domain value object inside an `*.client.ts` infrastructure file.
- **NEVER** import a singleton from another bounded context's internal application or infrastructure layer.
- **NEVER** instantiate UseCases or Repositories directly inside `server.ts`. All wiring belongs to `modules/<context>/index.ts` and `app.ts`.
- **NEVER** import from deep subpaths of another module (e.g. `../<context>/infrastructure/*`). Always import from `../<context>/index.js`.
- **NEVER** register routes or plugins in `server.ts`; all HTTP configuration belongs to `app.ts` and module `registerRoutes` methods.
- **NEVER** leave an empty `catch {}` block without at minimum a `server.log.warn(...)` call.
- **NEVER** add `console.log`, `console.warn`, or `console.error` in production code paths. Use `server.log` or the Pino logger instance.

---

## Quality Compliance Table

| Rule from Phase 3 | Status |
|---|---|
| Q1 — Imperative and verifiable | YES — every rule uses "Never", "Always", or specific check |
| Q2 — Only what AI cannot deduce from code | YES — cross-layer and cross-context import constraints |
| Q3 — Scoped to correct project | YES — file lives in .agents/rules/ddd-backend.md; applies to apps/api/src/ |
| Q4 — Single responsibility | YES — covers DDD layers, modular factories, imports, prohibitions (backend DDD) |
| Q5 — Under 200 lines | YES — ~190 lines |
| Q6 — No content duplication | YES — AGENTS.md points to this rule; rule defines enforceable constraints |
| Q7 — Examples use real stack | YES — Fastify, Prisma, Zod, TypeScript ESM |
| Q8 — Checklist is binary | YES — all 10 checklist items are yes/no |
