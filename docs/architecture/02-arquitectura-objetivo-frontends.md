# 02 — Target DDD Architecture: cab-pwa and ops-portal

Input: docs/architecture/01-analisis-cab-pwa.md, docs/architecture/01-analisis-ops-portal.md

Frontend DDD uses the same dependency inversion principle as the backend but with layer names adapted to the React/SPA context. Both frontends are read-heavy, event-driven UIs with no complex domain logic of their own — their "domain" is the UI state that mirrors backend concepts.

---

## Architecture Philosophy for React Frontends

Frontend DDD in this context means:
- **No business logic in UI components.** Components receive data via props or a typed store; they do not contain if/else business decisions.
- **No I/O in UI components.** API calls, timers, and browser APIs are isolated in service or hook layers.
- **Types are defined once.** Domain types (state shapes, API contracts) live in a dedicated types/domain file, not co-located with components.
- **State transitions are testable in isolation** from the framework.

The layer model for both frontends:

| Layer | Responsibility | Equivalent to |
|---|---|---|
| **domain** | TypeScript interfaces and types for state and API contracts | DDD domain (value objects, entity shapes) |
| **application** | State store, use-case actions, derived state | DDD application service / use case |
| **infrastructure** | API client (fetch wrapper), browser adapters (WakeLock, Audio) | DDD infrastructure / adapter |
| **presentation** | React components, layout, Tailwind styles | DDD presentation |

---

# A. cab-pwa — Target Architecture

## 1. Bounded Context

Single context: **CabOperation** — the cabin assistant's view of current truck state, incoming offers, and active deliveries.

## 2. Layers

```
apps/cab-pwa/src/
  domain/
    cab-state.types.ts      # CabState, ActiveOffer, CabStoreState interfaces
    api-contracts.ts        # Request/response types for all 3 backend endpoints
  application/
    cab-store.ts            # State machine + actions (no fetch calls inside)
    telemetry.scheduler.ts  # Encapsulates setInterval for telemetry
  infrastructure/
    cab-api.client.ts       # All fetch('/api/v1/...') calls for cab-pwa
    audio-alarm.ts          # (moved from lib/)
    use-wake-lock.ts        # (moved from hooks/)
  presentation/
    App.tsx                 # View orchestration only
    components/
      ActiveDeliveryView.tsx
      IdleView.tsx
      IncomingOrderModal.tsx
```

## 3. Folder Mapping: Current -> Target

| Current path | Target layer | Target path | Notes |
|---|---|---|---|
| src/stores/cabStore.ts (types) | domain | src/domain/cab-state.types.ts | ActiveOffer, CabState, CabStoreState interfaces extracted |
| src/stores/cabStore.ts (fetch calls) | infrastructure | src/infrastructure/cab-api.client.ts | acceptOffer API call, rejectOffer, completeDelivery, sendTelemetry, syncWithBackend |
| src/stores/cabStore.ts (state machine) | application | src/application/cab-store.ts | Pure state transitions; calls infrastructure through injected client |
| src/lib/audioAlarm.ts | infrastructure | src/infrastructure/audio-alarm.ts | Browser adapter, no domain logic |
| src/hooks/useWakeLock.ts | infrastructure | src/infrastructure/use-wake-lock.ts | Browser adapter |
| src/components/*.tsx | presentation | src/presentation/components/*.tsx | Pure props-in, events-out |
| src/App.tsx | presentation | src/presentation/App.tsx | View orchestration, no data fetching |

## 4. DDD Tactical Blocks

| Block | Definition | Example |
|---|---|---|
| Value Object | Immutable state shape | CabState ('IDLE' | 'OFFERED' | 'IN_TRANSIT' | 'RESTOCKING') |
| Entity | Stateful object with identity | ActiveOffer (identity = dispatchAttemptId + orderId) |
| Application Service | State store with typed actions | cab-store.ts (acceptOffer, rejectOffer, completeDelivery) |
| Port | Abstract API interface | ICabApiClient (interface describing all backend calls) |
| Adapter | Implements port using fetch | CabApiClient implements ICabApiClient |
| Domain Event | Browser/UI event to trigger behavior | Offer received -> audioAlarm.play() |

## 5. Dependency Rule Matrix

| From \ To | domain | application | infrastructure | presentation |
|---|---|---|---|---|
| **domain** | CAN | NO | NO | NO |
| **application** | CAN | CAN | NO (inject via interface) | NO |
| **infrastructure** | CAN | NO | CAN | NO |
| **presentation** | CAN | CAN | NO | CAN |

## 6. Cross-Context Communication

- cab-pwa has no internal cross-context communication. It has one context (CabOperation).
- All external communication is through CabApiClient (infrastructure) which implements ICabApiClient (domain port).
- The store (application) depends only on ICabApiClient, never on CabApiClient directly.

---

# B. ops-portal — Target Architecture

## 1. Bounded Context

Single context: **FleetDashboard** — the operations team's read-only view of fleet state, KPIs, events, and WhatsApp connection status.

## 2. Layers

```
apps/ops-portal/src/
  domain/
    fleet-dashboard.types.ts  # TruckPin, FleetMetrics, ActivityEvent, WhatsAppStatus types
    api-contracts.ts          # Response types for fleet/status, fleet/metrics, fleet/events, whatsapp/status
  application/
    fleet-store.ts            # useState-based or Zustand state; polling logic via useFleetData hook
    use-fleet-data.ts         # Custom hook encapsulating polling + data transformation
    use-whatsapp-status.ts    # Custom hook for WhatsApp status polling
  infrastructure/
    fleet-api.client.ts       # All fetch calls for fleet endpoints
    whatsapp-api.client.ts    # All fetch calls for whatsapp endpoints
  presentation/
    App.tsx                   # Root layout only; consumes hooks; passes data via props
    components/
      LiveFleetMap.tsx
      TrucksList.tsx
      MetricsCards.tsx
      ActivityLog.tsx
      WhatsAppStatusCard.tsx
```

## 3. Folder Mapping: Current -> Target

| Current path | Target layer | Target path | Notes |
|---|---|---|---|
| TruckPin (in LiveFleetMap.tsx) | domain | src/domain/fleet-dashboard.types.ts | Extracted from UI component |
| ActivityEvent (in ActivityLog.tsx) | domain | src/domain/fleet-dashboard.types.ts | Extracted from UI component |
| App.tsx fetchFleetData() | infrastructure | src/infrastructure/fleet-api.client.ts | Pure fetch functions, returns typed responses |
| App.tsx polling (setInterval) | application | src/application/use-fleet-data.ts | Custom hook: manages polling interval + state |
| WhatsAppStatusCard.tsx fetch calls | infrastructure | src/infrastructure/whatsapp-api.client.ts | Extracted from UI component |
| App.tsx useState blocks | application | src/application/use-fleet-data.ts | Managed in the hook |
| INITIAL_TRUCKS, INITIAL_EVENTS | application | src/application/use-fleet-data.ts | Fallback values in the hook, not in App.tsx |
| App.tsx + all components | presentation | src/presentation/ | Only props in, events out |

## 4. DDD Tactical Blocks

| Block | Definition | Example |
|---|---|---|
| Value Object | Immutable data shape | TruckPin, FleetMetrics, ActivityEvent |
| Read Model | Projection of backend state for display | FleetDashboard state (trucks + metrics + events combined) |
| Application Hook | Encapsulates polling and state | useFleetData(), useWhatsAppStatus() |
| Port | Abstract API interface | IFleetApiClient |
| Adapter | Implements port using fetch | FleetApiClient implements IFleetApiClient |

## 5. Dependency Rule Matrix

| From \ To | domain | application | infrastructure | presentation |
|---|---|---|---|---|
| **domain** | CAN | NO | NO | NO |
| **application** | CAN | CAN | NO (inject) | NO |
| **infrastructure** | CAN | NO | CAN | NO |
| **presentation** | CAN | CAN | NO | CAN |

## 6. Cross-Context Communication

- ops-portal has no internal cross-context communication. It has one context (FleetDashboard).
- WhatsAppStatusCard was previously self-fetching; in the target it receives status as props from App.tsx, which gets it from useWhatsAppStatus() hook backed by WhatsAppApiClient.
- All external communication through typed API clients that implement domain port interfaces.
