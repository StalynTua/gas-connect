# AGENTS.md — cab-pwa

> See also: [`../../AGENTS.md`](../../AGENTS.md) (GasConnect Ibarra monorepo overview).
> Read [CONSTRAINTS.md](../../CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

## Purpose

Cabin PWA for the truck assistant. Receives dispatch offers in real time, alerts the assistant with an audio alarm, allows accepting/rejecting the offer with a tap, navigating to the destination, and marking the delivery as completed. Sends position telemetry periodically to the backend.

## Skill-Driven Specialization (`agent-skills`)

Inherits the lifecycle and methodological constitution of [`../../AGENTS.md`](../../AGENTS.md). In this subproject, the following apply with particular rigor:

- **Frontend & Mobile Accessibility:** Mandatorily invoke `frontend-ui-engineering` (WCAG 2.1 AA, high contrast for cabin daylight conditions, large touch targets, and 100% responsive layout for smartphone/tablet).
- **Browser Testing & Web APIs:** Invoke `browser-testing-with-devtools` to verify PWA lifecycle, Wake Lock API, Audio Alarm, and Geolocation API calls.
- **Build and Type Verification:** `pnpm build` (`tsc && vite build`).
- **UI DDD Architecture:** Strictly enforce layer separation: `presentation/` never calls `fetch()`, business logic resides in `application/cab-store.ts`, and HTTP requests live in `infrastructure/`.

## Stack and Versions

Verified in `apps/cab-pwa/package.json`:

- Vite 5.4.10
- React 18.3.1 + React DOM 18.3.1
- TypeScript 5.6.3
- Tailwind CSS 3.4.15 (+ `tailwind-merge`, `clsx`)
- Zustand 5.0.1 (installed dependency; not the state mechanism currently used by `cabStore.ts`)
- vite-plugin-pwa 0.20.5
- `centrifuge` 5.2.2 (installed dependency; integration point for real-time coordination, aligned with the framing used in the backend — do not assume it is already wired throughout `src/` without verifying first)
- `lucide-react` (iconography)

## Architecture

- `src/App.tsx`: root component that switches between the main views based on store state: `IdleView` (no active offer), `IncomingOrderModal` (incoming dispatch offer), `ActiveDeliveryView` (active delivery).
- `src/stores/cabStore.ts`: custom reactive micro-store based on `useSyncExternalStore`, containing the cabin business logic — actions (`acceptOffer`, `rejectOffer`, `completeDelivery`, `sendTelemetry`, `syncWithBackend`) and the current offer/delivery state.
- `src/hooks/useWakeLock.ts`: hook to keep the screen on during an active delivery.
- `src/lib/audioAlarm.ts`: audio alarm logic that sounds when an incoming offer is received.

## Directory Structure

```
apps/cab-pwa/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ActiveDeliveryView.tsx
│   │   ├── IdleView.tsx
│   │   └── IncomingOrderModal.tsx
│   ├── hooks/
│   │   └── useWakeLock.ts
│   ├── lib/
│   │   └── audioAlarm.ts
│   └── stores/
│       └── cabStore.ts
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

(`dist/` and `node_modules/` are generated; do not edit manually.)

## Initial Code Map (CodeGraph)

Verified with `codegraph explore "cabStore App.tsx ActiveDeliveryView IdleView IncomingOrderModal"` (run from the root on the single index):

- `App.tsx`: render switch between `IdleView` / `IncomingOrderModal` / `ActiveDeliveryView` based on state read from `cabStore`.
- `stores/cabStore.ts`:
  - `acceptOffer` — accepts the active dispatch offer (`POST /api/v1/dispatch/decision`).
  - `rejectOffer` — rejects the active offer (`POST /api/v1/dispatch/decision`).
  - `completeDelivery` — marks the delivery as completed (`POST /api/v1/orders/complete`).
  - `sendTelemetry` — sends the truck position every ~15s (`POST /api/v1/trucks/telemetry`, implemented in the backend `orders` module).
  - `syncWithBackend` — synchronizes/reconciles local state with the backend.

## Commands

Run from monorepo root:
- `pnpm --filter cab-pwa dev` — Vite development server.
- `pnpm --filter cab-pwa build` — `tsc && vite build` (type check and production bundle, budget ≤ 300 kB).
- `pnpm --filter cab-pwa preview` — serves production build locally.

Or run from `apps/cab-pwa/`:
- `pnpm dev`, `pnpm build`, `pnpm preview`.

**Testing & Verification:**
- Minimal verification is `pnpm build` (`tsc && vite build`), which checks types and confirms bundle budget.
- Logic in `domain/` and `application/` must be pure and decoupled so it can be unit-tested without browser dependencies.
- **Dependencies:** Never run `npm install`. Install from monorepo root via `pnpm --filter cab-pwa add <pkg>`.

## Code Conventions (DDD Aligned)

- Strict TypeScript (`strict: true`), consistent with the rest of the monorepo.
- Architecture adheres strictly to DDD layers (see section below):
  - Domain types and API contracts in `src/domain/`.
  - Application state and store in `src/application/cab-store.ts`.
  - HTTP requests and browser adapters strictly in `src/infrastructure/`.
  - View components in `src/presentation/` (props in, callbacks out, zero `fetch()`).
- Styling with Tailwind CSS; use `clsx`/`tailwind-merge` to combine conditional classes.

## Exploring with CodeGraph

The repository uses a single CodeGraph index at the root (`.codegraph/`). Consult [`../../AGENTS.md`](../../AGENTS.md) for the complete command reference.

Examples specific to this subproject:
- `codegraph explore "cabStore acceptOffer sendTelemetry syncWithBackend"` — maps store actions and REST calls.
- `codegraph callers cabStore.ts:acceptOffer` — finds which components invoke `acceptOffer`.
- `codegraph impact src/modules/dispatch/dispatch-orchestrator.service.ts` — before changing `/api/v1/dispatch/decision` in backend, confirms `cab-pwa` blast radius.

## Task Context (tasks/)

This subproject has no separate tasks directory. Monorepo tasks are managed centrally in `tasks/plan.md` and `tasks/todo.md` at the repo root.

## Rules for Agents

- Do not modify `dist/` or `node_modules/` (generated/installed).
- Gestor de paquetes: Este monorepo usa **`pnpm`**. Nunca ejecutes `npm install` dentro de este subdirectorio.
- This subproject strictly depends on the backend REST contracts: `POST /api/v1/dispatch/decision`, `POST /api/v1/orders/complete`, `POST /api/v1/trucks/telemetry` (backend `orders` module) and fleet state synchronization (`GET /api/v1/fleet/status` or equivalent used by `syncWithBackend`). Any changes to these contracts in the backend require updating `cabStore.ts` accordingly; use `codegraph impact` before changing the backend side.
- Do not assume real-time integrations (`centrifuge`) are already wired in `src/` without verifying in the current code — it is listed as an installed dependency, not confirmed as an active flow in this document.

---

## DDD Architecture Rules

> Full architecture rationale: `docs/architecture/02-arquitectura-objetivo-frontends.md`.  
> These rules apply to all files under `apps/cab-pwa/src/`.

### 1. Context and Layers

cab-pwa has one bounded context: **CabOperation**. Source files are organized into four layers:

```
src/
  domain/        # TypeScript interfaces and types for state and API contracts — no I/O
  application/   # State store (cab-store.ts) and use-case actions — no fetch calls
  infrastructure/# API client (fetch wrapper), browser adapters (audio, WakeLock)
  presentation/  # React components — props in, events out; no business logic
```

### 2. Mandatory Folder Structure

| What to add | Layer | File | Rule |
|---|---|---|---|
| New state shape or API contract type | domain | domain/cab-state.types.ts or domain/api-contracts.ts | Types only; no functions |
| New action (e.g., cancelOffer) | application | application/cab-store.ts | Calls infrastructure through injected client |
| New backend endpoint call | infrastructure | infrastructure/cab-api.client.ts | Never in a component or in the store directly |
| New browser adapter (e.g., Geolocation) | infrastructure | infrastructure/<feature>.adapter.ts | No React imports |
| New view / screen | presentation | presentation/components/<Name>View.tsx | Receives all data via props; reads store only via hook |

### 3. Dependency Rules

```
presentation -> application (useCabStore hook) -> domain
infrastructure -> domain
```

- **presentation never imports infrastructure.** No `fetch` or browser APIs directly in components.
- **application never imports infrastructure directly.** The store calls infrastructure through an injected `ICabApiClient` interface.
- **domain imports nothing** from application, infrastructure, or React.

```typescript
// CORRECT: store action calls API through injected client
acceptOffer: async () => {
  const result = await apiClient.postDispatchDecision({ orderId, truckId, decision: 'ACCEPTED' });
  // update state with result
}

// WRONG: store action calls fetch directly
acceptOffer: async () => {
  await fetch('/api/v1/dispatch/decision', { method: 'POST', ... }); // FORBIDDEN in application/
}
```

### 4. Cohesion Rules

- **All business state lives in `application/cab-store.ts`.** No component holds business state in `useState` except display-only flags (e.g., `isMenuOpen`).
- **One action per operation.** `acceptOffer`, `rejectOffer`, `completeDelivery`, `sendTelemetry`, `syncWithBackend` are separate named actions; do not merge them.
- **API types** (request/response shapes) are defined in `domain/api-contracts.ts` and used by both the store and the API client.

### 5. Low-Coupling Rules

- **Components depend on the store hook only, never on infrastructure.** A component that needs data calls `useCabStore()` or receives it as props.
- **The API base URL is configured in one place** (`infrastructure/cab-api.client.ts`). Do not hardcode `/api/v1/` paths in the store or components.
- **Hardcoded pilot values** (`truckId: 'truck-ceibos-1'`, `helperName: 'Luis Muenala'`) must be replaced with values loaded from `syncWithBackend()` at startup, not with static defaults in the store initializer.

### 6. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Domain type file | kebab-case.types.ts | cab-state.types.ts, api-contracts.ts |
| Application store | kebab-case.ts | cab-store.ts |
| Infrastructure client | kebab-case.client.ts | cab-api.client.ts |
| Infrastructure adapter | kebab-case.adapter.ts | audio-alarm.adapter.ts |
| React component | PascalCase, role suffix | ActiveDeliveryView.tsx, IncomingOrderModal.tsx |
| Custom hook | camelCase, use prefix | useWakeLock.ts |
| Interface | I prefix + PascalCase | ICabApiClient |

### 7. Pre-Commit Checklist

- [ ] New state types are defined in `domain/`, not inline in the store or component.
- [ ] No `fetch()` call exists in any `presentation/` or `application/` file.
- [ ] No business logic (if/else on domain state) exists in any `presentation/` component.
- [ ] Components receive all data via props or the `useCabStore()` hook — no local `useState` for domain data.
- [ ] New backend endpoints are defined in `infrastructure/cab-api.client.ts` and typed in `domain/api-contracts.ts`.
- [ ] No hardcoded truck IDs, plate numbers, or helper names in `presentation/` or `application/` files.
- [ ] The `ICabApiClient` interface is updated before adding a new method to `cab-api.client.ts`.
- [ ] `audioAlarm` and `useWakeLock` are imported from `infrastructure/` only by `application/` or `presentation/App.tsx` — never by a component directly.

### 8. Explicit Prohibitions

- **NEVER** call `fetch()` inside a React component (`presentation/`). Move it to `infrastructure/`.
- **NEVER** call `fetch()` directly inside `application/cab-store.ts` action closures. Use the injected `ICabApiClient`.
- **NEVER** define `TruckPin`, `ActiveOffer`, or API response shapes inside a component file.
- **NEVER** duplicate state already in the store with a local `useState`. Read it from `useCabStore()`.
- **NEVER** import `cab-api.client.ts` directly in `application/cab-store.ts`. Inject it as `ICabApiClient`.
