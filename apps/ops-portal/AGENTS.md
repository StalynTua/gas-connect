# AGENTS.md — ops-portal

> Sub-documento de [`../../AGENTS.md`](../../AGENTS.md). Lee primero el AGENTS.md raíz para la visión global del monorepo GasConnect Ibarra y las dependencias cruzadas entre los 3 proyectos.
> Read [CONSTRAINTS.md](../../CONSTRAINTS.md) before writing code. Do not weaken it to make a change pass.

## Propósito

Panel de operaciones (dashboard) para el equipo de despacho: muestra en tiempo (casi) real el estado de la flota de camiones de gas en un mapa, métricas operativas (KPIs), el estado de la conexión de WhatsApp/Evolution API, y un log de eventos de actividad (pedidos, despachos aceptados, alertas de stock bajo). No expone lógica de negocio propia: consume y visualiza datos que produce el backend.

## Skill-Driven Specialization (`agent-skills`)

Hereda el ciclo de vida y la constitución metodológica de [`../../AGENTS.md`](../../AGENTS.md). En este subproyecto aplican con especial rigor:

- **Optimización y Renderizado:** Invoca `performance-optimization` para evitar re-renderizados costosos de Leaflet durante el ciclo de polling de 5 segundos.
- **Frontend & UI Engineering:** Invoca `frontend-ui-engineering` para la jerarquía visual de métricas, estados de los camiones y feed de eventos.
- **Pruebas en Navegador:** Invoca `browser-testing-with-devtools` para monitorear el consumo de red del polling HTTP y verificar la correcta visualización de pines en el mapa.
- **Verificación de Compilación y Tipos:** `pnpm build` (`tsc && vite build`).
- **Arquitectura DDD de UI:** `App.tsx` debe limitarse a orquestar; el polling reside en `application/useFleetData.ts` y las llamadas HTTP en `infrastructure/fleet-api.client.ts`.

## Stack y versiones

Verificado en `apps/ops-portal/package.json`:

- Vite 5.4.10
- React 18.3.1 + react-dom 18.3.1
- TypeScript 5.6.3 (`strict: true`)
- Tailwind CSS 3.4.15
- Leaflet 1.9.4 + `@types/leaflet` 1.9.22 (mapa de flota)
- `centrifuge` 5.2.2 — presente como dependencia instalada en `package.json`, pero **no hay uso confirmado en `src/App.tsx`**: el indicador "Centrifugo v5: Conectado" del header es una etiqueta estática de UI, no el resultado de una suscripción realtime activa. No asumas que hay un cliente Centrifugo wireado sin verificarlo en el código antes de documentarlo como tal.
- `lucide-react`, `clsx`, `tailwind-merge` como utilidades de UI.
- Scripts disponibles: `dev`, `build` (`tsc && vite build`), `preview`. No hay scripts `test` ni `lint`.

## Arquitectura

- `src/App.tsx` es el único componente con estado: mantiene `trucks`, `metrics`, `events` y `selectedTruckId` en `useState`, y hace **polling HTTP por `fetch`** (no WebSocket/Centrifugo) cada 5s vía `setInterval` a tres endpoints REST del backend.
- Si una petición falla o no devuelve datos, el estado permanece en (o cae de vuelta a) los datos iniciales hardcodeados (`INITIAL_TRUCKS`, `INITIAL_EVENTS`), que sirven de fallback visual/demo.
- El renderizado es un árbol simple: `App` → `WhatsAppStatusCard`, `MetricsCards`, `LiveFleetMap` + `TrucksList` (selección de camión compartida vía `selectedTruckId`), `ActivityLog`.
- No hay routing, no hay store global externo (Zustand no está entre las dependencias de este subproyecto), y no hay lógica de negocio: los componentes son presentacionales y reciben datos por props desde `App.tsx`.

## Estructura de directorios

```
apps/ops-portal/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js / postcss.config.js
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx                     # estado + polling + layout
    ├── index.css
    └── components/
        ├── LiveFleetMap.tsx        # mapa Leaflet con pines de camiones
        ├── TrucksList.tsx          # lista lateral de camiones
        ├── MetricsCards.tsx        # tarjetas de KPIs
        ├── ActivityLog.tsx         # feed de eventos
        └── WhatsAppStatusCard.tsx  # estado de Evolution API / QR
```

## Mapa inicial del código (CodeGraph)

Obtenido con `codegraph explore "cabStore App.tsx LiveFleetMap MetricsCards WhatsAppStatusCard"` (ejecutado desde la raíz sobre el índice único) durante el discovery inicial, y confirmado por lectura directa de `src/App.tsx` en este step:

- `App.tsx` → `fetchFleetData()`: hace `Promise.all` de `fetch('/api/v1/fleet/status')`, `fetch('/api/v1/fleet/metrics')`, `fetch('/api/v1/fleet/events')`; se llama una vez al montar y luego cada **5000ms** vía `setInterval` (confirmado en línea, no solo por CodeGraph).
- `TruckPin` (tipo exportado por `LiveFleetMap.tsx`) es la forma de dato que consume tanto el mapa como `TrucksList.tsx`.
- `ActivityEvent` (tipo exportado por `ActivityLog.tsx`) es la forma de dato del feed de eventos.
- `WhatsAppStatusCard.tsx` no recibe props del polling anterior; gestiona su propio estado de vínculo con Evolution API (verificar su código si se va a modificar el flujo de WhatsApp).

Para re-explorar cualquiera de estos símbolos tras cambios: `codegraph explore "App.tsx fetchFleetData LiveFleetMap TrucksList ActivityLog WhatsAppStatusCard"` desde la raíz.

## Comandos

Ejecutar desde la raíz del monorepo:
- `pnpm --filter ops-portal dev` — servidor de desarrollo Vite.
- `pnpm --filter ops-portal build` — `tsc && vite build` (chequeo de tipos + build de producción, presupuesto ≤ 500 kB).
- `pnpm --filter ops-portal preview` — sirve el build de producción localmente.

O ejecutar desde `apps/ops-portal/`:
- `pnpm dev`, `pnpm build`, `pnpm preview`.

**Testing y Verificación:**
- La verificación mínima automatizada es `pnpm build` (`tsc && vite build`), que garantiza cero errores de TypeScript y cumplimiento del presupuesto de bundle.
- La lógica de transformación y hooks en `domain/` y `application/` debe mantenerse pura y desacoplada para facilitar tests unitarios.
- **Dependencias:** Nunca ejecutes `npm install`. Instala siempre desde la raíz con `pnpm --filter ops-portal add <paquete>`.

## Convenciones de código (Alineadas con DDD)

- TypeScript estricto (`strict: true`), consistente con todo el monorepo.
- Respeto riguroso a la arquitectura DDD en 4 capas (ver sección inferior):
  - Los tipos de dominio (`TruckPin`, `ActivityEvent`, `FleetMetrics`) viven exclusivamente en `src/domain/fleet-dashboard.types.ts`.
  - La lógica de polling y estado reactivo vive en hooks dentro de `src/application/` (`useFleetData.ts`).
  - Las peticiones HTTP viven en `src/infrastructure/` (`fleet-api.client.ts`, `whatsapp-api.client.ts`).
  - `App.tsx` y componentes de `src/presentation/` se mantienen presentacionales (props in, callbacks out, cero llamadas `fetch()` directas).
- Tailwind para estilos, con utilidades `clsx`/`tailwind-merge`.

## Exploración con CodeGraph

Se utiliza el índice único ubicado en la raíz (`.codegraph/`). Consulta [`../../AGENTS.md`](../../AGENTS.md) para la lista completa de comandos de la CLI.

Consultas específicas de este subproyecto:
- `codegraph explore "App.tsx fetchFleetData LiveFleetMap MetricsCards WhatsAppStatusCard ActivityLog TrucksList"` — mapea el flujo de polling y el árbol de componentes.
- `codegraph callers <símbolo de fleet.controller>` — evalúa si un cambio en `fleet.controller.ts` afecta los endpoints de este dashboard.
- `codegraph impact src/modules/fleet/fleet.controller.ts` — antes de modificar `fleet/status|metrics|events` en backend, confirma que ops-portal está protegido.

## Contexto de tareas (`tasks/`)

Este subproyecto no tiene un directorio de tareas independiente. Las tareas se gestionan de forma centralizada en `tasks/plan.md` y `tasks/todo.md` en la raíz del repositorio.

## Reglas para agentes

- No tocar `dist/` ni `node_modules/` de este subproyecto; son artefactos generados.
- Gestor de paquetes: Este monorepo usa **`pnpm`**. Nunca ejecutes `npm install` dentro de este subdirectorio.
- Este subproyecto depende estrictamente de los contratos REST del backend expuestos por el módulo `fleet` (`GET /api/v1/fleet/status`, `/fleet/metrics`, `/fleet/events`) y, para el estado de WhatsApp, del módulo `whatsapp`. Cualquier cambio en la forma de respuesta de esos endpoints en el backend rompe silenciosamente este dashboard (hay fallback a datos mock, así que los errores pueden no ser visibles de inmediato) — verifica el impacto con `codegraph impact` antes de mergear cambios del backend.
- No describas ni implementes una integración Centrifugo/WebSocket activa en este subproyecto basándote en el indicador visual del header: es una etiqueta estática hasta que el código muestre lo contrario. Si se implementa realtime real, actualiza esta sección y la de Arquitectura.
- No introduzcas Zustand ni otro store global sin verificar antes que sigue siendo verdad que `App.tsx` no lo usa.

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
