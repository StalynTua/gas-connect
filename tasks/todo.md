# GasConnect Ibarra: Task Checklist

## Phase 1: Core Data & Spatial Foundation (`core-data`)

- [x] **Task 1: Scaffolding del Monolito y Docker Compose para Entorno Local**
  - **Acceptance:** Fastify con TypeScript compila sin errores. `docker compose up -d` levanta Postgres con extensión PostGIS, Redis, Centrifugo y OSRM.
  - **Verify:** `npm run build && curl http://localhost:8000/api/health`
  - **Files:** `package.json`, `tsconfig.json`, `docker-compose.yml`, `src/server.ts`, `.env.example`
  - **Scope:** M

- [x] **Task 2: Esquema Relacional Prisma con Tipos Espaciales PostGIS**
  - **Acceptance:** Modelos creados (`Distributor`, `Truck`, `Customer`, `Order`, `DispatchAttempt`, `InventoryLog`) con soporte de coordenadas `Point(4326)`.
  - **Verify:** `npx prisma migrate dev --name init` ejecuta sin advertencias ni errores.
  - **Files:** `prisma/schema.prisma`, `prisma/migrations/*`, `src/lib/prisma.ts`
  - **Scope:** S

- [x] **Task 3: Seed Script con Cuadrícula de Calles y Camiones Piloto en Ibarra**
  - **Acceptance:** Inserta 1 distribuidor, 4 camiones piloto en Los Ceibos/Caranqui con 40 cilindros de stock inicial y logs de auditoría.
  - **Verify:** `npm run prisma:seed` inserta correctamente y una consulta SQL confirma las ubicaciones en Ibarra.
  - **Files:** `prisma/seed.ts`, `package.json`
  - **Scope:** S

### Checkpoint 1: Core Data Foundation
- [x] Base de datos PostgreSQL + PostGIS activa en Docker / configuración validada.
- [x] Esquema relacional migrado con índices GIST espaciales y modelos tipados.
- [x] Flota inicial en Ibarra cargada y verificada.

---

## Phase 2: Dispatch Engine & Routing (`dispatch-engine`)

- [x] **Task 4: Cliente de Integración con OSRM para Matriz de Distancia y ETA**
  - **Acceptance:** Función que consulta la API OSRM local y retorna distancia en metros y tiempo de manejo en segundos en < 10ms.
  - **Verify:** `npm test tests/unit/osrm.test.ts`
  - **Files:** `src/modules/routing/osrm.service.ts`, `tests/unit/osrm.test.ts`
  - **Scope:** S

- [x] **Task 5: Consulta Espacial PostGIS de Camiones Candidatos**
  - **Acceptance:** Consulta PostGIS `ST_DWithin` que filtra camiones en radio $\le 1.5\text{ km}$ con `stock >= cantidad_solicitada` y estado disponible.
  - **Verify:** `npm test tests/integration/truck-finder.test.ts`
  - **Files:** `src/modules/dispatch/truck-finder.service.ts`, `tests/integration/truck-finder.test.ts`
  - **Scope:** S

- [x] **Task 6: Orquestador de Despacho, Temporizador de 45s y Cascada de Ofertas**
  - **Acceptance:** Orquestador emite oferta al camión óptimo, temporiza 45s en BullMQ, y cascada al siguiente camión ante timeout o rechazo.
  - **Verify:** `npm test tests/unit/dispatch-orchestrator.test.ts`
  - **Files:** `src/modules/dispatch/dispatch-orchestrator.service.ts`, `src/queues/dispatch-timer.queue.ts`, `tests/unit/dispatch-orchestrator.test.ts`
  - **Scope:** M

### Checkpoint 2: Dispatch Engine Validated
- [x] Ruteo vehicular local con OSRM funcionando en sub-milisegundos.
- [x] Búsqueda espacial PostGIS de camiones con stock suficiente garantizada.
- [x] Cascada automática de ofertas a 45s verificada con tests.

---

## Phase 3: In-Cab Assistant PWA (`cab-pwa`)

- [x] **Task 7: Scaffolding de PWA Móvil con Vite + React + Tailwind + PWA Plugin**
  - **Acceptance:** App instalable en Android con modo `display: standalone`, manifest y diseño de alto contraste con botones táctiles $\ge 64\text{px}$.
  - **Verify:** `npm run build && npx lighthouse-ci` (PWA checks pasan).
  - **Files:** `apps/cab-pwa/package.json`, `apps/cab-pwa/vite.config.ts`, `apps/cab-pwa/index.html`, `apps/cab-pwa/src/App.tsx`
  - **Scope:** M

- [x] **Task 8: Conexión Centrifugo, Suscripción a Canal y Hook Screen Wake Lock**
  - **Acceptance:** PWA se suscribe al canal `truck:${truckId}` con JWT, recupera mensajes perdidos por desconexión y mantiene la pantalla encendida.
  - **Verify:** Test de reconexión manual en navegador tras 15 segundos sin conexión.
  - **Files:** `apps/cab-pwa/src/lib/centrifugo.ts`, `apps/cab-pwa/src/hooks/useWakeLock.ts`, `apps/cab-pwa/src/stores/cabStore.ts`
  - **Scope:** S

- [x] **Task 9: Pantalla de Alerta Entrante, Alarma Web Audio API y Navegación 1-Toque**
  - **Acceptance:** Alerta sonora sintética continua ante oferta, temporizador de 45s, detalle de referencia visual y botón para abrir Waze/Maps.
  - **Verify:** Simulación de evento `order:offered` en navegador móvil activa sonido y abre app de navegación.
  - **Files:** `apps/cab-pwa/src/components/IncomingOrderModal.tsx`, `apps/cab-pwa/src/lib/audioAlarm.ts`
  - **Scope:** S

- [x] **Task 10: Flujo de Entrega, Cobro en Efectivo y Actualización Inmutable de Stock**
  - **Acceptance:** Botón "Entregado y Cobrado" envía confirmación a Fastify, descuenta stock del camión, registra log y alerta si el stock restante $\le 3$.
  - **Verify:** `npm test tests/integration/order-fulfillment.test.ts`
  - **Files:** `apps/cab-pwa/src/components/ActiveDeliveryView.tsx`, `src/modules/orders/orders.controller.ts`, `src/modules/orders/orders.service.ts`
  - **Scope:** M

### Checkpoint 3: Cab Experience Complete
- [x] PWA operativa en smartphone Android de prueba.
- [x] Alertas sonoras estridentes y legibilidad al volante garantizada.
- [x] Descuento automático de inventario probado de punta a punta.

---

## Phase 4: WhatsApp Gateway (`whatsapp-gateway`)

- [x] **Task 11: Webhook Handler de Evolution API y Extracción de Coordenadas GPS**
  - **Acceptance:** Endpoint de webhook procesa eventos entrantes de Evolution API, extrayendo payload nativo de ubicación geográfica.
  - **Verify:** `npm test tests/unit/webhook.test.ts`
  - **Files:** `src/modules/whatsapp/webhook.controller.ts`, `src/modules/whatsapp/evolution.client.ts`
  - **Scope:** S

- [x] **Task 12: Máquina de Estados Conversacional (Referencias, Tipo y Envase Vacío)**
  - **Acceptance:** Diálogo interactivo: solicita ubicación $\rightarrow$ pide referencia de casa $\rightarrow$ tipo de cilindro $\rightarrow$ cantidad $\rightarrow$ confirma si tiene envase vacío.
  - **Verify:** `npm test tests/unit/conversation.test.ts`
  - **Files:** `src/modules/whatsapp/conversation.service.ts`, `src/modules/whatsapp/dialog-states.ts`, `tests/unit/conversation.test.ts`
  - **Scope:** M

- [x] **Task 13: Notificaciones al Cliente y Negociación de Emergencia / Reserva**
  - **Acceptance:** Envío automático de confirmación con ETA, propuesta de 1 cilindro inmediato si hay stock limitado, o propuesta de reserva programada.
  - **Verify:** Simulación de orden enviando respuestas interactivas mediante Evolution API.
  - **Files:** `src/modules/whatsapp/order-notifier.service.ts`, `src/modules/whatsapp/templates.ts`
  - **Scope:** S

### Checkpoint 4: End-to-End Delivery Loop
- [x] Pedido iniciado en WhatsApp se despacha en segundos a la cabina del camión.
- [x] Ayudante navega a la dirección con la referencia de fachada.
- [x] Entrega confirmada y notificada al cliente por WhatsApp.

---

## Phase 5: Operations Dashboard & Coolify Deployment (`ops-portal`)

- [x] **Task 14: Panel Web Administrativo con Mapa en Vivo de la Flota**
  - **Acceptance:** Dashboard web en tiempo real con Leaflet mostrando los 4 camiones en Ibarra, stock restante y tabla de entregas del día.
  - **Verify:** Conexión a canal Centrifugo de flota y verificación visual en navegador.
  - **Files:** `apps/ops-portal/src/App.tsx`, `apps/ops-portal/src/components/LiveFleetMap.tsx`, `src/modules/fleet/fleet.service.ts`
  - **Scope:** M

- [x] **Task 15: Configuración de Producción para Coolify y Backups Automatizados**
  - **Acceptance:** `docker-compose.prod.yml` listo para desplegar con 1 clic en Coolify en VPS Hetzner con SSL automático y script de backup diario.
  - **Verify:** Ejecución de `scripts/backup-db.sh` generando dump válido de PostgreSQL.
  - **Files:** `docker-compose.prod.yml`, `scripts/backup-db.sh`, `coolify.yaml`, `README.md`
  - **Scope:** S

### Checkpoint 5: Sistema Listo para Pruebas de Campo
- [x] Despliegue en VPS completado con Coolify (`coolify.yaml` + `docker-compose.prod.yml`).
- [x] WhatsApp Business vinculado mediante escaneo de QR en Evolution API.
- [x] Piloto listo para salir a la calle en Ibarra.

---

## Phase 6: Monorepo pnpm, DDD Architecture & Coolify Unification (`monorepo-ddd`)

- [x] **Task 16: Inicialización de Monorepositorio pnpm, Turborepo y Shared Packages**
  - **Acceptance:** `pnpm-workspace.yaml`, `turbo.json` v2, `@gasconnect/tsconfig` modular y `@gasconnect/contracts` (37 esquemas Zod / DTOs compilados). Ahorro de espacio en disco > 50%.
  - **Verify:** `pnpm run build` compila con éxito los paquetes base.
  - **Files:** `pnpm-workspace.yaml`, `turbo.json`, `package.json`, `packages/tsconfig/*`, `packages/contracts/*`
  - **Scope:** M

- [x] **Task 17: Reestructuración DDD del Backend Fastify en `apps/api`**
  - **Acceptance:** Reubicación en `apps/api` (`@gasconnect/api`). Partición estricta de 4 capas DDD (`domain/`, `application/`, `infrastructure/`, `presentation/`) en 5 bounded contexts (`dispatch`, `routing`, `fleet`, `orders`, `whatsapp`). Inyección de dependencias por constructor en Composition Root (`src/server.ts`). Encapsulación 100% de Prisma en repositorios de infraestructura (0 llamadas fuera).
  - **Verify:** `pnpm --filter @gasconnect/api test` (38/38 tests pasando en verde).
  - **Files:** `apps/api/package.json`, `apps/api/src/server.ts`, `apps/api/src/modules/**/*`
  - **Scope:** L

- [x] **Task 18: Reestructuración DDD y Dockerización Nginx de `apps/cab-pwa`**
  - **Acceptance:** Bounded context `CabOperation` en 4 capas. `cab-store.ts` desacoplado de `fetch` mediante interfaz `ICabApiClient`. Adaptadores de browser en `infrastructure/`. Presupuesto de bundle < 60 kB gzip (52.09 kB logrados). Dockerfile multi-stage Nginx Alpine (< 25 MB RAM).
  - **Verify:** `pnpm --filter cab-pwa run build` pasa limpiamente.
  - **Files:** `apps/cab-pwa/src/**/*`, `apps/cab-pwa/Dockerfile`, `apps/cab-pwa/nginx.conf`
  - **Scope:** M

- [x] **Task 19: Reestructuración DDD, WebSocket Centrifugo y Dockerización de `apps/ops-portal`**
  - **Acceptance:** Bounded context `FleetDashboard` en 4 capas. Eliminación total del polling HTTP de 5s vía `centrifugo.adapter.ts` en `infrastructure/` conectado al canal `distributor:default:fleet`. Componentes React 100% presentacionales. Dockerfile multi-stage Nginx Alpine (< 25 MB RAM).
  - **Verify:** `pnpm --filter ops-portal run build` pasa limpiamente.
  - **Files:** `apps/ops-portal/src/**/*`, `apps/ops-portal/Dockerfile`, `apps/ops-portal/nginx.conf`
  - **Scope:** M

- [x] **Task 20: Orquestación 100% Coolify, Registro de Decisión ADR-001 y CodeGraph Sync**
  - **Acceptance:** `docker-compose.prod.yml` y `coolify.yaml` actualizados con `cab.gasconnect.ec` y `ops.gasconnect.ec`. `docs/decisions/ADR-001-monorepo-pnpm-coolify.md` redactado. CodeGraph sincronizado (134 archivos, 927 nodos, 2,131 aristas).
  - **Verify:** `codegraph status` y `pnpm run build` en verde.
  - **Files:** `docker-compose.prod.yml`, `coolify.yaml`, `docs/decisions/ADR-001-monorepo-pnpm-coolify.md`
  - **Scope:** M

- [x] **Task 21: Descomposición Modular del Composition Root de la API en app.ts, server.ts y Barrels de Módulo**
  - **Acceptance:** Reducción de `server.ts` de 222 a 42 líneas (< 50 líneas). Creación de `apps/api/src/app.ts` como fábrica Fastify y Composition Root modular. Creación de barrels públicos `index.ts` con fábricas `create<Context>Module` en los 5 bounded contexts. Definición de `CompositionRootDependencies` en `server.types.ts`. Actualización de reglas en `.agents/rules/ddd-backend.md`, `AGENTS.md`, `AGENTS-backend.md` y registro en `ADR-002`.
  - **Verify:** `pnpm --filter @gasconnect/api test` (38/38 tests pasando en verde) y `pnpm --filter @gasconnect/api lint` limpio.
  - **Files:** `apps/api/src/server.ts`, `apps/api/src/app.ts`, `apps/api/src/server.types.ts`, `apps/api/src/modules/*/index.ts`, `docs/decisions/ADR-002-decomposicion-modular-composition-root-app-server.md`, `.agents/rules/ddd-backend.md`
  - **Scope:** M

### Checkpoint 6: Monorepositorio Integral Certificado
- [x] 100% de servicios y frontends orquestados bajo pnpm workspaces y Turborepo.
- [x] Arquitectura DDD estricta de 4 capas verificada en backend y frontends.
- [x] Composition Root modularizado (`app.ts` + `server.ts` < 50 líneas) y encapsulamiento por barrels `index.ts`.
- [x] 0 llamadas a Prisma fuera de infraestructura y 0 polling de 5s en ops-portal.
- [x] 40 tests unitarios e integración en verde.
- [x] Documentación y registros de decisiones ADR-001 y ADR-002 formalizados.
- [x] Listo para despliegue productivo unificado en Hetzner Cloud con Coolify.

---

## Phase 7: Real-Time Telemetry & Fleet State Synchronization (`realtime-sync`)
- [x] **Task 22: Corrección de Autenticación Centrifugo v5 e Inyección de FleetBroadcaster**
  - **Acceptance:** Centrifugo v5 admite suscripciones directas de clientes sin JWT en modo dev (`client_insecure: true`, namespaces `truck` y `distributor`). El backend Fastify publica en tiempo real a `distributor:default:fleet` ante cambios de estado (`IN_TRANSIT`, `IDLE`) y telemetría.
  - **Files:** `config/centrifugo.json`, `apps/api/src/modules/fleet/infrastructure/centrifugo-fleet.broadcaster.ts`
- [x] **Task 23: Consumo en Cab-PWA de Endpoints Operativos y Sincronización con Ops-Portal**
  - **Acceptance:** `cab-pwa` consume `POST /api/v1/fleet/trucks/:id/status` al aceptar pedidos (`IN_TRANSIT`), completar entregas (`IDLE`), alternar manualmente en cabina y en cada ping de telemetría. `ops-portal` actualiza reactivamente el pin en el mapa de Leaflet sin necesidad de recargar.
  - **Files:** `packages/contracts/src/telemetry.contract.ts`, `apps/cab-pwa/src/**/*`, `apps/ops-portal/src/**/*`


