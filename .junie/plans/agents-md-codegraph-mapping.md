---
sessionId: session-260928-003830-mgpy
---

# Discovery Findings (Phase 1)

### Project table

| Proyecto | Ruta | Stack | Propósito | Puntos de entrada | Comandos clave |
|---|---|---|---|---|---|
| Backend API | `/` (raíz) | Fastify 4 + TypeScript 5.6 + Prisma 5 + PostgreSQL/PostGIS + Centrifugo + BullMQ/Redis | Monolito que recibe pedidos por WhatsApp (Evolution API), busca el camión más cercano (PostGIS + OSRM) y orquesta el despacho con timeout de 45s | `src/server.ts` (`buildServer()`), `src/modules/whatsapp/webhook.controller.ts`, `src/modules/orders/orders.controller.ts`, `src/modules/fleet/fleet.controller.ts` | `npm install`, `npm run dev`, `npm run build`, `npm test` (vitest), `npm run lint` (eslint src) |
| cab-pwa | `apps/cab-pwa/` | Vite + React 18 + TS + Tailwind + Zustand + vite-plugin-pwa | PWA de cabina para el ayudante del camión: recibe ofertas de despacho, alarma sonora, navegación 1-toque | `apps/cab-pwa/src/App.tsx`, `apps/cab-pwa/src/stores/cabStore.ts` | `npm install` (en `apps/cab-pwa`), `npm run dev`, `npm run build` (tsc + vite build). Sin test ni lint configurados |
| ops-portal | `apps/ops-portal/` | Vite + React 18 + TS + Tailwind + Leaflet | Panel de operaciones con mapa en vivo de la flota, métricas y estado de WhatsApp, vía polling REST | `apps/ops-portal/src/App.tsx` | `npm install` (en `apps/ops-portal`), `npm run dev`, `npm run build`. Sin test ni lint configurados |

### Consultas de CodeGraph ejecutadas
- `codegraph status` (raíz) → índice único, 51 archivos, 299 nodos, 564 edges, up to date, cubre los 3 proyectos (30 `.ts` + 12 `.tsx`).
- `codegraph_explore` sobre backend (webhook controller, conversation service, dispatch orchestrator, truck finder, osrm service, fleet/orders controllers, `server.ts`) → confirmó wiring de rutas en `buildServer()`, cascada de 45s en `dispatch-orchestrator.service.ts`, filtrado de camiones por radio/ETA en `truck-finder.service.ts`, blast radius de `ConversationService`/`TruckFinderService`/`OrderNotifierService`.
- `codegraph_explore` sobre cab-pwa (`cabStore.ts`: `acceptOffer`, `rejectOffer`, `completeDelivery`, `sendTelemetry`, `syncWithBackend`) y ops-portal (`App.tsx`, `LiveFleetMap`, `MetricsCards`, `WhatsAppStatusCard`) → confirmó polling cada 5s en ops-portal y telemetría cada 15s en cab-pwa, y los renders dinámicos `App → MetricsCards/LiveFleetMap/WhatsAppStatusCard`.
- `codegraph --help` → subcomandos reales: `init`, `index`, `sync`, `status`, `query`, `explore`, `context`, `node`, `files`, `callers`, `callees`, `impact`, `affected`. **Los comandos `deps`/`usages`/`symbols` que aparecen en el borrador dentro del README no existen** en la versión instalada — deben corregirse en los AGENTS.md finales.

### `.task/` no existe — hallazgo importante
El repo **no tiene un directorio `.task/`**. Las tareas viven en `tasks/` (raíz): `tasks/plan.md` (especificación completa, 5 fases/15 tareas, criterios de aceptación) y `tasks/todo.md` (checklist `[x]`/`[ ]`, las 15 tareas están marcadas completas). Los AGENTS.md deben documentar `tasks/`, no `.task/`.

### Nota sobre el README
El `README.md` adjunto ya contiene, al final, un borrador completo de `AGENTS.md` raíz con comandos de CodeGraph inventados (`codegraph deps`, `codegraph usages`, `codegraph symbols`) que no existen en la CLI real, y referencia `.task/` en vez de `tasks/`. Ese borrador no está guardado como archivo `AGENTS.md` real — es contenido descriptivo dentro del README que debe usarse solo como referencia de estructura/tono, corrigiendo comandos y rutas erróneas.

# CodeGraph Decision (Phase 2)

### Recomendación
**Un solo índice de CodeGraph en la raíz** (ya existente en `.codegraph/codegraph.db`), en lugar de un índice por proyecto.

### Justificación (basada en lo observado)
- `codegraph status` mostró que el índice raíz ya cubre los 51 archivos de los 3 proyectos (backend `src/`, `apps/cab-pwa/src/`, `apps/ops-portal/src/`) con solo 1.05 MB y está `up to date` — no hay indicios de que el tamaño o el tiempo de indexado sean un problema a esta escala.
- Las dependencias cruzadas son el caso de uso principal: los endpoints del backend (`/api/v1/dispatch/decision`, `/api/v1/orders/complete`, `/api/v1/fleet/status`, etc.) son consumidos directamente por `cabStore.ts` y `App.tsx` de ambos frontends. Un índice único permite ejecutar `codegraph explore`/`impact` sobre un endpoint del backend y ver de inmediato qué archivos de los frontends lo consumen (como se verificó en la Fase 1), sin tener que consultar 3 índices por separado.
- El repo es pequeño (51 archivos, 3 proyectos) y no hay señales de ruido excesivo en los resultados de las consultas ejecutadas.
- Un índice por proyecto complicaría el enrutamiento del agente (¿desde qué subcarpeta ejecutar `codegraph`?) sin un beneficio claro de aislamiento, dado el tamaño actual.

### Comando a ejecutar
Ninguno — el índice raíz ya existe y está actualizado. Solo se documentará en los AGENTS.md que, cuando el código cambie, se debe correr `codegraph sync` (o `codegraph index` para una reconstrucción completa) desde la raíz. **No se ejecutará ningún `codegraph init`/`index` en esta tarea sin confirmación explícita.**

# Technical Design (Phase 3 — AGENTS.md content)

### Archivos a crear (ninguno existe todavía)
| Archivo | Contenido |
|---|---|
| `./AGENTS.md` | Visión global, mapa de 3 proyectos, relaciones cruzadas backend↔frontends, convenciones compartidas, uso de CodeGraph (índice único raíz) y de `tasks/` |
| `./AGENTS-backend.md` | Backend Fastify (raíz), siguiendo la plantilla completa |
| `apps/cab-pwa/AGENTS.md` | PWA de cabina, siguiendo la plantilla completa |
| `apps/ops-portal/AGENTS.md` | Panel de operaciones, siguiendo la plantilla completa |

### Plantilla por proyecto (todas las secciones obligatorias)
`Propósito`, `Stack y versiones`, `Arquitectura`, `Estructura de directorios`, `Mapa inicial del código (CodeGraph)`, `Comandos`, `Convenciones de código`, `Exploración con CodeGraph`, `Contexto de tareas (tasks/)`, `Reglas para agentes`.

Para **cab-pwa** y **ops-portal**, las secciones `Comandos` (test/lint) y `Contexto de tareas` deben decir explícitamente "No aplica" con motivo (ej.: "No hay suite de tests ni lint configurados en este subproyecto; usa `npm run build` como verificación mínima", "Las tareas se gestionan centralizadamente en `tasks/` en la raíz del repo, no hay tareas específicas de este subproyecto").

### Mapa inicial del código — contenido verificado con CodeGraph
- **Backend**: `src/server.ts:buildServer()` (entrada), `whatsapp/webhook.controller.ts` + `conversation.service.ts` (máquina de estados), `dispatch/truck-finder.service.ts` + `dispatch-orchestrator.service.ts` (búsqueda PostGIS + cascada 45s), `routing/osrm.service.ts` (ETA vial), `fleet/fleet.controller.ts`, `orders/orders.controller.ts`, `lib/prisma.ts` (singleton ORM).
- **cab-pwa**: `src/App.tsx` (switch `ActiveDeliveryView`/`IdleView`/`IncomingOrderModal`), `src/stores/cabStore.ts` (`acceptOffer`, `rejectOffer`, `completeDelivery`, `sendTelemetry` cada 15s, `syncWithBackend`).
- **ops-portal**: `src/App.tsx` (polling cada 5s a `/fleet/status`, `/fleet/metrics`, `/fleet/events`), `src/components/LiveFleetMap.tsx`, `MetricsCards.tsx`, `WhatsAppStatusCard.tsx`.
- Cada entrada citará la consulta de CodeGraph exacta usada para reproducirla (ej. `codegraph explore "dispatch-orchestrator truck-finder"`), reemplazando los comandos inexistentes (`deps`/`usages`/`symbols`) del borrador del README por los reales: `explore`, `query`, `node`, `callers`, `callees`, `impact`, `files`, `status`.

### Corrección respecto al borrador del README
El AGENTS.md raíz final documentará `tasks/` (no `.task/`) y los comandos reales de CodeGraph, corrigiendo ambos errores presentes en el borrador adjunto.

# Delivery Steps

### ✓ Step 1: Redactar AGENTS.md raíz con visión global y decisión de CodeGraph
Existe `./AGENTS.md` con la visión global del monorepo, el mapa de los 3 proyectos y sus relaciones, y la sección de CodeGraph con la decisión de índice único ya confirmada.

- Escribir sección de qué es el repo (resumen de arquitectura de GasConnect Ibarra) basada en `README.md`.
- Incluir tabla `proyecto | ruta | AGENTS.md` enlazando a `./AGENTS-backend.md`, `apps/cab-pwa/AGENTS.md`, `apps/ops-portal/AGENTS.md`.
- Documentar las dependencias cruzadas backend↔frontends verificadas con CodeGraph (endpoints `dispatch/decision`, `orders/complete`, `trucks/telemetry`, `fleet/status|metrics|events`).
- Escribir convenciones compartidas (TS estricto, imports ESM con `.js`, Node ≥20, singletons de servicio, Pino logging).
- Escribir la sección "Exploración con CodeGraph" con los comandos reales (`explore`, `query`, `node`, `callers`, `callees`, `impact`, `status`, `sync`) y ejemplos concretos de la Fase 1, indicando que se ejecuta desde la raíz sobre el índice único ya existente.
- Escribir la sección "Contexto de tareas" referenciando `tasks/plan.md` y `tasks/todo.md` (corrigiendo la referencia errónea a `.task/`).

### ✓ Step 2: Redactar AGENTS-backend.md para el backend Fastify
Existe `./AGENTS-backend.md` con las 10 secciones de la plantilla completas para el backend en la raíz.

- Completar `Propósito`, `Stack y versiones` (Fastify 4, TS 5.6, Prisma 5, PostgreSQL+PostGIS, Centrifugo, BullMQ/Redis) y `Arquitectura` (módulos `whatsapp`, `dispatch`, `routing`, `fleet`, `orders`, `lib/prisma.ts`).
- Completar `Estructura de directorios` a partir de `src/`.
- Completar `Mapa inicial del código` con los puntos de entrada y módulos verificados en la Fase 1 (`server.ts`, `webhook.controller.ts`, `conversation.service.ts`, `truck-finder.service.ts`, `dispatch-orchestrator.service.ts`, `osrm.service.ts`, `fleet.controller.ts`, `orders.controller.ts`), cada uno con su consulta de CodeGraph de referencia.
- Completar `Comandos` (`npm install`, `npm run dev`, `build`, `test`, `lint`, `prisma:generate/migrate/seed`).
- Completar `Convenciones de código`, `Exploración con CodeGraph` (ejemplos específicos del backend) y `Contexto de tareas (tasks/)`.
- Completar `Reglas para agentes`: qué no tocar (`prisma/migrations`, `.env`), dependencias con `cab-pwa`/`ops-portal` vía contratos REST.

### ✓ Step 3: Redactar AGENTS.md para cab-pwa
Existe `apps/cab-pwa/AGENTS.md` con las 10 secciones completas, marcando "No aplica" donde corresponda con motivo.

- Completar `Propósito` (PWA de cabina), `Stack y versiones` (Vite, React 18, TS, Tailwind, Zustand, vite-plugin-pwa), `Arquitectura` (App.tsx + cabStore.ts + componentes de vista).
- Completar `Estructura de directorios` y `Mapa inicial del código` con `App.tsx` y `cabStore.ts` (`acceptOffer`, `rejectOffer`, `completeDelivery`, `sendTelemetry`, `syncWithBackend`), citando la consulta de CodeGraph que los reveló.
- Completar `Comandos` (`npm install`, `dev`, `build`); marcar test y lint como "No aplica" con motivo (no configurados).
- Completar `Convenciones de código` (TS estricto, Zustand, Tailwind).
- Completar `Exploración con CodeGraph` con ejemplos de este subproyecto usando el índice único de la raíz.
- Completar `Contexto de tareas`: "No aplica" — las tareas se gestionan en `tasks/` en la raíz.
- Completar `Reglas para agentes`: dependencia estricta con los contratos REST del backend (`dispatch/decision`, `orders/complete`, `trucks/telemetry`, `fleet/status`).

### ✓ Step 4: Redactar AGENTS.md para ops-portal
Existe `apps/ops-portal/AGENTS.md` con las 10 secciones completas, marcando "No aplica" donde corresponda con motivo.

- Completar `Propósito` (panel de operaciones), `Stack y versiones` (Vite, React 18, TS, Tailwind, Leaflet), `Arquitectura` (App.tsx con polling + componentes de dashboard).
- Completar `Estructura de directorios` y `Mapa inicial del código` con `App.tsx`, `LiveFleetMap.tsx`, `MetricsCards.tsx`, `WhatsAppStatusCard.tsx`, citando la consulta de CodeGraph correspondiente y los intervalos de polling verificados (5s).
- Completar `Comandos` (`npm install`, `dev`, `build`); marcar test y lint como "No aplica" con motivo.
- Completar `Convenciones de código` (TS estricto, Leaflet, Tailwind).
- Completar `Exploración con CodeGraph` con ejemplos de este subproyecto.
- Completar `Contexto de tareas`: "No aplica" — igual que cab-pwa.
- Completar `Reglas para agentes`: dependencia con `fleet/status|metrics|events` y `whatsapp/*` del backend.

### ✓ Step 5: Verificar todos los AGENTS.md
Todos los archivos, comandos y consultas citados en los 4 AGENTS.md quedan verificados como existentes/ejecutables, y los documentos se enlazan entre sí correctamente.

- Ejecutar `codegraph --help` y confirmar que cada comando citado en las secciones "Exploración con CodeGraph" existe en la versión instalada.
- Re-ejecutar al menos una consulta de CodeGraph por proyecto (backend, cab-pwa, ops-portal) y confirmar que coincide con lo escrito en "Mapa inicial del código".
- Verificar con listados (`ls`/lectura directa) que cada ruta y archivo citado existe (`src/modules/...`, `apps/cab-pwa/src/stores/cabStore.ts`, `apps/ops-portal/src/components/...`, `tasks/plan.md`, `tasks/todo.md`).
- Confirmar que `./AGENTS.md` enlaza a los 3 AGENTS.md de proyecto y que cada uno referencia de vuelta al AGENTS.md raíz.
- Entregar el resumen final: archivos creados, confirmación de que no se ejecutó ningún `codegraph init`/re-indexado, y cualquier dato que no se pudo verificar.