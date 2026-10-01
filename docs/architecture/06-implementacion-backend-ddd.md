# 06 — Implementación de Arquitectura DDD en Backend Fastify (`apps/api`)

## Resumen Ejecutivo

En el marco del Milestone 2 de GasConnect Ibarra, se completó la migración y reestructuración completa del backend monolítico Fastify hacia `apps/api` bajo una arquitectura estricta de Dominio Guiado por el Diseño (DDD) de 4 capas, desacoplada mediante Inyección de Dependencias por Constructor (Constructor DI) en un Composition Root centralizado, y orquestada dentro del monorepositorio con pnpm workspaces y Turborepo.

---

## 1. Mapeo de Contextos Delimitados (Bounded Contexts)

El backend de `apps/api` se organiza en 5 bounded contexts y un shared kernel:

| Bounded Context | Carpeta | Responsabilidad Principal | Modelos / Entidades Clave |
|---|---|---|---|
| **Routing** | `src/modules/routing/` | Cálculo de distancias y tiempos de viaje viales y geodésicos. | `RouteResult`, `HaversineCalculator`, `IRoutingService` |
| **Dispatch** | `src/modules/dispatch/` | Búsqueda espacial de camiones candidatos y orquestación de la cascada de ofertas (45s). | `CandidateTruck`, `DispatchSession`, `ITruckCandidateRepository`, `IDispatchSessionRepository` |
| **Fleet** | `src/modules/fleet/` | Monitorización en tiempo real del estado de la flota, KPIs diarios y telemetría de camiones. | `FleetTruckSummary`, `FleetMetrics`, `IFleetRepository` |
| **Orders** | `src/modules/orders/` | Ciclo de vida de órdenes, persistencia transaccional y finalización de entregas. | `OrderEntity`, `IOrderRepository` |
| **WhatsApp** | `src/modules/whatsapp/` | Recepción de pedidos conversacionales (FSM) y notificaciones salientes vía Evolution API. | `DialogStep`, `UserSession`, `IMessageSender`, `IEvolutionInstanceService`, `IUserSessionRepository` |
| **Shared** | `src/shared/` | Tipos y contratos geográficos comunes y jerarquía de errores de dominio. | `Coordinates`, `DomainError`, `NotFoundError`, `ConflictError`, `ValidationError` |

---

## 2. Estructura Estricta de 4 Capas DDD

Cada módulo dentro de `apps/api/src/modules/<context>/` implementa exactamente:

```
src/modules/<context>/
├── domain/          # Entidades puras, Value Objects, interfaces de repositorio y puertos
├── application/     # Casos de uso (Use Cases) y servicios de aplicación orquestadores
├── infrastructure/  # Implementaciones de repositorios (Prisma, SQL, InMemory) y clientes HTTP
└── presentation/    # Controladores Fastify, validaciones de esquema (@gasconnect/contracts)
```

### Reglas de Dependencia Cumplidas
- **Domain**: Cero dependencias de infraestructura, base de datos, frameworks HTTP o logging. Solo TypeScript puro.
- **Application**: Depende exclusivamente de abstracciones e interfaces del dominio (`domain/`). Cero llamadas a Prisma, fetch o Fastify.
- **Infrastructure**: Implementa las interfaces de dominio (`IXxxRepository`, `IMessageSender`, `IRoutingService`). Es la **única** capa autorizada a importar `@prisma/client`, ejecutar `$queryRaw`/`$executeRaw` y realizar llamadas `fetch()`.
- **Presentation**: Controladores HTTP que reciben Fastify Request/Reply, validan payloads usando Zod (`@gasconnect/contracts`), invocan casos de uso y devuelven respuestas HTTP estandarizadas.

---

## 3. Composition Root Modular y Fábricas por Contexto (`app.ts`, `server.ts` y `modules/*/index.ts`)

Para evitar la sobrecarga y el crecimiento descontrolado de un Composition Root monolítico en `server.ts`, la arquitectura se desacopló en una estructura de tres niveles:

1. **Process Entrypoint (`apps/api/src/server.ts` — < 50 líneas)**:
   - Administra estrictamente el arranque del proceso HTTP (`server.listen`), host, puerto, tareas en background no bloqueantes (`evolutionClient.ensureConfigured()`), captura de fallos de inicialización y re-exportaciones de compatibilidad (`buildServer`, `CompositionRootDependencies`).

2. **HTTP Application Factory (`apps/api/src/app.ts`)**:
   - Inicializa Fastify con Pino logger (`pino-pretty` condicional), registra plugins de seguridad (`@fastify/cors`, `@fastify/helmet`), publica el endpoint `/api/health` y orquesta la composición de módulos invocando sus fábricas.

3. **Fábricas Modulares y Barrels Públicos (`apps/api/src/modules/<context>/index.ts`)**:
   Cada contexto encapsula la instanciación de su infraestructura, casos de uso y registro de rutas a través de su función de fábrica:
   - `createRoutingModule({ routingClient })`: Instancia `OsrmHttpClient` con fallback.
   - `createFleetModule({ fleetRepo, ...useCases })`: Instancia `prismaFleetRepository` y casos de uso de estado y telemetría de camiones; monta rutas de flota con `registerRoutes(server)`.
   - `createOrdersModule({ orderRepo, fleetRepo, ... })`: Instancia repositorio de órdenes y casos de uso; monta rutas de órdenes.
   - `createDispatchModule({ routingClient, fleetRepo, orderRepo, ... })`: Instancia repositorios de candidatos y sesiones, use cases de cascada a 45s y monta rutas de despacho.
   - `createWhatsappModule({ orderRepo, startDispatchUseCase, ... })`: Instancia `EvolutionHttpClient`, repositorio de sesiones y máquina de estados FSM; monta rutas de webhook.

La interfaz `CompositionRootDependencies` en `apps/api/src/server.types.ts` permite a las suites de pruebas unitarias e integración sobreescribir cualquier puerto o caso de uso en `buildServer(overrides)` sin tocar código de producción.

Referencia arquitectónica detallada: [`ADR-002: Descomposición Modular del Composition Root de la API`](../decisions/ADR-002-decomposicion-modular-composition-root-app-server.md).

---

## 4. Fachadas de Compatibilidad Hacia Atrás (Legacy Facades)

Para preservar la totalidad de la suite de pruebas preexistente sin romper imports históricos, se implementaron fachadas delegadoras:
- `src/modules/fleet/fleet.service.ts`: Expone la clase singleton `FleetService` delegando en `getFleetStatusUseCase`, `getFleetMetricsUseCase`, `updateTruckPositionUseCase`, etc.
- `src/modules/fleet/fleet.controller.ts`: Reexporta rutas y controlador hacia la nueva capa `presentation/`.
- `src/modules/dispatch/dispatch-orchestrator.service.ts`: Expone `dispatchOrchestrator` delegando en `startDispatchUseCase` y `handleDispatchDecisionUseCase`.
- `src/modules/dispatch/truck-finder.service.ts`: Expone `truckFinder` delegando en `prismaTruckCandidateRepository`.
- `src/modules/routing/osrm.service.ts`: Expone `osrmService` delegando en `calculateRouteUseCase`.
- `src/modules/whatsapp/conversation.service.ts`: Expone `conversationService` delegando en `processInboundMessageUseCase`.
- `src/modules/whatsapp/order-notifier.service.ts`: Expone `orderNotifierService` delegando en `whatsappNotifierService`.
- `src/modules/whatsapp/webhook.controller.ts`: Reexporta rutas hacia `presentation/webhook.controller.ts`.

---

## 5. Auditoría Estática de Integridad DDD

Verificaciones ejecutadas por expresiones regulares y AST:

| Regla de Integridad | Verificación | Resultado | Estado |
|---|---|---|---|
| Cero Prisma fuera de `infrastructure/` y `lib/` | `grep -rn "prisma" presentation/ domain/ application/` | 0 coincidencias | ✅ PASÓ |
| Cero `@prisma/client` fuera de `infrastructure/` y `lib/` | `grep -rn "@prisma/client" presentation/ domain/ application/` | 0 coincidencias | ✅ PASÓ |
| Cero Raw SQL (`$executeRaw`, `$queryRaw`) fuera de `infrastructure/` | `grep -rn "\$executeRaw\|\$queryRaw" presentation/ application/ domain/ server.ts` | 0 coincidencias | ✅ PASÓ |
| Cero `fetch()` fuera de `infrastructure/` | `grep -rn "fetch(" domain/ application/` | 0 coincidencias | ✅ PASÓ |
| Cero `console.*` en código de producción | `grep -rn "console\." modules/ server.ts` | 0 coincidencias (solo Pino logger) | ✅ PASÓ |
| Extensiones `.js` explícitas en todos los ESM imports | Verificación regex `from './...'` y `from '../...'` | 100% con `.js` | ✅ PASÓ |

---

## 6. Resultados de Compilación y Suites de Pruebas

- **Compilación en Monorepo (`pnpm run build`)**: 5 de 5 proyectos compilados exitosamente (`@gasconnect/contracts`, `@gasconnect/api`, `apps/cab-pwa`, `apps/ops-portal`).
- **Suites de Pruebas de API (`pnpm --filter @gasconnect/api test`)**:
  - `tests/unit/cab-store.test.ts`: 4/4 pasados
  - `tests/unit/conversation.test.ts`: 3/3 pasados
  - `tests/unit/dispatch-orchestrator.test.ts`: 6/6 pasados
  - `tests/unit/fleet.test.ts`: 5/5 pasados
  - `tests/unit/osrm.test.ts`: 3/3 pasados
  - `tests/unit/truck-finder.test.ts`: 2/2 pasados
  - `tests/unit/webhook.test.ts`: 10/10 pasados
  - `tests/prisma-schema.test.ts`: 2/2 pasados
  - `tests/server.test.ts`: 3/3 pasados
  - **Total**: 9 de 9 archivos de test pasados, 38 de 38 pruebas verdes (100% pass rate).
