# Implementation Plan: GasConnect Ibarra

## Overview
GasConnect Ibarra es un sistema de coordinación y despacho oportuno de gas GLP doméstico en Ibarra, Ecuador. Conecta la demanda ciudadana capturada sin fricción por WhatsApp con la flota de camiones distribuidores que ya circulan por los barrios, asignando pedidos al camión óptimo con el menor desvío vial (< 500m / < 5 min), respetando el inventario disponible y operando mediante un stack 100% Open Source (Fastify, PostGIS, Centrifugo, OSRM, Evolution API y Coolify).

## Architecture Decisions
- **Monolito Modular en TypeScript (Fastify):** Mantiene todas las capacidades en una sola base de código con módulos desacoplados, minimizando complejidad operativa.
- **PostgreSQL 16 + PostGIS:** Permite consultas espaciales nativas (`ST_DWithin`, `ST_Distance`) indexadas con `GIST` para búsquedas de camiones en menos de 50ms.
- **Centrifugo para Tiempo Real en Cabina:** Servidor pub/sub en Go desacoplado del backend con *History Recovery* para reconexión transparente tras pérdidas temporales de 4G en Ibarra.
- **OSRM Local en Docker:** Motor de ruteo local cargado con el mapa de Ecuador de OpenStreetMap para calcular ETA y sentidos de vía en < 5ms a \$0 de costo.
- **Evolution API para WhatsApp:** Conexión directa a WhatsApp Business por QR sin costo por mensaje.
- **PWA Ultraligera para Ayudante:** Vite + React + Tailwind + `centrifuge-js` (< 60KB) con Screen Wake Lock API y Web Audio API.
- **Coolify en VPS Hetzner:** Orquestación integral de Docker Compose con SSL automático y backups programados de base de datos.

---

## Build Order & Capability Roadmap
`core-data` $\longrightarrow$ `dispatch-engine` $\longrightarrow$ `cab-pwa` $\longrightarrow$ `whatsapp-gateway` $\longrightarrow$ `ops-portal`

---

## Detailed Task Breakdown

### Phase 1: Core Data & Spatial Foundation (`core-data`)

- **Task 1: Scaffolding del Monolito y Docker Compose para Entorno Local**
  - **Description:** Configurar el proyecto Fastify con TypeScript, linters, y el archivo `docker-compose.yml` que orquesta PostgreSQL con PostGIS, Redis, Centrifugo y OSRM local.
  - **Acceptance:** `npm run build` compila sin errores. `docker compose up -d` levanta Postgres con extensión PostGIS activa, Redis, Centrifugo y OSRM respondiendo en sus puertos.
  - **Verification:** `curl http://localhost:8000/api/health` responde `{ status: "ok" }`.
  - **Dependencies:** None.
  - **Files:** `package.json`, `tsconfig.json`, `docker-compose.yml`, `src/server.ts`, `.env.example`.
  - **Scope:** M (5 files).

- **Task 2: Esquema Relacional Prisma con Tipos Espaciales PostGIS**
  - **Description:** Definir el esquema Prisma con modelos `Distributor`, `Truck`, `Customer`, `Order`, `DispatchAttempt` e `InventoryLog`, incluyendo extensiones espaciales e índices GIST.
  - **Acceptance:** Migración inicial generada con `npx prisma migrate dev --name init`. Tablas y enums creados correctamente en PostgreSQL.
  - **Verification:** `npx prisma db push --skip-generate` y ejecución de prueba de inserción de un punto geométrico.
  - **Dependencies:** Task 1.
  - **Files:** `prisma/schema.prisma`, `prisma/migrations/*`, `src/lib/prisma.ts`.
  - **Scope:** S (3 files).

- **Task 3: Seed Script con Cuadrícula de Calles y Camiones Piloto en Ibarra**
  - **Description:** Crear el script de inicialización con 1 distribuidora local ("Gas Ibarra"), 4 camiones piloto posicionados en barrios Los Ceibos y Caranqui con stock inicial (40 bombonas c/u) y log de inventario.
  - **Acceptance:** `npm run prisma:seed` inserta la flota y el inventario sin errores.
  - **Verification:** Consulta SQL en base de datos verifica 4 camiones con coordenadas válidas en Ibarra (Lat: 0.35, Lng: -78.12).
  - **Dependencies:** Task 2.
  - **Files:** `prisma/seed.ts`, `package.json`.
  - **Scope:** S (2 files).

#### Checkpoint: Core Data Foundation
- [ ] Todos los contenedores de base corren en Docker local.
- [ ] Migraciones e índices espaciales PostGIS aplicados.
- [ ] Flota piloto de 4 camiones en Ibarra cargada y verificada.

---

### Phase 2: Dispatch Engine & Routing (`dispatch-engine`)

- **Task 4: Cliente de Integración con OSRM para Matriz de Distancia y ETA**
  - **Description:** Servicio para consultar la API de OSRM local (`/table/v1/driving`) pasando la posición del camión y la del pedido, retornando distancia de ruta (metros) y tiempo de manejo (segundos).
  - **Acceptance:** Función `calculateRoadEta(from, to)` retorna distancia y duración considerando sentidos de vía en < 10ms.
  - **Verification:** Test unitario automatizado con coordenadas del centro de Ibarra (Calle Sucre a Calle Bolívar).
  - **Dependencies:** Task 1.
  - **Files:** `src/modules/routing/osrm.service.ts`, `tests/unit/osrm.test.ts`.
  - **Scope:** S (2 files).

- **Task 5: Consulta Espacial PostGIS de Camiones Candidatos**
  - **Description:** Servicio que ejecuta la consulta PostGIS optimizada (`ST_DWithin`, `ST_Distance`, `current_stock >= requested`, estado disponible en < 1.5 km).
  - **Acceptance:** Retorna lista ordenada de hasta 5 camiones candidatos más cercanos con stock suficiente.
  - **Verification:** Test de integración con camiones del seed: solicita 2 bombonas y descarta camiones con stock < 2 o fuera del radio.
  - **Dependencies:** Task 2, Task 3.
  - **Files:** `src/modules/dispatch/truck-finder.service.ts`, `tests/integration/truck-finder.test.ts`.
  - **Scope:** S (2 files).

- **Task 6: Orquestador de Despacho, Temporizador de 45s y Cascada de Ofertas**
  - **Description:** Máquina de estados que gestiona la oferta individual al camión óptimo, programa el timeout de 45 segundos con BullMQ/Redis, y hace saltar la oferta al candidato #2 si no hay respuesta o se rechaza. Implementa oferta de cumplimiento parcial si el stock es bajo.
  - **Acceptance:** La oferta expira exactamente a los 45s y se reasigna al siguiente camión. Si el cliente pidió 2 pero el más cercano tiene 1 y el siguiente está a > 20 min, se activa flag de oferta parcial.
  - **Verification:** Tests unitarios de simulación con mocks de tiempo verificando transiciones de estado (`OFFERED` $\rightarrow$ `TIMEOUT` $\rightarrow$ `CASCADE`).
  - **Dependencies:** Task 4, Task 5.
  - **Files:** `src/modules/dispatch/dispatch-orchestrator.service.ts`, `src/queues/dispatch-timer.queue.ts`, `tests/unit/dispatch-orchestrator.test.ts`.
  - **Scope:** M (3 files).

#### Checkpoint: Dispatch Engine Validated
- [ ] Cálculo de matriz de ruteo OSRM local responde en < 10ms.
- [ ] Búsqueda espacial PostGIS selecciona candidatos correctos según stock y radio.
- [ ] El temporizador de 45s cascada ofertas automáticamente ante rechazos o timeouts.

---

### Phase 3: In-Cab Assistant PWA (`cab-pwa`)

- **Task 7: Scaffolding de PWA Móvil con Vite + React + Tailwind + PWA Plugin**
  - **Description:** Inicializar la aplicación web progresiva para el ayudante, configurada para pantalla completa (`standalone`), alto contraste y botones táctiles gigantes ($\ge 64\text{px}$).
  - **Acceptance:** `npm run build` genera bundle menor a 60 KB comprimido. La app es instalable en Android con icono y splash screen.
  - **Verification:** Auditoría de Lighthouse PWA pasa los checks de instalación y manifest.
  - **Dependencies:** None.
  - **Files:** `apps/cab-pwa/package.json`, `apps/cab-pwa/vite.config.ts`, `apps/cab-pwa/index.html`, `apps/cab-pwa/src/App.tsx`.
  - **Scope:** M (4 files).

- **Task 8: Conexión Centrifugo, Suscripción a Canal y Hook Screen Wake Lock**
  - **Description:** Integrar `centrifuge-js` para suscribirse al canal privado `truck:${truckId}` con JWT. Implementar hook `useWakeLock` para mantener la pantalla del teléfono encendida durante el turno.
  - **Acceptance:** La PWA se conecta al servidor Centrifugo, recupera mensajes perdidos por desconexión (*History Recovery*) y la pantalla no entra en reposo.
  - **Verification:** Simular corte de red de 15 segundos y verificar que el evento publicado por backend se recibe inmediatamente al reconectar.
  - **Dependencies:** Task 1, Task 7.
  - **Files:** `apps/cab-pwa/src/lib/centrifugo.ts`, `apps/cab-pwa/src/hooks/useWakeLock.ts`, `apps/cab-pwa/src/stores/cabStore.ts`.
  - **Scope:** S (3 files).

- **Task 9: Pantalla de Alerta Entrante, Alarma Web Audio API y Navegación 1-Toque**
  - **Description:** Implementar la vista reactiva ante `order:offered`: cuenta regresiva de 45s, alarma auditiva sintetizada continua (sin MP3), visualización clara de la referencia del cliente y deep-links nativos (`geo:lat,lng` / Waze / Google Maps).
  - **Acceptance:** Al emitirse una oferta, suena la alarma, se muestra la referencia y tiempo de desvío, y pulsar "Aceptar" detiene el sonido y abre el mapa.
  - **Verification:** Prueba en dispositivo móvil verificando apertura de Google Maps/Waze con coordenadas prellenadas.
  - **Dependencies:** Task 8.
  - **Files:** `apps/cab-pwa/src/components/IncomingOrderModal.tsx`, `apps/cab-pwa/src/lib/audioAlarm.ts`.
  - **Scope:** S (2 files).

- **Task 10: Flujo de Entrega, Cobro en Efectivo y Actualización Inmutable de Stock**
  - **Description:** Botón de un solo toque "Marcar Entregado y Cobrado ($X.XX)", que notifica al backend vía HTTP POST, descuenta las unidades del inventario, registra `INVENTORY_LOG` y advierte si el stock restante es $\le 3$.
  - **Acceptance:** Al confirmar entrega, el stock del camión en base de datos se reduce, el estado vuelve a `IDLE` y el registro de auditoría queda grabado.
  - **Verification:** Test end-to-end simulando entrega de 2 cilindros y comprobando balance en base de datos.
  - **Dependencies:** Task 2, Task 9.
  - **Files:** `apps/cab-pwa/src/components/ActiveDeliveryView.tsx`, `src/modules/orders/orders.controller.ts`, `src/modules/orders/orders.service.ts`.
  - **Scope:** M (3 files).

#### Checkpoint: Cab Experience Complete
- [ ] PWA instalable en Android con pantalla siempre encendida.
- [ ] Alerta de 45 segundos con sonido sintético y visualización de referencia del hogar.
- [ ] Deep-link de navegación a Maps/Waze y confirmación de cobro con descuento de stock.

---

### Phase 4: WhatsApp Gateway (`whatsapp-gateway`)

- **Task 11: Webhook Handler de Evolution API y Extracción de Coordenadas GPS**
  - **Description:** Endpoint en Fastify para recibir eventos webhook de Evolution API. Valida mensajes entrantes y procesa payloads nativos de tipo `location` (latitud, longitud).
  - **Acceptance:** Webhook responde `200 OK` en < 50ms y crea o recupera la sesión del cliente en Redis.
  - **Verification:** Test con payload de muestra de WhatsApp de ubicación geográfica.
  - **Dependencies:** Task 1.
  - **Files:** `src/modules/whatsapp/webhook.controller.ts`, `src/modules/whatsapp/evolution.client.ts`.
  - **Scope:** S (2 files).

- **Task 12: Máquina de Estados Conversacional (Referencias, Tipo y Envase Vacío)**
  - **Description:** Lógica del chatbot por WhatsApp:
    1. Solicita ubicación.
    2. Solicita referencia visual ("Casa blanca, reja negra").
    3. Pregunta tipo (Doméstico 15kg vs Industrial 45kg).
    4. Pregunta cantidad (1, 2, 3 bombonas).
    5. Pregunta obligatoria: "¿Tienes el envase vacío listo?".
  - **Acceptance:** Diálogo secuencial interactivo completo con botones rápidos de respuesta ejecutándose sin retrasos.
  - **Verification:** Test conversacional simulado de 5 pasos verificando la creación de la orden completa en base de datos.
  - **Dependencies:** Task 2, Task 11.
  - **Files:** `src/modules/whatsapp/conversation.service.ts`, `src/modules/whatsapp/dialog-states.ts`, `tests/unit/conversation.test.ts`.
  - **Scope:** M (3 files).

- **Task 13: Notificaciones al Cliente y Negociación de Emergencia / Reserva**
  - **Description:** Conectar el orquestador con el cliente de Evolution API para enviar mensajes:
    - Camión asignado con ETA estimada.
    - Oferta de emergencia: "¿Deseas 1 cilindro inmediato en 3 min o esperar ambos en 35 min?".
    - Oferta de reserva programada si no hay camiones en radio inmediato.
  - **Acceptance:** El cliente recibe mensajes automáticos en WhatsApp con botones interactivos cuando ocurren eventos en el motor de despacho.
  - **Verification:** Simular rechazo de camión y verificar mensaje de alternativa enviado al cliente.
  - **Dependencies:** Task 6, Task 12.
  - **Files:** `src/modules/whatsapp/order-notifier.service.ts`, `src/modules/whatsapp/templates.ts`.
  - **Scope:** S (2 files).

#### Checkpoint: End-to-End Delivery Loop
- [ ] Hogar pide gas por WhatsApp compartiendo ubicación y referencia.
- [ ] Motor localiza camión más cercano y envía alerta sonora a la PWA.
- [ ] Ayudante acepta, navega y confirma entrega.
- [ ] Cliente recibe confirmación de despacho y el stock se descuenta en vivo.

---

### Phase 5: Operations Dashboard & Coolify Deployment (`ops-portal`)

- **Task 14: Panel Web Administrativo con Mapa en Vivo de la Flota**
  - **Description:** Interfaz web ligera para el dueño de la distribuidora (Vite + React + Leaflet). Muestra en tiempo real sobre el mapa de Ibarra la posición de sus camiones, stock restante de cada uno y lista de pedidos activos.
  - **Acceptance:** El mapa se actualiza en tiempo real suscribiéndose al canal Centrifugo `distributor:${distributorId}:fleet`.
  - **Verification:** Mover coordenadas de camión simuladas y verificar movimiento del marcador en el mapa sin recargar la página.
  - **Dependencies:** Task 8, Task 10.
  - **Files:** `apps/ops-portal/src/App.tsx`, `apps/ops-portal/src/components/LiveFleetMap.tsx`, `src/modules/fleet/fleet.service.ts`.
  - **Scope:** M (3 files).

- **Task 15: Configuración de Producción para Coolify y Backups Automatizados**
  - **Description:** Crear archivo `docker-compose.prod.yml` con perfiles de producción, variables de entorno para Coolify, y script de backup diario de PostgreSQL con retención de 7 días.
  - **Acceptance:** Un solo clic en Coolify despliega el stack completo (Fastify, Centrifugo, Redis, Postgres+PostGIS, OSRM, Evolution API) con certificados SSL válidos y copias de seguridad activas.
  - **Verification:** Despliegue de prueba en VPS y ejecución manual de `scripts/backup-db.sh` verificando creación del dump comprimido.
  - **Dependencies:** All previous tasks.
  - **Files:** `docker-compose.prod.yml`, `scripts/backup-db.sh`, `coolify.yaml`, `README.md`.
  - **Scope:** S (4 files).

---

### Phase 8: Quality Gates & Constraint-Driven Development (`quality-constraints`)

- **Task 24: Formalization of Standards in CONSTRAINTS.md and Quality Gates Automation**
  - **Description:** Establish an explicit quantitative quality contract to prevent silent regressions by agents and collaborators. Integrate Floor verification (diff-scoped), DDD architectural boundaries, strict TypeScript typing, and non-regression ratchets.
  - **Acceptance:** Active `CONSTRAINTS.md` at repository root; `pnpm check:fast` (< 5s) and `pnpm check:task` (< 90s) configured and passing green.
  - **Verification:** `pnpm check:fast && pnpm check:task` complete without warnings or errors.
  - **Dependencies:** Task 21, Task 22, Task 23.
  - **Files:** `CONSTRAINTS.md`, `scripts/floor-guard.mjs`, `scripts/check-ddd-boundaries.mjs`, `package.json`, `AGENTS.md`.
  - **Scope:** S (5 files).

---

### Phase 9: Distributor Authentication & Cab Identity (`cab-auth`)

- **Task 25: Implementación de Autenticación de Cabina y Módulo Auth Centralizado**
  - **Description:** Implementar inicio/cierre de sesión para ayudantes de cabina en `cab-pwa` e identificación dinámica del camión asignado, con módulo de identidad desacoplado `auth` en `apps/api`. Emplea Argon2id para contraseñas de usuarios y SHA-256 para tokens de sesión en base de datos.
  - **Acceptance:**
    - `POST /api/v1/auth/login` valida placa y contraseña, retornando token opaco y detalles del camión.
    - `POST /api/v1/auth/logout` revoca el token en BD.
    - `cab-pwa` bloquea rutas operativas sin sesión activa, tolera fallos de red persistiendo sesión en `localStorage` y conecta Centrifugo con el token de sesión.
    - Se elimina el `truckId` estático quemado en `cab-store.ts`.
  - **Verification:** `pnpm --filter @gasconnect/api test` (54/54 en verde) y `pnpm --filter cab-pwa build`.
  - **Dependencies:** Task 18, Task 21.
  - **Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `apps/api/src/modules/auth/**/*`, `apps/cab-pwa/src/application/auth-store.ts`, `apps/cab-pwa/src/presentation/components/LoginView.tsx`, `apps/cab-pwa/src/App.tsx`, `docs/decisions/ADR-003-autenticacion-cab-pwa-modulo-auth-backend.md`.
  - **Scope:** M (11 files).

#### Checkpoint 7: Fleet Authentication Certified
- [x] Flota piloto autenticada con credenciales validadas con Argon2id.
- [x] Tokens de sesión opacos protegidos en reposo con SHA-256.
- [x] Interfaz de login y botón de logout funcionales en `cab-pwa`.
- [x] ADR-003 documentado y registrado.

---


## Risks and Mitigations
| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| Pérdida de cobertura 3G/4G en periferia de Ibarra | Medio | Centrifugo con *History Recovery* y buffer local en la PWA; reintento automático sin perder pedidos. |
| Imprecisión de GPS en calles estrechas | Alto | Solicitud obligatoria de referencia visual de fachada ("color de casa / tienda cercana") enviada a cabina. |
| Desconexión de sesión en Evolution API | Medio | Monitoreo automático de estado de instancia; alerta a bodega si la sesión de WhatsApp requiere re-escaneo QR. |
| Camión sin cilindros suficientes para el pedido | Alto | Filtro de elegibilidad estricto `stock >= Q` y flujo de oferta de emergencia para no perder la venta. |

---

## Open Questions
1. ¿Cuál es el número de teléfono que se usará para escanear el QR inicial de Evolution API en el piloto?
2. ¿Quiénes serán los 2 choferes y ayudantes piloto designados en Ibarra para la primera prueba de campo?
