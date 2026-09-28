# 01 — Current-state Analysis: ops-portal

Generated as part of the DDD architecture rule-generation workflow.

## 1. Stack

| Dimension | Detail |
|---|---|
| Build tool | Vite 5.4.10 |
| Framework | React 18.3.1 + React DOM 18.3.1 |
| Language | TypeScript 5.6.3, strict: true |
| Styling | Tailwind CSS 3.4.15, clsx, tailwind-merge |
| Map | Leaflet 1.9.4 + @types/leaflet 1.9.22 |
| Real-time | Centrifuge 5.2.2 (installed, label in header is STATIC UI, not a real connection) |
| Icons | lucide-react |
| Package manager | npm (install from apps/ops-portal/, not monorepo root) |
| Tests | None configured |
| Lint | None configured |

## 2. Current Folder Structure

```
apps/ops-portal/
  src/
    App.tsx                     # All state + HTTP polling + root layout
    main.tsx
    index.css
    components/
      LiveFleetMap.tsx          # Leaflet map with truck pins (TruckPin type exported here)
      TrucksList.tsx            # Sidebar truck list
      MetricsCards.tsx          # KPI cards
      ActivityLog.tsx           # Event feed (ActivityEvent type exported here)
      WhatsAppStatusCard.tsx    # WhatsApp/Evolution API status + QR
  index.html
  vite.config.ts
  tailwind.config.js
  tsconfig.json
```

Layer/responsibility per folder:

| Folder | Current role |
|---|---|
| src/App.tsx | All application state, HTTP polling logic, and root layout |
| src/components/ | Presentational components receiving all data via props |

## 3. Identifiable Business Domains

| Domain | Core responsibility | Key files |
|---|---|---|
| Fleet Visibility | Display real-time truck positions and stock on map | LiveFleetMap.tsx, TrucksList.tsx |
| Operations Metrics | Display daily KPIs (orders, sales, stock alerts) | MetricsCards.tsx |
| Activity Feed | Display recent events (orders, dispatches, alerts) | ActivityLog.tsx |
| WhatsApp Status | Display Evolution API connection status; show QR for pairing | WhatsAppStatusCard.tsx |
| Data Fetching | Poll backend 3 endpoints every 5s; pass data to components | App.tsx:112-152 |

## 4. Real Dependency Direction

```
App.tsx
  -> components/MetricsCards.tsx (props)
  -> components/LiveFleetMap.tsx (props + TruckPin type)
  -> components/TrucksList.tsx (props + TruckPin type)
  -> components/ActivityLog.tsx (props + ActivityEvent type)
  -> components/WhatsAppStatusCard.tsx (no props - self-contained)

components/LiveFleetMap.tsx
  -> (Leaflet via npm; exports TruckPin type)  [VIOLATION: domain type in UI component]

components/ActivityLog.tsx
  -> (exports ActivityEvent type)  [VIOLATION: domain type in UI component]

components/WhatsAppStatusCard.tsx
  -> (calls fetch('/api/v1/whatsapp/...') directly)  [VIOLATION: transport in UI component]

App.tsx
  -> (calls fetch('/api/v1/fleet/...') directly in fetchFleetData)  [VIOLATION: transport in root component]
```

## 5. Existing Conventions

| Convention | Description | Example |
|---|---|---|
| File naming | PascalCase for components | LiveFleetMap.tsx, MetricsCards.tsx, ActivityLog.tsx |
| Type co-location | Domain types defined inside the component that primarily uses them | TruckPin in LiveFleetMap.tsx:?, ActivityEvent in ActivityLog.tsx |
| Polling | setInterval in useEffect in App.tsx, 5000ms interval | App.tsx:148-152 |
| Fallback data | INITIAL_TRUCKS and INITIAL_EVENTS hardcoded in App.tsx | App.tsx:9-97 |
| No global store | All state in App.tsx via useState; no Zustand or equivalent | App.tsx:100-110 |
| Props-down | All data flows from App.tsx to components via props | App.tsx:200-221 |
| Tailwind | Utility-class styling throughout | App.tsx:155+ |
| No tests | No test runner configured in package.json | apps/ops-portal/package.json |

## 6. DDD / Cohesion / Coupling Violations

V1 - Domain types co-located with UI components
File: apps/ops-portal/src/components/LiveFleetMap.tsx, ActivityLog.tsx
TruckPin and ActivityEvent are domain types (they describe fleet state and business events) but are defined and exported from UI components. Other components must import types from sibling UI files.

V2 - All state and fetching in root component
File: apps/ops-portal/src/App.tsx:100-152
App.tsx maintains all state (trucks, metrics, events, selectedTruckId, loading) and all HTTP polling logic in one component. There is no data layer, no service layer, no separation between data acquisition and presentation.

V3 - HTTP calls in a UI component
File: apps/ops-portal/src/components/WhatsAppStatusCard.tsx
WhatsAppStatusCard makes its own fetch calls to /api/v1/whatsapp/* endpoints. This breaks the prop-down data flow pattern and introduces hidden data dependencies in a presentational component.

V4 - Hardcoded mock data as initial/fallback state
File: apps/ops-portal/src/App.tsx:9-97
INITIAL_TRUCKS and INITIAL_EVENTS with real pilot data (truck IDs, coordinates, driver names) are hardcoded in the root component. These are operational defaults, not test fixtures, and will diverge from the real fleet.

V5 - Static UI label masquerades as a real-time feature
File: apps/ops-portal/src/App.tsx:178
The "Centrifugo v5: Conectado" indicator with a pulsing green dot is static HTML; it has no connection to a real Centrifugo client. This is misleading and will cause confusion if real-time is ever implemented.

V6 - No centralized API configuration
File: apps/ops-portal/src/App.tsx:116-118
fetch('/api/v1/fleet/status') uses relative paths. No centralized API configuration, no environment variable for base URL.

## 7. Current AI Rules System

Same as backend: Antigravity/Claude-compatible AGENTS.md files.
- apps/ops-portal/AGENTS.md covers purpose, stack, architecture, directory, code map, commands, conventions, CodeGraph, task context, agent rules (in Spanish).
- No Cursor, no Copilot config, no .claude/ directory.

## 8. Current AGENTS.md Content Summary (ops-portal)

apps/ops-portal/AGENTS.md (104 lines, 8.2 KB, in Spanish):
- Architecture coverage: "App.tsx is the only stateful component", "components are presentational", "no external store (no Zustand)". No layer definitions, no import rules, no DDD patterns.
- Agent rules: no dist/node_modules edits, install from subproject dir, REST endpoint contracts listed, don't implement Centrifugo without verifying in code, don't add Zustand without justification.
- Gap: no rules about where to add new data sources, new API endpoints, or new UI sections. No prohibition on adding fetch calls inside components.
