# Plan de Análisis y Tareas: Corrección de Rutas, Estados y Capa de Mapa en ops-portal / ops-central

Documento de especificación y plan de trabajo para solventar los 3 problemas detectados en el módulo de operaciones (`ops-portal` / `ops-central`) y su integración con el backend de GasConnect Ibarra.

> **Regla de ejecución:** En esta fase no se modifica código fuente productivo. El resultado es exclusivamente este documento de análisis, diagnóstico y planificación.

---

## 1. Contexto del Proyecto

GasConnect Ibarra es una plataforma monolítica para despacho y entrega de gas doméstico (GLP) en Ibarra, Ecuador. El repositorio contiene tres subproyectos integrados:
1. **Backend API Fastify (`/`):** Orquesta el despacho en cascada (45s), ruteo vehicular con OSRM sobre cartografía de Ecuador, persistencia en PostgreSQL + PostGIS vía Prisma, y webhooks de WhatsApp (Evolution API).
2. **Cabin PWA (`apps/cab-pwa/`):** Aplicación móvil para el ayudante/conductor del camión donde se reciben, aceptan/rechazan órdenes y se reporta la telemetría GPS periódica.
3. **Operations Portal (`apps/ops-portal/` referido como `ops-central`):** Dashboard web de despacho donde se visualiza el mapa en vivo de la flota de camiones en Ibarra, métricas operativas diarias y el registro de eventos en tiempo real mediante polling HTTP (5s) a `/api/v1/fleet/status`, `/api/v1/fleet/metrics` y `/api/v1/fleet/events`.

### Módulos relevantes identificados con CodeGraph (Fase 0)
- **Mapa y renderizado de unidades:**
  - Componente: [`LiveFleetMap`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L29-L321) (`apps/ops-portal/src/components/LiveFleetMap.tsx`)
  - Componente: [`TrucksList`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/TrucksList.tsx#L10-L119) (`apps/ops-portal/src/components/TrucksList.tsx`)
  - Vista contenedora y polling: [`App`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/App.tsx#L99-L231) (`apps/ops-portal/src/App.tsx`)
- **Gestión de flota y telemetría (Backend):**
  - Servicio: [`FleetService`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.service.ts#L86-L297) (`src/modules/fleet/fleet.service.ts`)
  - Controlador: [`fleetRoutes`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.controller.ts#L4-L69) (`src/modules/fleet/fleet.controller.ts`)
  - Rutas de órdenes y telemetría: [`ordersRoutes`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L6-L206) (`src/modules/orders/orders.controller.ts`)
- **Orquestación de despacho y asignación:**
  - Orquestador: [`DispatchOrchestratorService`](file:///Users/stan/Documents/gas-connect/src/modules/dispatch/dispatch-orchestrator.service.ts#L33-L185) (`src/modules/dispatch/dispatch-orchestrator.service.ts`)
  - Búsqueda espacial de camiones: [`TruckFinderService`](file:///Users/stan/Documents/gas-connect/src/modules/dispatch/truck-finder.service.ts#L26-L200) (`src/modules/dispatch/truck-finder.service.ts`)
- **Modelo de datos y estados:**
  - Esquema Prisma: [`TruckStatus`](file:///Users/stan/Documents/gas-connect/prisma/schema.prisma#L12-L17) y [`Truck`](file:///Users/stan/Documents/gas-connect/prisma/schema.prisma#L61-L87) (`prisma/schema.prisma`)
  - Datos semilla: [`prisma/seed.ts`](file:///Users/stan/Documents/gas-connect/prisma/seed.ts#L29-L112)

---

## 2. Hallazgos por Problema (Fase 1 — Análisis de Solo Lectura)

### Problema 1: Distribuidor en ruta no aparece en el mapa
*Un distribuidor/camión con estado "en ruta" no se muestra en el mapa de ops-central.*

- **Origen de datos:** 
  `ops-portal` obtiene la posición de los camiones desde `GET /api/v1/fleet/status` (manejado en [`fleetService.getFleetStatus()`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.service.ts#L92-L132)). Cada objeto de camión incluye `id`, `licensePlate`, `driverName`, `status`, `lastLatitude` y `lastLongitude`.
- **Filtros aplicados en el mapa:**
  En [`LiveFleetMap.tsx:96-100`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L96-L100):
  ```typescript
  const filteredTrucks = trucks.filter((t) => {
    if (activeFilter === 'ALL') return true;
    return t.status === activeFilter;
  });
  ```
  Los marcadores de Leaflet se sincronizan con `filteredTrucks` (líneas 104-182). Si un camión no está en `filteredTrucks`, Leaflet ejecuta explícitamente `map.removeLayer(marker)` (líneas 176-182) eliminando el pin del mapa.
- **Causa Raíz Principal (Confirmada):**
  1. En [`src/modules/orders/orders.controller.ts:30-43`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L30-L43), cuando el chofer/ayudante acepta el pedido en `cab-pwa` enviando `POST /api/v1/dispatch/decision` con `{ decision: 'ACCEPTED', truckId, orderId }`, el backend actualiza la orden (`OrderStatus.ASSIGNED`), pero **NO actualiza el camión (`prisma.truck`) a `TruckStatus.IN_TRANSIT`**.
  2. Tampoco actualiza la lista en memoria `fleetService.trucksMemory` que sirve de respaldo.
  3. En [`prisma/seed.ts:87`](file:///Users/stan/Documents/gas-connect/prisma/seed.ts#L87), todos los camiones se crean con `status: TruckStatus.IDLE`.
  4. Por ende, en la base de datos y en las respuestas de `GET /api/v1/fleet/status`, el camión siempre mantiene `status: 'IDLE'`.
  5. Cuando el operador en `ops-portal` presiona la pestaña o filtro **"En Ruta"** (`activeFilter === 'IN_TRANSIT'`), la condición `t.status === 'IN_TRANSIT'` evalúa a `false` para todos los camiones. Como resultado, `filteredTrucks` es un arreglo vacío `[]`, y Leaflet remueve el marcador del mapa.
- **Causa Secundaria / Agravante en Telemetría (Confirmada):**
  En [`src/modules/orders/orders.controller.ts:168-205`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L168-L205), el endpoint `POST /api/v1/trucks/telemetry` que recibe las coordenadas GPS desde `cab-pwa` actualiza `prisma.truck` en PostgreSQL, pero no actualiza `fleetService.trucksMemory`. Si el entorno opera con el fallback en memoria (o la BD PostgreSQL no responde), las nuevas coordenadas no se propagan a `getFleetStatus()`.
- **Nivel de Confianza:** **Confirmada**.
- **Causa compartida:** Comparte causa raíz directa con el **Problema 2**.

---

### Problema 2: Estado del chofer no se actualiza (Siempre "Disponible")
*Un chofer en ruta siempre aparece en el tab "Disponibles" en lugar de reflejar su estado actual.*

- **Dónde se define y actualiza el estado:**
  - En la base de datos PostgreSQL, el enum es `TruckStatus` (`IDLE`, `IN_TRANSIT`, `RESTOCKING`, `OFF_DUTY`) en [`prisma/schema.prisma:12-17`](file:///Users/stan/Documents/gas-connect/prisma/schema.prisma#L12-L17).
  - En la PWA de cabina (`apps/cab-pwa/src/stores/cabStore.ts:111-136`), al aceptar un pedido, el cliente cambia su estado local a `state: 'IN_TRANSIT'` y hace `POST /api/v1/dispatch/decision`.
  - En el backend, [`ordersRoutes`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L10-L47) atiende `POST /api/v1/dispatch/decision`.
- **Dónde se rompe la actualización:**
  - **Falta de transición `IDLE -> IN_TRANSIT`:** En [`orders.controller.ts:30-43`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L30-L43), el endpoint sólo ejecuta:
    ```typescript
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { status: OrderStatus.ASSIGNED, assignedTruckId: truckId },
    });
    ```
    Falta la instrucción:
    ```typescript
    await prisma.truck.update({
      where: { id: truckId },
      data: { status: TruckStatus.IN_TRANSIT },
    });
    ```
  - **Falta de transición `IN_TRANSIT -> IDLE`:** En [`orders.controller.ts:121-140`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts#L121-L140), al completar la orden en `POST /api/v1/orders/complete`, se descuenta el stock de cilindros pero **no se reinicia el estado del camión a `TruckStatus.IDLE`**.
  - **Falta de sincronización en `fleetService`:** No existe un método en `FleetService` para actualizar el estado del camión en memoria (`trucksMemory`), provocando desincronización si la BD está ausente.
  - **Asignación a los tabs en frontend:**
    En [`LiveFleetMap.tsx:280-288`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L280-L288), el tab "Disponibles" activa `setActiveFilter('IDLE')`. Como el camión en ruta sigue teniendo `status: 'IDLE'`, coincide con el filtro de "Disponibles".
    Asimismo, en [`TrucksList.tsx:49-55`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/TrucksList.tsx#L49-L55):
    ```tsx
    <span className={`... ${truck.status === 'IN_TRANSIT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>
      {truck.status === 'IN_TRANSIT' ? 'En Ruta' : 'Disponible'}
    </span>
    ```
    Al no ser `IN_TRANSIT`, se le etiqueta indefectiblemente como "Disponible".
- **Lógica de derivación ausente:**
  En [`fleet.service.ts:92-126`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.service.ts#L92-L126), `getFleetStatus()` consulta únicamente la tabla `Truck` sin verificar si el camión tiene pedidos con estado `ASSIGNED` en la tabla `Order`. Una derivación dinámica aumentaría la resiliencia en caso de que la tabla `Truck` sufra inconsistencias.
- **Nivel de Confianza:** **Confirmada**.
- **Causa compartida:** Comparte causa raíz con el **Problema 1**.

---

### Problema 3: Capa base del mapa (Eliminar mapa Oscuro, usar únicamente OSM Ecuador)
*Eliminar el tab/opción de mapa Oscuro. El mapa debe usar únicamente OSM Ecuador (el mapa que ya tenemos cargado).*

- **Dónde se define el selector de capas:**
  En [`apps/ops-portal/src/components/LiveFleetMap.tsx:234-254`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L234-L254), existe una barra de botones toggle:
  ```tsx
  {/* Selector de capa cartográfica */}
  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
    <button onClick={() => setMapStyle('DARK')} ...>
      <Layers className="w-3 h-3" />
      <span>Oscuro</span>
    </button>
    <button onClick={() => setMapStyle('OSM')} ...>
      <MapPin className="w-3 h-3" />
      <span>OSM Estándar</span>
    </button>
  </div>
  ```
- **Dónde se almacena y conmuta el estado de capa:**
  - En [`LiveFleetMap.tsx:35`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L35):
    ```typescript
    const [mapStyle, setMapStyle] = useState<'DARK' | 'OSM'>('DARK');
    ```
    El estado inicial por defecto es `'DARK'`.
  - En [`LiveFleetMap.tsx:63-89`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L63-L89):
    Un `useEffect` escucha `[mapStyle]`, remueve la capa previa e inserta la nueva URL:
    - Para `'DARK'`: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` con atribución de CARTO.
    - Para `'OSM'`: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` con atribución de OpenStreetMap.
- **Cómo se carga la fuente OSM Ecuador actualmente:**
  - El mapa se inicializa centrado en Ibarra, Imbabura: `IBARRA_CENTER: [0.3475, -78.1285]` con zoom 14 ([`LiveFleetMap.tsx:26-50`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L26-L50)).
  - La infraestructura del proyecto cuenta con el backend OSRM para ruteo en Ecuador montado en Docker ([`docker-compose.yml:49-58`](file:///Users/stan/Documents/gas-connect/docker-compose.yml#L49-L58)) sobre `/data/ecuador-latest.osrm`.
  - La fuente de teselas cartográficas correspondiente a OSM es `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
- **Referencias a la capa oscura que deben eliminarse:**
  1. Estado `mapStyle` y su setter `setMapStyle` ([`LiveFleetMap.tsx:35`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L35)).
  2. Efecto reactivo dependiente de `[mapStyle]` ([`LiveFleetMap.tsx:63-89`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L63-L89)).
  3. URL de teselas de CartoDB Dark (`basemaps.cartocdn.com/dark_all`) y su atribución CARTO.
  4. Selector visual de botones ("Oscuro" vs "OSM Estándar") en el JSX ([`LiveFleetMap.tsx:234-254`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L234-L254)).
  5. Import del icono `Layers` de `lucide-react` en [`LiveFleetMap.tsx:4`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx#L4).
  *Nota sobre estilos:* Las clases de popup oscuro (`dark-leaflet-popup`) y el contenedor de mapa deben mantenerse para preservar la estética y legibilidad sobre el mapa OSM.
- **Nivel de Confianza:** **Confirmada**.

---

## 3. Plan de Tareas Ordenadas

### Tarea 1: Eliminación del selector de mapa Oscuro y fijación de capa base OSM Ecuador
- **Problema que resuelve:** Problema 3.
- **Archivos a modificar:**
  - [`apps/ops-portal/src/components/LiveFleetMap.tsx`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx)
- **Cambio propuesto:**
  1. Eliminar el estado `mapStyle` y el import de `Layers` de `lucide-react`.
  2. Montar directamente el tile layer de OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) con atribución estándar durante la inicialización del mapa (en el primer `useEffect` o simplificando el efecto de capa sin dependencias dinámicas).
  3. Remover el bloque JSX del selector de capas (botones "Oscuro" y "OSM Estándar"), dejando únicamente los filtros por estado de flota en la barra superior.
- **Riesgos o efectos colaterales:**
  - Mínimo. No afecta contratos de API ni altera lógica de negocio. Se debe verificar que la distribución flex del header se mantenga armónica sin el selector.
- **Cómo verificarla:**
  - Ejecutar `(cd apps/ops-portal && npm run build)` para confirmar que compila en TypeScript sin errores de tipos ni imports no utilizados.
  - Verificar visualmente en navegador con `npm run preview` que el mapa cargue exclusivamente las teselas de OpenStreetMap y no existan los botones de selección de estilo.

---

### Tarea 2: Actualización del ciclo de vida del estado del camión en el Backend
- **Problema que resuelve:** Problemas 1 y 2 (Causa raíz principal).
- **Archivos a modificar:**
  - [`src/modules/orders/orders.controller.ts`](file:///Users/stan/Documents/gas-connect/src/modules/orders/orders.controller.ts)
  - [`src/modules/fleet/fleet.service.ts`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.service.ts)
- **Cambio propuesto:**
  1. En `orders.controller.ts` (`/api/v1/dispatch/decision`), cuando `decision === 'ACCEPTED'`, añadir la actualización de estado del camión en BD: `prisma.truck.update({ where: { id: truckId }, data: { status: 'IN_TRANSIT' } })`, y actualizar la réplica en memoria con `fleetService.updateTruckStatus(truckId, 'IN_TRANSIT')`.
  2. En `orders.controller.ts` (`/api/v1/orders/complete`), al confirmar la entrega, actualizar el camión a `status: 'IDLE'` tanto en BD (`prisma.truck.update`) como en memoria (`fleetService.updateTruckStatus(truckId, 'IDLE')`).
  3. En `orders.controller.ts` (`/api/v1/trucks/telemetry`), invocar `fleetService.updateTruckPosition(truckId, latitude, longitude)` para mantener la telemetría sincronizada en memoria y en BD.
  4. En `fleet.service.ts`, exponer el método `updateTruckStatus(truckId: string, status: 'IDLE' | 'IN_TRANSIT' | 'OFFLINE'): void` para actualizar el array `this.trucksMemory`.
- **Riesgos o efectos colaterales:**
  - Las operaciones de BD deben estar envueltas en `try/catch` para mantener la tolerancia a fallos offline requerida por la arquitectura del monolito.
- **Cómo verificarla:**
  - Ejecutar `npm test tests/server.test.ts` y `npm test tests/unit/fleet.test.ts`.
  - Crear o extender un test unitario en `tests/unit/fleet.test.ts` que simule la transición `IDLE -> IN_TRANSIT -> IDLE` y compruebe que `GET /api/v1/fleet/status` devuelve el estado correspondiente.

---

### Tarea 3: Derivación dinámica de estado y normalización defensiva en Frontend
- **Problema que resuelve:** Problemas 1 y 2 (Resiliencia y sincronización completa).
- **Archivos a modificar:**
  - [`src/modules/fleet/fleet.service.ts`](file:///Users/stan/Documents/gas-connect/src/modules/fleet/fleet.service.ts)
  - [`apps/ops-portal/src/components/LiveFleetMap.tsx`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/LiveFleetMap.tsx)
  - [`apps/ops-portal/src/components/TrucksList.tsx`](file:///Users/stan/Documents/gas-connect/apps/ops-portal/src/components/TrucksList.tsx)
- **Cambio propuesto:**
  1. En `fleetService.getFleetStatus()`, al consultar los camiones en BD, verificar o incluir órdenes activas (`orders: { where: { status: 'ASSIGNED' } }`). Si el camión tiene una orden asignada no completada, garantizar que su estado retorne como `'IN_TRANSIT'` aun si la columna individual no se actualizó por alguna anomalía.
  2. En `LiveFleetMap.tsx` y `TrucksList.tsx`, utilizar comparación robusta de estado insensible a mayúsculas/minúsculas y espacios (p. ej. `(truck.status || '').toUpperCase() === 'IN_TRANSIT'`), protegiendo la UI contra posibles discrepancias de formato.
- **Riesgos o efectos colaterales:**
  - La consulta a `prisma.truck.findMany` debe usar `select` optimizado para no generar sobrecarga ni consultas N+1.
- **Cómo verificarla:**
  - Ejecutar la suite completa de backend: `npm test`.
  - Ejecutar el build del frontend de operaciones: `(cd apps/ops-portal && npm run build)`.

---

## 4. Orden de Ejecución Justificado

El orden de implementación propuesto es:

```
┌────────────────────────────────────────────────────────┐
│ Tarea 1: Limpieza de Capa Base OSM en ops-portal       │
│ (Problema 3 — Aislado, sin impacto backend, visual)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Tarea 2: Ciclo de Vida del Camión en Backend           │
│ (Problemas 1 y 2 — Solución raíz de persistencia)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Tarea 3: Derivación Dinámica y Robustez en Frontend    │
│ (Problemas 1 y 2 — Capa defensiva y tolerancia)        │
└────────────────────────────────────────────────────────┘
```

### Justificación:
1. **Tarea 1 primero:** Se circunscribe a `LiveFleetMap.tsx` en `apps/ops-portal`. Es completamente ortogonal a la base de datos y al backend. Al resolverla primero, dejamos el mapa con su capa definitiva (OSM Ecuador) y libre de controles innecesarios antes de manipular la lógica de marcadores.
2. **Tarea 2 segundo:** Es la causa raíz de fondo para los Problemas 1 y 2. Sin la actualización del estado del camión en el backend durante el despacho y la entrega, ninguna lógica en frontend puede mostrar correctamente los estados dinámicos.
3. **Tarea 3 al final:** Añade resiliencia por derivación de órdenes activas y asegura que ante cualquier inconsistencia de base de datos o casing de strings, el frontend filtre y visualice sin errores.

---

## 5. Verificación Final (Definición de Terminado)

Una vez aplicadas las tres tareas en la fase de implementación, la verificación completa consistirá en:

1. **Chequeo de Tipos y Build:**
   - Backend: `npx tsc --noEmit` sin errores.
   - Portal de Operaciones: `(cd apps/ops-portal && npm run build)` sin errores de TypeScript ni Vite.
2. **Pruebas Automatizadas de Backend:**
   - Ejecutar `npm test` garantizando que los 35 tests existentes sigan en verde, más los nuevos casos de prueba de actualización de estado de camión.
3. **Verificación de Comportamiento Funcional:**
   - **Capa base:** El mapa de `ops-portal` inicia directamente con OpenStreetMap y no muestra el selector "Oscuro / OSM Estándar".
   - **Estado "En Ruta":** Al aceptar un despacho desde la PWA (`POST /api/v1/dispatch/decision` con `decision: 'ACCEPTED'`), el camión cambia a estado `IN_TRANSIT` en `GET /api/v1/fleet/status`.
   - **Tabs y Filtros:** Al pulsar el tab "En Ruta" en `LiveFleetMap`, el camión asignado se mantiene visible en el mapa con su ping verde esmeralda. En la lista lateral `TrucksList`, su badge indica "En Ruta".
   - **Tab "Disponibles":** El camión en ruta no aparece en el tab "Disponibles" hasta que la entrega se complete vía `POST /api/v1/orders/complete`.
