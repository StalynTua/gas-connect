# 02 — Target DDD Architecture: Backend API

Input: docs/architecture/01-analisis-backend.md

---

## 1. Bounded Contexts

| Bounded Context | Responsibility | Current module mapping |
|---|---|---|
| **OrderReception** | Manages the WhatsApp dialog state machine to capture a gas order from a customer | src/modules/whatsapp/ (conversation.service.ts, dialog-states.ts) |
| **Dispatch** | Selects the optimal truck candidate and orchestrates the 45s exclusive offer cascade | src/modules/dispatch/ |
| **Routing** | Calculates road distance and driving ETA between geographic coordinates | src/modules/routing/ |
| **FleetMonitoring** | Aggregates and exposes fleet position, stock, and daily KPIs to the ops portal | src/modules/fleet/ |
| **OrderLifecycle** | Manages the lifecycle of an accepted order: decision persistence, delivery completion, truck telemetry | src/modules/orders/ |
| **Messaging** (shared kernel/infra) | Sends and receives messages over WhatsApp via the Evolution API adapter | src/modules/whatsapp/evolution.client.ts, webhook.controller.ts |

> Note: OrderReception and Messaging are currently co-located in src/modules/whatsapp/. They share a module boundary but have distinct responsibilities. Separating them into sub-folders is recommended but not required if file-naming keeps them distinct.

---

## 2. Layers per Bounded Context

The target uses a 4-layer DDD model per context. Shared infrastructure (Prisma, Redis) lives at the root infrastructure layer.

```
src/
  modules/
    <context>/
      domain/          # Entities, value objects, aggregates, domain services, domain events, repository INTERFACES
      application/     # Use cases, application services, DTOs (input/output contracts)
      infrastructure/  # Repository implementations, external HTTP clients, DB queries
      presentation/    # HTTP controllers, route handlers, request/response schemas (Zod)
  lib/
    prisma.ts          # Shared infrastructure singleton (remains here, injected into repos)
```

### What is allowed in each layer

| Layer | Allowed contents | Forbidden |
|---|---|---|
| **domain** | Interfaces (IRepository, IMessageSender), value objects (Coordinates, CylinderType, Quantity), domain types (DispatchSession, DialogStep, UserSession, CandidateTruck), pure functions (Haversine distance) | Prisma, fetch, Fastify, process.env, console |
| **application** | Use-case classes (StartDispatchUseCase, ProcessInboundMessageUseCase), DTOs, orchestration calls to domain interfaces | Prisma, fetch, Fastify, framework types |
| **infrastructure** | PrismaXxxRepository (implements IXxxRepository), EvolutionApiClient, OsrmHttpClient | Domain entities must not import from here |
| **presentation** | Fastify route handlers, Zod schemas, request/response mappers | Direct Prisma or HTTP client calls; business logic |

---

## 3. Folder Mapping: Current -> Target

| Current folder / file | Target layer | Target path | Notes |
|---|---|---|---|
| src/modules/whatsapp/dialog-states.ts | domain | src/modules/order-reception/domain/dialog-states.ts | UserSession, DialogStep are domain types |
| src/modules/whatsapp/conversation.service.ts | application | src/modules/order-reception/application/process-inbound-message.use-case.ts | Remove direct evolutionClient calls; inject IMessageSender |
| src/modules/whatsapp/order-notifier.service.ts | application | src/modules/order-reception/application/order-notifier.service.ts | Stays application; inject IMessageSender |
| src/modules/whatsapp/templates.ts | domain | src/modules/order-reception/domain/message-templates.ts | Pure string functions, no I/O |
| src/modules/whatsapp/evolution.client.ts | infrastructure | src/modules/order-reception/infrastructure/evolution-api.client.ts | Implements IMessageSender |
| src/modules/whatsapp/webhook.controller.ts | presentation | src/modules/order-reception/presentation/webhook.controller.ts | Stays presentation; calls use case |
| src/modules/dispatch/dispatch-orchestrator.service.ts | application | src/modules/dispatch/application/dispatch-orchestrator.service.ts | Inject ITruckRepository, IRoutingService |
| src/modules/dispatch/truck-finder.service.ts | application | src/modules/dispatch/application/truck-finder.service.ts | Extract SQL to infrastructure/prisma-truck.repository.ts |
| src/modules/routing/osrm.service.ts | infrastructure | src/modules/routing/infrastructure/osrm-http.client.ts | Rename; Coordinates moves to domain |
| Coordinates / RouteResult (in osrm.service.ts) | domain | src/modules/routing/domain/routing-types.ts | Value objects; extracted from infrastructure |
| src/modules/fleet/fleet.service.ts | application | src/modules/fleet/application/fleet-query.service.ts | Keep aggregation logic; inject IFleetRepository |
| src/modules/fleet/fleet.controller.ts | presentation | src/modules/fleet/presentation/fleet.controller.ts | Stays presentation |
| src/modules/orders/orders.controller.ts | split | presentation + application | Extract use cases: RecordDispatchDecision, CompleteDelivery, UpdateTelemetry |
| src/lib/prisma.ts | shared infrastructure | src/lib/prisma.ts | Keep as singleton; injected into repository implementations |

---

## 4. DDD Tactical Blocks and Their Layer

| Tactical block | Definition | Layer | Example in this project |
|---|---|---|---|
| Value Object | Immutable, no identity; equality by value | domain | Coordinates, CylinderType, Quantity, DispatchSessionStatus |
| Entity | Has identity; mutable over time | domain | UserSession (keyed by phoneNumber), DispatchSession (keyed by orderId) |
| Aggregate | Consistency boundary; one repository per aggregate | domain | DispatchSession (root), UserSession (root) |
| Repository Interface | Abstraction for persistence; domain owns the interface | domain | ITruckRepository, IFleetRepository |
| Repository Implementation | SQL/ORM code implementing the domain interface | infrastructure | PrismaTruckRepository, PrismaFleetRepository |
| Domain Service | Stateless logic that doesn't fit an entity | domain | candidate ranking/filtering logic |
| Application Service / Use Case | Orchestrates domain objects; one public operation per class | application | StartDispatchUseCase, ProcessInboundMessageUseCase, CompleteDeliveryUseCase |
| Domain Event | Describes something that happened; decouples contexts | domain | OrderReceived, DispatchOfferAccepted, DispatchExpired |
| Port (interface) | Defines what the application needs from outside | domain | IMessageSender, IRoutingService |
| Adapter | Implements a port; depends on external tech | infrastructure | EvolutionApiClient implements IMessageSender, OsrmHttpClient implements IRoutingService |

---

## 5. Dependency Rule Matrix

"CAN" = may import from. "NO" = import is forbidden.

| From \ To | domain | application | infrastructure | presentation | lib/ (shared) |
|---|---|---|---|---|---|
| **domain** | CAN | NO | NO | NO | NO |
| **application** | CAN | CAN | NO (inject only) | NO | NO |
| **infrastructure** | CAN | NO | CAN | NO | CAN (prisma.ts) |
| **presentation** | CAN | CAN | NO | CAN | NO |
| **lib/** | — | — | — | — | — (no imports) |
| **server.ts** | NO | NO | CAN (for DI wiring) | CAN | CAN |

> "inject only" means application services receive infrastructure implementations through constructor injection; they do not import the implementation files directly.

Key rules:
- Dependencies always point inward: presentation -> application -> domain. Infrastructure points inward too.
- Domain imports nothing from other layers or frameworks.
- server.ts (composition root) is the only file allowed to wire infrastructure into application use cases.
- Cross-context communication happens through domain events or explicit application-layer calls to ports, never through direct service imports.

---

## 6. Rules for Cross-Context Communication

1. **No direct service import across bounded contexts.** If OrderReception needs to trigger Dispatch, it emits an OrderReceived domain event or calls a port interface (e.g., IDispatchService). It does not import DispatchOrchestratorService directly.
2. **Types shared across contexts must live in a shared domain module** (e.g., src/shared/domain/coordinates.ts) or be duplicated with explicit mapping at the context boundary.
3. **Coordinates** is used by Routing, Dispatch, and OrderReception. It must move to src/shared/domain/coordinates.ts and be imported from there by all contexts.
4. **CandidateTruck** is a Dispatch domain type. If OrderReception needs it (currently for mockCandidates in tests), this coupling must be resolved: either CandidateTruck is part of a shared kernel, or the mock injection point is removed from InboundMessage interface.
5. **FleetMonitoring** does not send commands. It is a read-only projection context. No other context imports from fleet/.
6. **Messaging** (Evolution API client) is an infrastructure adapter. Any domain that needs to send messages depends on IMessageSender (domain port), not on EvolutionApiClient directly.
