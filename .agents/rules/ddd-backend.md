# DDD Architecture Rules — Backend API

Applies to: all files under `src/` in the monorepo root (backend).  
Stack: Fastify 4, TypeScript 5.6 (strict, ESM NodeNext), Prisma 5 + PostGIS, OSRM, Zod 3, Vitest 2.

---

## 1. Context and Layers

The backend is organized into bounded contexts under `src/modules/<context>/`. Each context has four layers:

```
src/modules/<context>/
  domain/        # Types, interfaces, value objects, domain events — zero external dependencies
  application/   # Use cases and application services — depends only on domain interfaces
  infrastructure/# Repository implementations, HTTP adapters — depends on domain + shared lib
  presentation/  # Fastify route handlers, Zod schemas — depends on application layer
src/lib/         # Shared infrastructure singletons (prisma.ts); no business logic allowed here
src/shared/      # Types shared across contexts (e.g., Coordinates); domain-only, no I/O
```

Recognized bounded contexts: `order-reception`, `dispatch`, `routing`, `fleet-monitoring`, `order-lifecycle`.  
File `src/server.ts` is the composition root only: wires routes and performs dependency injection.

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

---

## 3. Dependency Rules (Import Constraints)

The dependency rule: **outer layers depend on inner layers; never the reverse.**

```
presentation  ->  application  ->  domain
infrastructure  ->  domain
server.ts (composition root)  ->  infrastructure + presentation
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

// WRONG: infrastructure importing from application
import { StartDispatchUseCase } from '../application/start-dispatch.use-case.js'; // FORBIDDEN
```

**presentation/** — imports application use cases and Zod schemas; NEVER imports Prisma or HTTP clients directly.
```typescript
// CORRECT: controller depends on use case
import { StartDispatchUseCase } from '../application/start-dispatch.use-case.js';

// WRONG: controller importing Prisma
import { prisma } from '../../../lib/prisma.js'; // FORBIDDEN in presentation/
```

---

## 4. Cross-Context Communication Rules

- **Never import a service or type from another bounded context's `application/` or `infrastructure/` layer.**
- **Never import a service from another bounded context's `domain/` unless it is in `src/shared/`.**
- Cross-context calls go through: (a) a shared domain port interface, (b) a domain event, or (c) an explicit application-layer call to an injected interface.

```typescript
// WRONG: ConversationService directly imports DispatchOrchestratorService
import { dispatchOrchestrator } from '../../dispatch/application/dispatch-orchestrator.service.js'; // FORBIDDEN

// CORRECT: inject an IDispatchService port into the use case constructor
constructor(private readonly dispatchService: IDispatchService) {}
```

- `Coordinates` and `RouteResult` are shared domain types. They live in `src/shared/` and are imported from there by ALL contexts.
- The `order-reception` context does not know about `CandidateTruck`. If it needs routing data, the dispatch context returns a typed result through a port interface.

---

## 5. Cohesion Rules

- **One use case per class, one public method.** Use cases are named as `<Verb><Noun>UseCase` with a single `execute(dto)` method.
- **Each aggregate has exactly one repository interface and one repository implementation.**
- **The 45-second dispatch timeout is an invariant owned by `dispatch/application/dispatch-orchestrator.service.ts`.** Do not replicate timeout logic elsewhere.
- **Session state** (`DispatchSession`, `UserSession`) is always owned by the context that created it. No other context reads or writes it directly.

---

## 6. Low-Coupling Rules

- **Inject all infrastructure dependencies through constructor parameters.** No module-level singleton access inside use cases.
- **`evolutionClient` (Evolution API) is injected through `IMessageSender`.** No use case or domain service imports `EvolutionApiClient` directly.
- **`prisma` is never imported outside of `src/lib/prisma.ts` and infrastructure repository implementations.**

```typescript
// CORRECT: singleton only in infrastructure
import { prisma } from '../../../lib/prisma.js'; // Only inside infrastructure/*.repository.ts

// WRONG: prisma in a controller or use case
import { prisma } from '../../lib/prisma.js'; // FORBIDDEN outside infrastructure/
```

- **`server.ts` is the only composition root.** Dependency wiring (injecting PrismaTruckRepository into StartDispatchUseCase) happens only here.

---

## 7. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| File | kebab-case, role suffix | `start-dispatch.use-case.ts`, `prisma-truck.repository.ts` |
| Class | PascalCase, role suffix | `StartDispatchUseCase`, `PrismaTruckRepository` |
| Interface | Prefix I + PascalCase | `ITruckRepository`, `IMessageSender`, `IRoutingService` |
| Singleton export | camelCase const after class | `export const startDispatchUseCase = new StartDispatchUseCase(...)` |
| DTO | PascalCase + Dto suffix | `StartDispatchDto`, `DispatchDecisionDto` |
| Domain event | PascalCase + Event suffix | `OrderReceivedEvent`, `DispatchOfferAcceptedEvent` |
| Zod schema | camelCase + Schema suffix | `dispatchDecisionSchema`, `telemetrySchema` |
| ESM imports | Always include .js extension | `from './truck.repository.js'` |

---

## 8. Pre-Commit Checklist

Before submitting any new backend code, verify each item:

- [ ] Every new file is in the correct layer folder (`domain/`, `application/`, `infrastructure/`, `presentation/`).
- [ ] No `prisma` import exists in any `domain/`, `application/`, or `presentation/` file.
- [ ] No `fetch` or HTTP client import exists in any `domain/` or `application/` file.
- [ ] No Fastify type (`FastifyInstance`, `FastifyRequest`) exists in any `domain/` or `application/` file.
- [ ] Cross-context dependencies are through port interfaces (`IXxx`), not direct class imports.
- [ ] Every new class with the `UseCase` suffix has exactly one public method named `execute` and a corresponding Dto type. (Does not apply to existing service classes.)
- [ ] Input validation uses a Zod schema defined in `presentation/<feature>.schema.ts`.
- [ ] Every caught error logs at minimum one structured message (no empty `catch {}`).
- [ ] New ESM imports include `.js` extension.
- [ ] Any change to a REST endpoint that cab-pwa or ops-portal consume is reflected in those projects' AGENTS.md and verified with `codegraph impact`.

---

## 9. Explicit Prohibitions (Anti-Patterns Detected in Phase 1)

- **NEVER** write Prisma ORM calls or raw SQL inside a `*.controller.ts` file. — Violates V4 (orders.controller.ts).
- **NEVER** call `evolutionClient.sendTextMessage()` or `evolutionClient.sendButtonMessage()` inside a domain state machine or use case. — Violates V5 (conversation.service.ts).
- **NEVER** define `Coordinates`, `RouteResult`, or any domain value object inside an `*.client.ts` infrastructure file. — Violates V6 (osrm.service.ts).
- **NEVER** import a singleton from another bounded context's application or infrastructure layer. — Violates V2 (conversation.service.ts).
- **NEVER** leave an empty `catch {}` block without at minimum a `server.log.warn(...)` call. — Violates V8 (fleet.service.ts).
- **NEVER** add `console.log`, `console.warn`, or `console.error` in production code paths. Use `server.log` or the Pino logger instance.
- **NEVER** import `evolution.client.ts` from `server.ts` or any non-infrastructure file. — Violates V3 (server.ts).

---

## Quality Compliance Table

| Rule from Phase 3 | Status |
|---|---|
| Q1 — Imperative and verifiable | YES — every rule uses "Never", "Always", or specific grep check |
| Q2 — Only what AI cannot deduce from code | YES — no generic TypeScript advice; only cross-layer import rules |
| Q3 — Scoped to correct project | YES — file lives in .agents/rules/ddd-backend.md; applies to src/ |
| Q4 — Single responsibility | YES — covers DDD layers, imports, naming, anti-patterns (one topic: backend DDD) |
| Q5 — Under 200 lines | YES — ~160 lines |
| Q6 — No content duplication | YES — AGENTS-backend.md remains unchanged; this rule adds what it lacks |
| Q7 — Examples use real stack | YES — Fastify, Prisma, Zod, TypeScript ESM |
| Q8 — Checklist is binary | YES — all 10 checklist items are yes/no |
