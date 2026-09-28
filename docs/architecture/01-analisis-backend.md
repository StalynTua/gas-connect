# 01 — Current-state Analysis: Backend API

Generated as part of the DDD architecture rule-generation workflow.

## 1. Stack

| Dimension | Detail |
|---|---|
| Runtime | Node.js >= 20 |
| Language | TypeScript 5.6.3, strict: true, ESM with .js imports, NodeNext resolution |
| HTTP framework | Fastify 4.28.1 |
| ORM / DB | Prisma 5.22.0 + PostgreSQL + PostGIS |
| Routing engine | OSRM via HTTP (routing/osrm.service.ts) |
| Queue / timers | BullMQ 5.21.2 + ioredis 5.4.1 (installed, not yet wired) |
| Real-time | Centrifuge 5.2.2 (installed, not yet wired) |
| Validation | Zod 3.23.8 (installed, not used in any controller) |
| Logging | Pino (built into Fastify), pino-pretty in dev |
| Test runner | Vitest 2.1.4 |
| Linter | ESLint on src/ |
| Package manager | npm |
| Entry point | src/server.ts -> buildServer() |

## 2. Current Folder Structure

```
src/
  server.ts                     # Fastify app factory + startup
  lib/
    prisma.ts                   # PrismaClient singleton
  modules/
    whatsapp/
      webhook.controller.ts     # HTTP routes (status, QR, setup, logout, webhook)
      conversation.service.ts   # Stateful dialog state machine
      evolution.client.ts       # HTTP adapter for Evolution API v2
      order-notifier.service.ts
      templates.ts
      dialog-states.ts          # DialogStep + UserSession types
    dispatch/
      dispatch-orchestrator.service.ts  # 45s cascade, in-memory session map
      truck-finder.service.ts           # PostGIS candidate query + OSRM enrichment
    routing/
      osrm.service.ts           # OSRM HTTP client + Haversine fallback
    fleet/
      fleet.controller.ts
      fleet.service.ts          # Status, metrics, events + in-memory fallback
    orders/
      orders.controller.ts      # decision, complete, telemetry endpoints
prisma/                         # schema.prisma, migrations/, seed.ts
tests/
  server.test.ts
  prisma-schema.test.ts
  unit/                         # 7 unit-test files
scripts/
.junie/plans/                   # JetBrains AI planning files
```

Layer/responsibility per folder:

| Folder | Current role |
|---|---|
| src/server.ts | Application assembly, plugin registration, route mounting |
| src/lib/ | Cross-cutting infrastructure singletons |
| src/modules/whatsapp/ | Presentation + Application (state machine) + Infrastructure (Evolution API) |
| src/modules/dispatch/ | Application (orchestration) + Infrastructure (PostGIS, OSRM) |
| src/modules/routing/ | Infrastructure (OSRM HTTP wrapper) |
| src/modules/fleet/ | Presentation + Application (metrics aggregation) + Infrastructure (Prisma) |
| src/modules/orders/ | Presentation + Application logic + Infrastructure (Prisma) |

## 3. Identifiable Business Domains

| Domain | Core responsibility | Key files |
|---|---|---|
| Order Reception | Receive gas order via WhatsApp, drive customer dialog | conversation.service.ts, dialog-states.ts |
| Messaging | Send/receive messages through Evolution API | evolution.client.ts, webhook.controller.ts |
| Dispatch | Find best truck candidate and run 45s offer cascade | dispatch-orchestrator.service.ts, truck-finder.service.ts |
| Routing | Calculate road distance and ETA | osrm.service.ts |
| Fleet Monitoring | Expose truck positions, stock, KPIs to ops portal | fleet.service.ts, fleet.controller.ts |
| Order Lifecycle | Accept/reject decisions, complete deliveries, receive telemetry | orders.controller.ts |

## 4. Real Dependency Direction

```
server.ts
  -> orders/orders.controller.ts
  -> whatsapp/webhook.controller.ts
  -> fleet/fleet.controller.ts
  -> whatsapp/evolution.client.ts        [VIOLATION: infra in entry point]

orders/orders.controller.ts
  -> dispatch/dispatch-orchestrator.service.ts
  -> lib/prisma.ts

whatsapp/webhook.controller.ts
  -> whatsapp/conversation.service.ts
  -> whatsapp/evolution.client.ts

whatsapp/conversation.service.ts
  -> whatsapp/dialog-states.ts
  -> whatsapp/evolution.client.ts                    [VIOLATION: domain calls infra directly]
  -> dispatch/dispatch-orchestrator.service.ts       [VIOLATION: cross-context direct import]
  -> dispatch/truck-finder.service.ts (type only)   [VIOLATION: cross-context type leak]
  -> routing/osrm.service.ts (Coordinates type only)

dispatch/dispatch-orchestrator.service.ts
  -> dispatch/truck-finder.service.ts
  -> routing/osrm.service.ts (Coordinates type only)

dispatch/truck-finder.service.ts
  -> lib/prisma.ts              [VIOLATION: service imports ORM directly]
  -> routing/osrm.service.ts

fleet/fleet.controller.ts
  -> fleet/fleet.service.ts

fleet/fleet.service.ts
  -> lib/prisma.ts

routing/osrm.service.ts
  -> (leaf node, no internal imports)
```

## 5. Existing Conventions

| Convention | Description | Example |
|---|---|---|
| File naming | domain.role.ts | dispatch-orchestrator.service.ts, webhook.controller.ts |
| Class naming | PascalCase, suffix matches role | DispatchOrchestratorService, FleetService |
| Singleton exports | Module-level const after class | export const dispatchOrchestrator = new DispatchOrchestratorService() |
| HTTP routes | Grouped in *.controller.ts, registered with server.register() | src/modules/orders/orders.controller.ts |
| Error handling | Silent catch{} with in-memory fallbacks; no error middleware | fleet.service.ts:127, orders.controller.ts:151 |
| Data access | Prisma ORM directly in service files; raw SQL for PostGIS | truck-finder.service.ts:43, orders.controller.ts:95 |
| Validation | Manual if(!x) guards inside HTTP handlers; no Zod schemas | orders.controller.ts:24 |
| Tests | tests/unit/ for unit tests, tests/ for integration; Vitest | tests/unit/dispatch-orchestrator.test.ts |
| Logging | console.log/warn/error mixed with Pino; inconsistent | server.ts:67, orders.controller.ts:152 |
| ESM imports | .js extension on all local imports | import { prisma } from '../../lib/prisma.js' |

## 6. DDD / Cohesion / Coupling Violations

V1 - Service directly calls ORM (missing Repository abstraction)
File: src/modules/dispatch/truck-finder.service.ts:1,43
TruckFinderService directly imports prisma and executes $queryRawUnsafe. Domain candidate filtering is tangled with SQL generation.

V2 - Service layer couples two bounded contexts directly
File: src/modules/whatsapp/conversation.service.ts:3-4
ConversationService imports dispatchOrchestrator and CandidateTruck type from the Dispatch context. Cross-context communication via direct import, not domain events.

V3 - Infrastructure client called from app entry point
File: src/server.ts:8,70-79
evolutionClient is imported and called directly in start(). Infrastructure concern leaks into the composition root.

V4 - Controller contains all persistence logic (no use-case layer)
File: src/modules/orders/orders.controller.ts:31-106
The /api/v1/orders/complete handler directly executes prisma.truck.findUnique, prisma.$executeRawUnsafe, and prisma.$transaction. Business rules live inside the HTTP handler.

V5 - Dialog state machine directly calls messaging infrastructure
File: src/modules/whatsapp/conversation.service.ts:52-175
ConversationService.processInboundMessage() calls evolutionClient.sendTextMessage() inside domain logic. Domain state progression coupled to the messaging adapter.

V6 - Domain types defined inside an infrastructure file
File: src/modules/routing/osrm.service.ts:1-4
Coordinates and RouteResult are domain value objects defined inside the OSRM adapter. Other modules must import from the infrastructure layer.

V7 - No input validation layer; guards embedded in HTTP handlers
File: src/modules/orders/orders.controller.ts:24-26
Validation uses manual if (!orderId || !truckId || !decision) checks inside HTTP handlers.

V8 - Silent catch-all swallows errors and breaks observability
File: src/modules/fleet/fleet.service.ts:127, orders.controller.ts:151
Multiple empty catch{} blocks silently fall back to mock data without logging.

## 7. Current AI Rules System

| Tool | Config files | Format | Loading scope | Notes |
|---|---|---|---|---|
| Antigravity/Claude-compatible | AGENTS.md, AGENTS-backend.md, apps/*/AGENTS.md | Plain Markdown, no frontmatter | All AGENTS.md in path read at session start | Primary system |
| JetBrains AI (Junie) | .junie/plans/ | Plan JSON files | On demand | Planning artifacts only |

## 8. Current AGENTS.md Content Summary

Root AGENTS.md (66 lines): monorepo description, endpoint cross-dependencies, 5-item shared conventions, CodeGraph usage, task context. No DDD content.

AGENTS-backend.md (114 lines): stack, directory tree, code map, commands, code conventions, CodeGraph examples, 7 agent rules (migration protection, .env, REST contract stability, no new Prisma singletons, 45s timeout invariant). No DDD layers or import rules.

apps/cab-pwa/AGENTS.md (107 lines): purpose, stack, architecture, directory, code map, commands, conventions, rules (no dist edits, REST dependencies, Centrifugo not assumed wired). No DDD.

apps/ops-portal/AGENTS.md (104 lines, in Spanish): similar to cab-pwa. All state in App.tsx, presentational components. No DDD.

Overall gap: None of the four files define layer boundaries, dependency rules, aggregate boundaries, or DDD tactical patterns. They document what exists but not the rules for adding new code.
