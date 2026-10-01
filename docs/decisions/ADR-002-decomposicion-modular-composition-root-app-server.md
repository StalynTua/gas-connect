# ADR-002: Descomposición Modular del Composition Root de la API en app.ts, server.ts y Barrels de Módulo

- **Estado:** Aceptado (Accepted)
- **Fecha:** 2026-10-01
- **Autores:** Equipo de Arquitectura e Ingeniería GasConnect Ibarra
- **Decisores:** Desarrollador Principal, Arquitecto de Software
- **Contexto de Conversación:** Chat `b68e5232-c67f-46c6-8de2-27c0d900b71b`

---

## 1. Contexto y Problemática

Tras la migración y reestructuración de la API hacia la arquitectura DDD en `apps/api` (Milestone 2 / ADR-001), el Composition Root centralizado se concentraba íntegramente en `apps/api/src/server.ts`. 

A medida que el sistema creció para soportar los 5 bounded contexts (`routing`, `fleet`, `orders`, `dispatch`, `whatsapp`), `server.ts` superó las 220 líneas de código acumulando responsabilidades divergentes:
1. **Configuración de infraestructura HTTP Fastify:** inicialización del framework, configuración de logger Pino, registro manual de plugins (`@fastify/cors` con validación dinámica de orígenes, `@fastify/helmet`), y definición de endpoints de healthcheck (`/api/health`).
2. **Instanciación masiva de dependencias (God Wiring):** importaba e instanciaba manualmente todos los repositorios Prisma e InMemory, adaptadores HTTP externos (`OsrmHttpClient`, `EvolutionHttpClient`), y más de 12 casos de uso cruzados.
3. **Registro directo de controladores:** importaba y montaba manualmente las funciones de registro de rutas de cada módulo (`registerOrdersRoutes`, `registerDispatchRoutes`, `registerFleetRoutes`, `registerWhatsappRoutes`).
4. **Ciclo de vida del proceso de Node.js:** parseo de variables de entorno (`PORT`, `HOST`), arranque del socket HTTP (`server.listen()`), hooks asíncronos de fondo (`evolutionClient.ensureConfigured()`), captura de errores fatales de inicio y control de procesos (`process.exit(1)`).

### Fricciones Detectadas
- **Riesgo de explosión de complejidad:** Cada nuevo caso de uso, repositorio o puerto de dominio obligaba a modificar `server.ts`, aumentando la fricción en revisiones de código y el riesgo de conflictos en git.
- **Acoplamiento cruzado e imports profundos:** No existía una frontera estandarizada de exportación por contexto; los archivos externos accedían arbitrariamente a subcarpetas internas (`infrastructure/`, `application/`, etc.).
- **Fricción para pruebas:** La inyección de dependencias (`CompositionRootDependencies`) requería un objeto plano masivo que acoplaba el servidor HTTP directamente a las clases concretas en lugar de fábricas modulares autónomas.

---

## 2. Decisión Arquitectónica

Se decidió descomponer el Composition Root en una **arquitectura modular de tres niveles desacoplados**, complementada por **barrels públicos (`index.ts`) y funciones de fábrica (`create<Context>Module`)** en cada bounded context.

```
apps/api/src/
├── server.ts           # Nivel 1: Entrypoint del proceso Node.js (< 50 líneas)
├── app.ts              # Nivel 2: Fábrica Fastify y orquestador del Composition Root
├── server.types.ts     # Tipos e interfaces de DI para overrides de pruebas
└── modules/
    ├── <context>/
    │   ├── domain/
    │   ├── application/
    │   ├── infrastructure/
    │   ├── presentation/
    │   └── index.ts    # Nivel 3: Barrel público y fábrica modular create<Context>Module()
```

### 2.1. Nivel 1: Entrypoint de Proceso Ultraligero (`src/server.ts`)
- **Responsabilidad única:** Gobernar el ciclo de vida del runtime y el arranque del proceso.
- **Límite de tamaño estricto:** Menos de 50 líneas de código.
- **Acciones permitidas:**
  - Leer variables de entorno (`PORT`, `HOST`, `NODE_ENV`).
  - Obtener la instancia de la aplicación invocando `buildServer()`.
  - Iniciar el servidor mediante `await server.listen({ port, host })`.
  - Disparar tareas de inicialización en background que no bloqueen el socket (ej. `evolutionClient.ensureConfigured()`).
  - Capturar errores no controlados en el arranque (`process.exit(1)`).
- **Compatibilidad retroactiva:** Re-exporta `buildServer` y `CompositionRootDependencies` para preservar los contratos de testing existentes (`tests/server.test.ts`, tests de integración).
- **Prohibición:** Cero instanciación de casos de uso, repositorios o registro de rutas Fastify en este archivo.

### 2.2. Nivel 2: Fábrica de Aplicación Fastify (`src/app.ts`)
- **Responsabilidad única:** Ensamblar la instancia de Fastify y orquestar las dependencias de nivel superior.
- **Composición limpia:**
  - Configura el logger de Pino con formato `pino-pretty` condicional.
  - Registra plugins globales de red: `@fastify/cors` y `@fastify/helmet`.
  - Expone el endpoint de observabilidad `/api/health`.
  - Invoca ordenadamente las fábricas de módulo (`createRoutingModule`, `createFleetModule`, `createOrdersModule`, `createDispatchModule`, `createWhatsappModule`), conectando los puertos cruzados (ej. `routing.routingClient` hacia `dispatch`, `fleet.fleetRepo` hacia `orders`).
  - Delega el registro de rutas a cada módulo mediante `module.registerRoutes(server)`.
  - Admite el parámetro opcional `overrides: CompositionRootDependencies` para sustitución de mocks en tests sin alterar la producción.

### 2.3. Nivel 3: Barrels Públicos y Fábricas de Módulo (`modules/<context>/index.ts`)
Cada uno de los 5 bounded contexts encapsula su topología interna mediante un archivo `index.ts`:
1. **Exportaciones públicas estrictas:** Re-exporta únicamente los puertos de dominio (`IRoutingPort`, `IFleetRepository`, etc.), DTOs y clases de caso de uso que forman parte de la API pública del módulo.
2. **Interfaz de Dependencias:** Define `<Context>ModuleDeps` tipando todas las dependencias requeridas u opcionales del módulo.
3. **Función de Fábrica `create<Context>Module(deps = {})`:**
   - Provee implementaciones por defecto automáticas (Singletons Prisma, adaptadores HTTP oficiales, repositorios InMemory para desarrollo).
   - Instancia y ensambla los casos de uso internos del módulo.
   - Retorna una interfaz estandarizada con los casos de uso, repositorios y el método `registerRoutes(server: FastifyInstance)` que encapsula el montaje de sus controladores Fastify.

---

## 3. Matriz de Componentes Refactorizados

| Módulo / Archivo | Rol en la Nueva Arquitectura | Exportaciones Principales |
|---|---|---|
| `apps/api/src/server.ts` | Process Runner | `start()`, re-export de `buildServer` y `CompositionRootDependencies` |
| `apps/api/src/app.ts` | HTTP Composition Root | `buildServer(overrides?: CompositionRootDependencies)` |
| `apps/api/src/server.types.ts` | DI Contracts | `CompositionRootDependencies` |
| `modules/routing/index.ts` | Módulo de Ruteo | `createRoutingModule()`, `IRoutingPort`, `OsrmHttpClient` |
| `modules/fleet/index.ts` | Módulo de Flota | `createFleetModule()`, `IFleetRepository`, casos de uso de flota |
| `modules/orders/index.ts` | Módulo de Órdenes | `createOrdersModule()`, `IOrderRepository`, `CompleteOrderUseCase` |
| `modules/dispatch/index.ts` | Módulo de Despacho | `createDispatchModule()`, `StartDispatchUseCase`, `HandleDispatchDecisionUseCase` |
| `modules/whatsapp/index.ts` | Módulo de WhatsApp | `createWhatsappModule()`, `EvolutionHttpClient`, `ProcessInboundMessageUseCase` |

---

## 4. Alternativas Evaluadas

| Opción | Pros | Contras | Razón de Descarte |
|---|---|---|---|
| **A: Mantener `server.ts` monolítico** | No requiere nuevos archivos ni refactorizaciones. | Archivo inmanejable (> 300-500 líneas en el futuro), alto acoplamiento, conflictos continuos en git y difícil lectura. | Descartada por violar el principio de responsabilidad única y escalabilidad del código. |
| **B: Framework / Contenedor IoC Global (InversifyJS, TSyringe)** | Inyección automática por decoradores y resolución mágica en runtime. | Requiere `reflect-metadata`, configuración compleja de compilador, fragilidad en ESM NodeNext, sobrecarga de dependencias y pérdida de visibilidad directa del flujo. | Descartada: añade magia innecesaria en Node.js y complica la compilación pura de TypeScript ESM. |
| **C: Descomposición Modular con Fábricas Funcionales y Constructor DI (Seleccionada)** | Cero dependencias adicionales, 100% tipado en tiempo de compilación con TypeScript estricto, flujo de cableado explícito y trazable, fácil de testear con overrides. | Requiere definir un `index.ts` y una función `create<Context>Module` por cada bounded context. | **Aceptada:** Proporciona máxima claridad, aislamiento total entre módulos y cumplimiento riguroso de DDD. |

---

## 5. Reglas de Invarianza Establecidas

A partir de esta decisión, se fijan las siguientes reglas de obligado cumplimiento en el backend:

1. **`server.ts` < 50 líneas:** Prohibido agregar lógica de negocio, configuración de Fastify o instanciación directa de use cases o repositorios en `server.ts`.
2. **Encapsulamiento estricto:** Prohibido importar subcarpetas internas de otro contexto (ejemplo prohibido: `import ... from '../orders/infrastructure/prisma-order.repository.js'`). Toda interacción cruzada debe importar exclusivamente desde el barrel público `../<context>/index.js`.
3. **Registro modular de rutas:** Las rutas HTTP de un contexto se registran siempre dentro de la función `registerRoutes(server)` expuesta por la fábrica del módulo en su `index.ts`.
4. **Preservación de compatibilidad en tests:** Cualquier refactorización debe preservar la firma y exportación de `buildServer(overrides)` para asegurar que la suite de Vitest continúe ejecutando sin cambios.

---

## 6. Consecuencias y Verificación

- **Tamaño de archivo:** `apps/api/src/server.ts` se redujo de 222 líneas a **42 líneas** (-81%).
- **Claridad de topología:** El ensamblado completo de la API en `apps/api/src/app.ts` ocupa **102 líneas** perfectamente legibles y estructuradas en bloques.
- **Suites de Pruebas:** Los 9 archivos de prueba (38 tests) de `apps/api` ejecutan al 100% en verde mediante `pnpm --filter @gasconnect/api test`.
- **Chequeo de Tipos:** `pnpm --filter @gasconnect/api lint` pasa sin advertencias ni errores en modo estricto.
