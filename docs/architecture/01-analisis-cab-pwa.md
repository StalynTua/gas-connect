# 01 — Current-state Analysis: cab-pwa

Generated as part of the DDD architecture rule-generation workflow.

## 1. Stack

| Dimension | Detail |
|---|---|
| Build tool | Vite 5.4.10 |
| Framework | React 18.3.1 + React DOM 18.3.1 |
| Language | TypeScript 5.6.3, strict: true |
| Styling | Tailwind CSS 3.4.15, tailwind-merge, clsx |
| State | Custom reactive micro-store (useSyncExternalStore in cabStore.ts) |
| Real-time | Centrifuge 5.2.2 (installed, NOT wired in src/ as of analysis) |
| PWA | vite-plugin-pwa 0.20.5 |
| Icons | lucide-react |
| Package manager | npm (install from apps/cab-pwa/, not monorepo root) |
| Tests | None configured |
| Lint | None configured |

## 2. Current Folder Structure

```
apps/cab-pwa/
  src/
    App.tsx                   # Root: view switch based on store state
    main.tsx                  # React entry point
    index.css
    components/
      ActiveDeliveryView.tsx  # UI for active delivery
      IdleView.tsx            # UI when no active offer
      IncomingOrderModal.tsx  # UI for incoming dispatch offer
    hooks/
      useWakeLock.ts          # Screen wake lock during delivery
    lib/
      audioAlarm.ts           # Audio alarm on offer received
    stores/
      cabStore.ts             # All business state + API actions
  public/
  index.html
  vite.config.ts
  tailwind.config.js
  tsconfig.json
```

Layer/responsibility per folder:

| Folder | Current role |
|---|---|
| src/App.tsx | Root component, view orchestration based on cab state |
| src/components/ | Presentational views (receive data via store hook) |
| src/hooks/ | Browser-specific side-effect hooks (WakeLock API) |
| src/lib/ | Utility modules (audio alarm) |
| src/stores/ | Business logic + HTTP API calls + reactive state |

## 3. Identifiable Business Domains

| Domain | Core responsibility | Key files |
|---|---|---|
| Cab State | Current truck state: IDLE, OFFERED, IN_TRANSIT, RESTOCKING | cabStore.ts (CabState type) |
| Dispatch Offer | Receive, accept, reject a dispatch offer from the backend | cabStore.ts (receiveOffer, acceptOffer, rejectOffer) |
| Delivery | Mark delivery complete, update stock | cabStore.ts (completeDelivery, decrementStock) |
| Telemetry | Send truck position and stock every 15s to backend | cabStore.ts (sendTelemetry), App.tsx:18 |
| Screen Management | Keep screen on during active delivery | hooks/useWakeLock.ts |
| Alert | Sound alarm when an offer arrives | lib/audioAlarm.ts |

## 4. Real Dependency Direction

```
App.tsx
  -> stores/cabStore.ts (useCabStore hook)
  -> hooks/useWakeLock.ts
  -> components/IdleView.tsx
  -> components/ActiveDeliveryView.tsx
  -> components/IncomingOrderModal.tsx

components/ActiveDeliveryView.tsx
  -> stores/cabStore.ts (useCabStore)

components/IdleView.tsx
  -> stores/cabStore.ts (useCabStore)

components/IncomingOrderModal.tsx
  -> stores/cabStore.ts (useCabStore)
  -> lib/audioAlarm.ts

stores/cabStore.ts
  -> (no internal imports; calls fetch('/api/v1/...') directly)  [VIOLATION: infra in store]

hooks/useWakeLock.ts
  -> (no internal imports; calls browser WakeLock API directly)

lib/audioAlarm.ts
  -> (no internal imports; calls Web Audio API directly)
```

## 5. Existing Conventions

| Convention | Description | Example |
|---|---|---|
| File naming | PascalCase for components, camelCase for non-components | ActiveDeliveryView.tsx, cabStore.ts, useWakeLock.ts |
| Component naming | PascalCase, descriptive (role + View/Modal pattern) | ActiveDeliveryView, IncomingOrderModal, IdleView |
| State management | Single store (cabStore.ts); components never hold business state | cabStore.ts:83-252 |
| API calls | fetch() calls made directly inside store action closures | cabStore.ts:121, :148, :181, :237 |
| Hardcoded defaults | truckId, licensePlate, helperName initialized with static pilot values | cabStore.ts:84-86 |
| Tailwind | Utility-class styling; clsx/tailwind-merge available | App.tsx:26 |
| No tests | No test runner configured in package.json | apps/cab-pwa/package.json |

## 6. DDD / Cohesion / Coupling Violations

V1 - Store contains infrastructure (HTTP calls) mixed with domain state
File: apps/cab-pwa/src/stores/cabStore.ts:121,148,181,237
acceptOffer(), rejectOffer(), completeDelivery(), and sendTelemetry() call fetch('/api/v1/...') directly inside the store definition. There is no API client or service layer; transport is mixed with business state.

V2 - Hardcoded pilot data in domain state initialization
File: apps/cab-pwa/src/stores/cabStore.ts:84-86
truckId: 'truck-ceibos-1', licensePlate: 'IAA-1041', helperName: 'Luis Muenala' are hardcoded as initial state. These are operational values, not defaults, and make the store dependent on deployment-specific data.

V3 - No separation between application logic and state
File: apps/cab-pwa/src/stores/cabStore.ts
The entire application: state shape, state transitions, API calls, and stock arithmetic are all in one 254-line file. There is no separation between what the app knows (state), what it does (use cases), and how it communicates (transport).

V4 - Components depend on store singleton directly (no interface boundary)
File: apps/cab-pwa/src/components/IncomingOrderModal.tsx, ActiveDeliveryView.tsx
Components import and call useCabStore() directly. If the store shape changes, all components break simultaneously with no interface boundary.

V5 - API base URL not configured; relative paths hardcoded
File: apps/cab-pwa/src/stores/cabStore.ts:121
fetch('/api/v1/dispatch/decision') uses a relative path. There is no centralized API configuration or environment variable for the base URL.

## 7. Current AI Rules System

Same as backend: Antigravity/Claude-compatible AGENTS.md files.
- apps/cab-pwa/AGENTS.md covers: purpose, stack, architecture, directory, code map, commands, code conventions, CodeGraph, task context, agent rules.
- No Cursor, no Copilot config, no .claude/ directory.

## 8. Current AGENTS.md Content Summary (cab-pwa)

apps/cab-pwa/AGENTS.md (107 lines, 6.1 KB):
- Architecture coverage: "business state centralized in cabStore.ts", "view components kept as presentational". No layer definitions, no import rules, no DDD tactical patterns.
- Agent rules: no dist/node_modules edits, REST contract dependencies listed, Centrifugo not assumed wired, install from subproject dir.
- Gap: no rules about where to add new state, new API calls, or new UI interactions. No prohibition on mixing transport into the store.
