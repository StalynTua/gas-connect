# AGENTS.md — ops-portal

> Sub-document of [`../../AGENTS.md`](../../AGENTS.md). Read the root AGENTS.md first for the global monorepo overview and cross-dependencies between the 3 projects.
> Read [CONSTRAINTS.md](../../CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

## Purpose

Operations panel (dashboard) for the dispatch team: displays near real-time fleet status of gas trucks on a map, operational metrics (KPIs), WhatsApp/Evolution API connection state, and an activity event log (orders, accepted dispatches, low stock alerts). It does not contain its own business logic: it consumes and visualizes data produced by the backend.

## Skill-Driven Specialization (`agent-skills`)

Inherits the lifecycle and methodological constitution of [`../../AGENTS.md`](../../AGENTS.md). In this subproject, the following apply with particular rigor:

- **Optimization & Rendering:** Invoke `performance-optimization` to prevent costly Leaflet re-renders during state and real-time updates.
- **Frontend & UI Engineering:** Invoke `frontend-ui-engineering` for the visual hierarchy of metrics, truck statuses, and the event feed.
- **Browser Testing:** Invoke `browser-testing-with-devtools` to monitor network consumption and verify accurate marker placement on the map.
- **Build and Type Verification:** `pnpm build` (`tsc && vite build`).
- **UI DDD Architecture:** `App.tsx` must strictly orchestrate; data management resides in `application/useFleetDashboard.ts` and HTTP calls in `infrastructure/fleet-api.client.ts`.

## Stack and Versions

Verified in `apps/ops-portal/package.json`:

- Vite 5.4.10
- React 18.3.1 + react-dom 18.3.1
- TypeScript 5.6.3 (`strict: true`)
- Tailwind CSS 3.4.15
- Leaflet 1.9.4 + `@types/leaflet` 1.9.22 (fleet map)
- `centrifuge` 5.2.2 (real-time coordination with backend)
- `lucide-react`, `clsx`, `tailwind-merge` as UI utilities.
- Available scripts: `dev`, `build` (`tsc && vite build`), `preview`. No `test` or `lint` scripts.

## Architecture

- `src/App.tsx`: main presentation and layout orchestrator. Coordinates views, consumes `useFleetDashboard`, and passes data to presentational components.
- State and hooks live in `src/application/`: `useFleetDashboard.ts` and `useWhatsAppStatus.ts`.
- Infrastructure clients in `src/infrastructure/`: `fleet-api.client.ts`, `centrifugo.adapter.ts`, `whatsapp-api.client.ts`.
- Component tree: `App` → `WhatsAppStatusCard`, `MetricsCards`, `LiveFleetMap` + `TrucksList` (shared truck selection via `selectedTruckId`), `ActivityLog`.
- Components are strictly presentational and receive data through props.

## Directory Structure

```
apps/ops-portal/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js / postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── presentation/
        └── components/
            ├── LiveFleetMap.tsx
            ├── TrucksList.tsx
            ├── MetricsCards.tsx
            ├── ActivityLog.tsx
            └── WhatsAppStatusCard.tsx
```

## Initial Code Map (CodeGraph)

Verified with `codegraph explore "App.tsx LiveFleetMap MetricsCards WhatsAppStatusCard ActivityLog TrucksList"`:

- `App.tsx` coordinates `useFleetDashboard()` and views.
- `TruckPin` (exported from `domain/fleet-dashboard.types.ts`) is the data structure consumed by both the map and `TrucksList.tsx`.
- `ActivityEvent` (exported from `domain/fleet-dashboard.types.ts`) is the event feed data structure.
- `WhatsAppStatusCard.tsx` consumes status from `useWhatsAppStatus()`.

## Commands

Run from the monorepo root:
- `pnpm --filter ops-portal dev` — Vite dev server.
- `pnpm --filter ops-portal build` — `tsc && vite build` (type checking + production build, budget ≤ 500 kB).
- `pnpm --filter ops-portal preview` — preview the production build locally.

Or run from `apps/ops-portal/`:
- `pnpm dev`, `pnpm build`, `pnpm preview`.

**Testing and Verification:**
- Minimal automated verification is `pnpm build` (`tsc && vite build`), guaranteeing zero TypeScript errors and bundle budget compliance.
- Hook and transformation logic in `domain/` and `application/` should remain pure and decoupled.
- **Dependencies:** Never run `npm install`. Always install from root with `pnpm --filter ops-portal add <package>`.

## Code Conventions (Aligned with DDD)

- Strict TypeScript (`strict: true`), consistent with the entire monorepo.
- Strict adherence to the 4-layer DDD architecture (see section below):
  - Domain types (`TruckPin`, `ActivityEvent`, `FleetMetrics`) live exclusively in `src/domain/fleet-dashboard.types.ts`.
  - State and hooks live in `src/application/`.
  - HTTP and WebSocket requests live in `src/infrastructure/`.
  - `App.tsx` and presentation components remain purely presentational (props in, callbacks out, zero direct `fetch()` calls).
- Tailwind CSS for styling, using `clsx`/`tailwind-merge` utilities.

## Exploring with CodeGraph

Uses the single index located at root (`.codegraph/`). See [`../../AGENTS.md`](../../AGENTS.md) for the full CLI command reference.

Subproject-specific queries:
- `codegraph explore "App.tsx useFleetDashboard LiveFleetMap MetricsCards WhatsAppStatusCard ActivityLog TrucksList"`
- `codegraph impact src/modules/fleet/presentation/fleet.controller.ts` — verify ops-portal contracts before changing backend endpoints.

## Task Context (`tasks/`)

This subproject does not maintain an independent tasks directory. Tasks are managed centrally in `tasks/plan.md` and `tasks/todo.md` at the repository root.

## Rules for Agents

- Do not modify `dist/` or `node_modules/` in this subproject; they are generated artifacts.
- Package manager: This monorepo uses **`pnpm`**. Never execute `npm install`.
- This subproject depends strictly on backend REST and real-time contracts from the `fleet` and `whatsapp` modules. Verify cross-project impact with `codegraph impact` before merging backend changes.
- Do not introduce Zustand or another global store without verifying architecture alignment.

---

## DDD Architecture Rules

> Full architecture rationale: `docs/architecture/02-arquitectura-objetivo-frontends.md`.  
> These rules apply to all files under `apps/ops-portal/src/`.

### 1. Context and Layers

ops-portal has one bounded context: **FleetDashboard**. Source files are organized into four layers:

```
src/
  domain/        # TypeScript interfaces for fleet data and API response shapes — no I/O
  application/   # Custom hooks encapsulating polling logic and derived state — no fetch calls
  infrastructure/# API clients (fleet-api.client.ts, whatsapp-api.client.ts) — only fetch here
  presentation/  # React components — props in, events out; no API calls; no business logic
```

### 2. Mandatory Folder Structure

| What to add | Layer | File | Rule |
|---|---|---|---|
| New fleet data type (e.g., DispatchEvent) | domain | domain/fleet-dashboard.types.ts | Types only; no functions |
| New API response type | domain | domain/api-contracts.ts | Describes the exact shape returned by the backend |
| New polling data source | application | application/use-<feature>.ts | Custom hook; calls infrastructure through injected client |
| New backend endpoint call | infrastructure | infrastructure/fleet-api.client.ts or whatsapp-api.client.ts | Pure async functions; no React hooks |
| New widget / card | presentation | presentation/components/<Name>Card.tsx | Receives data via props; no fetch; no business logic |

### 3. Dependency Rules

```
presentation -> application (hooks) -> domain
infrastructure -> domain
```

- **presentation never imports infrastructure.** No `fetch` or direct API client calls in any component.
- **application hooks call infrastructure through typed client functions.** The hook receives the client as a parameter or imports it (no DI framework needed for this project size; keep it simple but consistent).
- **domain imports nothing** from any other layer.

```typescript
// CORRECT: component receives trucks as props, no fetch inside
export function TrucksList({ trucks }: { trucks: TruckPin[] }) { ... }

// WRONG: component calls fetch directly
export function TrucksList() {
  const [trucks, setTrucks] = useState([]);
  useEffect(() => { fetch('/api/v1/fleet/status').then(...) }, []); // FORBIDDEN in presentation/
}

// CORRECT: WhatsAppStatusCard receives status as prop
export function WhatsAppStatusCard({ status }: { status: WhatsAppStatus }) { ... }

// WRONG: component self-fetches
export function WhatsAppStatusCard() {
  // fetch('/api/v1/whatsapp/status') inside the component // FORBIDDEN
}
```

### 4. Cohesion Rules

- **All polling logic lives in `application/` custom hooks.** App.tsx consumes hooks; it does not contain `setInterval` or `fetch` directly.
- **Domain types are defined in `domain/fleet-dashboard.types.ts`**, not co-located with components. `TruckPin` and `ActivityEvent` must be imported from `domain/`, not from `components/`.
- **Fallback/initial data** (mock trucks, mock events) lives in `application/use-fleet-data.ts`, not in `App.tsx` as module-level constants.
- **`WhatsAppStatusCard`** receives all its data via props. Its QR-fetch and status-fetch behavior is moved to `infrastructure/whatsapp-api.client.ts` and driven by a `useWhatsAppStatus()` application hook.

### 5. Low-Coupling Rules

- **`App.tsx` renders layout and passes props.** It does not call `fetch`, does not contain `INITIAL_TRUCKS`, and does not manage polling intervals directly.
- **The API base URL is configured once** in each API client file. Do not hardcode `/api/v1/` paths in components or `App.tsx`.
- **`selectedTruckId` is the only piece of UI state allowed in `App.tsx`** (it is interaction state, not domain data). All domain data comes from hooks.

### 6. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Domain type file | kebab-case.types.ts | fleet-dashboard.types.ts, api-contracts.ts |
| Application hook | camelCase, use prefix | useFleetData.ts, useWhatsAppStatus.ts |
| Infrastructure client | kebab-case.client.ts | fleet-api.client.ts, whatsapp-api.client.ts |
| React component | PascalCase, role suffix | LiveFleetMap.tsx, MetricsCards.tsx, ActivityLog.tsx |
| Interface | I prefix + PascalCase | IFleetApiClient, IWhatsAppApiClient |

### 7. Pre-Commit Checklist

- [ ] New data types (fleet state, API responses) are defined in `domain/`, not in component files.
- [ ] No `fetch()` call exists in any `presentation/` file.
- [ ] No `setInterval` or polling logic exists in `App.tsx` or any component.
- [ ] `App.tsx` does not contain `INITIAL_TRUCKS` or `INITIAL_EVENTS` — fallback data is inside application hooks.
- [ ] `WhatsAppStatusCard` receives its data via props; no internal fetch.
- [ ] New backend endpoint calls are added to the corresponding infrastructure client file.
- [ ] Imported types in components come from `domain/`, not from sibling component files.
- [ ] No Zustand or new global state manager introduced without updating this file and AGENTS.md.

### 8. Explicit Prohibitions

- **NEVER** define `TruckPin`, `ActivityEvent`, `FleetMetrics`, or any fleet data type inside a component file.
- **NEVER** call `fetch()` inside a React component (`presentation/`). Move it to `infrastructure/`.
- **NEVER** put `setInterval` or polling logic in `App.tsx`. Move it to an `application/` hook.
- **NEVER** hardcode `INITIAL_TRUCKS` or `INITIAL_EVENTS` as module-level constants in `App.tsx`. Keep them in the hook.
- **NEVER** describe the "Centrifugo v5: Conectado" indicator as a real real-time connection unless a Centrifugo client is actually instantiated and subscribed in the code. That label is currently static HTML; treat it as such.
- **NEVER** import a component's prop type from another component file. All shared types live in `domain/`.
