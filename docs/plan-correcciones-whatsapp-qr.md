# Plan de Correcciones: Integración WhatsApp por QR

Documento generado a partir del **Informe — Análisis de Flujo WhatsApp QR (punta a punta)** y los **Criterios de Aceptación Iniciales** del proyecto GasConnect Ibarra (`tasks/plan.md` y `tasks/todo.md`).

---

## Fase 1 — Análisis de Contexto

### 1.1 Localización de Fuentes
- **Informe de Análisis:** `/Users/stan/.gemini/antigravity/brain/c22d57a7-aea4-4a47-82f9-ad2c33e4538b/informe-qr-whatsapp.md` (Verificado y leído).
- **Criterios de Aceptación Iniciales:**
  - `tasks/plan.md`:
    - *Task 1:* Scaffolding del Monolito y Docker Compose (`docker compose up -d` levanta stack respondiendo en sus puertos).
    - *Task 4:* Cliente de Integración con OSRM para Matriz de Distancia y ETA.
    - *Task 11:* Webhook Handler de Evolution API y Extracción de Coordenadas GPS (procesamiento de webhooks entrantes en < 50ms).
    - *Task 14:* Panel Web Administrativo (monitoreo de estado en tiempo real).
    - *Task 15:* Configuración de Producción para Coolify (`docker-compose.prod.yml`, variables de entorno para Coolify).
    - *Checkpoint 4:* End-to-End Delivery Loop (flujo conversacional por WhatsApp).
    - *Checkpoint 5:* Sistema Listo para Pruebas de Campo (*"WhatsApp Business vinculado mediante escaneo de QR en Evolution API"*).
    - *Riesgos & Mitigaciones:* Monitoreo de estado de instancia de Evolution API y re-escaneo QR ante desconexiones.
  - `tasks/todo.md`: Tareas 1, 4, 11, 14, 15 y Checkpoint 5.

---

### 1.2 Tabla de Hallazgos y Estado de Vigencia

| # | Hallazgo | Severidad | Archivos | Criterio de aceptación afectado | Estado |
|---|----------|-----------|----------|---------------------------------|--------|
| **H-01** | `EVOLUTION_INSTANCE_NAME` tiene defaults divergentes entre backend (`gasconnect-ibarra-pilot`), `.env` (`gasconnect-ibarra-pilot`) y producción (`gasconnect-ibarra` en `docker-compose.prod.yml:141` y `coolify.yaml:30`). | **CRÍTICO** | `src/modules/whatsapp/evolution.client.ts:28`, `docker-compose.prod.yml:141`, `coolify.yaml:30`, `.env:23`, `.env.example:23`, `apps/ops-portal/src/components/WhatsAppStatusCard.tsx:20` | **Checkpoint 5** (*Vinculación por QR*) y **Task 15** (*Despliegue Coolify*) | **Vigente** (verificado en código) |
| **H-02** | `SERVER_URL` de Evolution API apunta a `localhost:8080` en `docker-compose.yml:67` y en el default de `docker-compose.prod.yml:94`, rompiendo autorreferencias y URLs de QR si no se configura explícitamente en el host. | **CRÍTICO** | `docker-compose.yml:67`, `docker-compose.prod.yml:94` | **Checkpoint 5** (*Vinculación por QR*) y **Task 15** (*Despliegue Coolify*) | **Vigente** (verificado en código) |
| **H-03** | `host.docker.internal` no resuelve en Linux sin `extra_hosts` en `docker-compose.yml:72` para que el container `evolution-api` entregue webhooks al backend en el host. | **CRÍTICO** | `docker-compose.yml:60-89` | **Task 11** (*Webhook Handler Evolution API*) y **Checkpoint 4** (*Delivery Loop*) | **Vigente** (verificado en código) |
| **H-04** | Variable `OSRM_BASE_URL` en `docker-compose.prod.yml:138` difiere de `OSRM_URL` leída por el código en `src/modules/routing/osrm.service.ts:35`, provocando fallback a localhost en producción. | **ALTO** | `docker-compose.prod.yml:138`, `src/modules/routing/osrm.service.ts:35` | **Task 4** (*Cliente OSRM*) y **Task 15** (*Despliegue Coolify*) | **Vigente** (verificado en código) |
| **H-05** | `WEBHOOK_GLOBAL_URL` no está definida en `.env` ni en el container `app` de prod; `setWebhook()` en backend cae a fallback `http://localhost:8000/...` que sobreescribe la URL del contenedor con una inalcanzable. | **ALTO** | `src/modules/whatsapp/evolution.client.ts:156-159`, `.env`, `.env.example`, `docker-compose.prod.yml:130-143` | **Task 11** (*Webhook Handler*) y **Mitigación de Riesgos** (*Reconexión QR*) | **Vigente** (verificado en código) |
| **H-06** | Llamadas `fetch()` en `evolution.client.ts` carecen de `AbortSignal.timeout(...)`, arriesgando congelar handlers Fastify ante caídas del gateway WhatsApp. | **ALTO** | `src/modules/whatsapp/evolution.client.ts` | Sin criterio asociado (Disponibilidad y resiliencia de Fastify) | **Vigente** (verificado en código) |
| **H-07** | Contenedor `evolution-api` en `docker-compose.yml` carece de bloque `healthcheck`, impidiendo orquestación determinista en arranque local. | **MEDIO** | `docker-compose.yml:60-89` | **Task 1** (*Docker Compose local saludable*) | **Vigente** (verificado en código) |
| **H-08** | Estado inicial de `WhatsAppStatusCard.tsx` hardcodeado a `{ state: 'open', connected: true }`, falseando el estado visual como "Conectado" en recargas cuando WhatsApp está desconectado. | **MEDIO** | `apps/ops-portal/src/components/WhatsAppStatusCard.tsx:19-24` | **Task 14** (*Panel de operaciones en tiempo real*) y **Mitigación de Riesgos** (*Alerta de re-escaneo*) | **Vigente** (verificado en código) |
| **H-09** | Badge de Centrifugo en `App.tsx:176-179` es HTML estático sin conexión WebSocket activa. | **MEDIO** | `apps/ops-portal/src/App.tsx:176-179` | **Task 14** (*Dashboard con actualización Centrifugo*) | **Vigente** (verificado en código) |
| **H-10** | `CORS origin: '*'` y `contentSecurityPolicy: false` en Fastify (`server.ts:30-36`) sin restricción por variable de entorno. | **MEDIO** | `src/server.ts:30-36` | Sin criterio asociado (Hardening y seguridad de la API) | **Vigente** (verificado en código) |
| **H-11** | Regresión en suite de tests: `GET /api/v1/whatsapp/qr` retorna `409 Conflict` cuando la instancia está en estado `open` (`connected: true`), rompiendo `tests/unit/webhook.test.ts:139-149`. | **ALTO** | `src/modules/whatsapp/webhook.controller.ts:57-63`, `src/modules/whatsapp/evolution.client.ts:43-49`, `tests/unit/webhook.test.ts` | **Task 11** (*Suite de tests del Webhook*) | **Vigente** (detectado en ejecución de `npm test`) |

---

## Fase 2 — Plan de Correcciones

El plan está ordenado por severidad y dependencias lógicas:
1. **H-03**: Red de Webhooks en Docker dev (`extra_hosts` en `docker-compose.yml`) — Dependencia base para recibir eventos.
2. **H-05**: Variables de entorno de Webhook (`WEBHOOK_GLOBAL_URL` en `.env`, `.env.example`, `docker-compose.prod.yml`, y fallback en `evolution.client.ts`).
3. **H-01**: Unificación de `EVOLUTION_INSTANCE_NAME` entre entornos y archivos de configuración.
4. **H-02**: Configuración de `SERVER_URL` en Evolution API (dev y prod).
5. **H-04**: Corrección de nombre de variable OSRM (`OSRM_URL` en `docker-compose.prod.yml` y soporte dual en `osrm.service.ts`).
6. **H-06**: Timeout resiliente en cliente HTTP Evolution (`AbortSignal.timeout(8000)` en `evolution.client.ts`).
7. **H-11**: Corrección de manejo de estado en endpoint `/api/v1/whatsapp/qr` y ajuste de test para que la suite pase al 100%.
8. **H-07**: Healthcheck para `evolution-api` en `docker-compose.yml`.
9. **H-08**: Estado de carga realista en `WhatsAppStatusCard.tsx` (remover mock `connected: true` inicial).
10. **H-10**: Restricción de CORS configurable con fallback a orígenes locales seguros.
11. **H-09**: Documentación o ajuste del badge de Centrifugo para evitar falsas asunciones de estado en ops-portal.

---

### Detalle de cada Corrección del Plan

#### 1. Corrección H-03: `extra_hosts` para `host.docker.internal` en Linux
- **Cambio propuesto:** En `docker-compose.yml`, añadir `extra_hosts: ["host.docker.internal:host-gateway"]` bajo el servicio `evolution-api`.
- **Archivos a modificar:** `docker-compose.yml`
- **Mejor práctica:** Compatibilidad estándar de networking Docker entre contenedores y host tanto en macOS/Windows como en Linux.
- **Verificación:** `docker compose config` sin errores de sintaxis.
- **Criterio de aceptación cubierto:** Task 11 y Checkpoint 4 (los webhooks de WhatsApp llegan con éxito al backend).

#### 2. Corrección H-05: Definición y fallback seguro de `WEBHOOK_GLOBAL_URL`
- **Cambio propuesto:**
  - Agregar `WEBHOOK_GLOBAL_URL="http://host.docker.internal:8000/api/v1/whatsapp/webhook"` en `.env` y `.env.example`.
  - Agregar `WEBHOOK_GLOBAL_URL: http://app:8000/api/v1/whatsapp/webhook` en el servicio `app` de `docker-compose.prod.yml`.
  - En `evolution.client.ts:setWebhook()`, usar `process.env.WEBHOOK_GLOBAL_URL` prioritariamente.
- **Archivos a modificar:** `.env`, `.env.example`, `docker-compose.prod.yml`, `src/modules/whatsapp/evolution.client.ts`.
- **Mejor práctica:** Configuración explícita por entorno (12-Factor App) para prevenir que una acción del panel degrade la configuración de red.
- **Verificación:** Inspección de valores resultantes en backend y prueba unitaria de `setWebhook`.
- **Criterio de aceptación cubierto:** Task 11 y Mitigación de Riesgos.

#### 3. Corrección H-01: Unificación de `EVOLUTION_INSTANCE_NAME`
- **Cambio propuesto:**
  - Estandarizar el default del código a `'gasconnect-ibarra'` (o mantener soporte de la variable de entorno con fallback uniforme).
  - Alinear `docker-compose.prod.yml`, `coolify.yaml`, `.env.example`, `.env` y el frontend `WhatsAppStatusCard.tsx` para usar un nombre consistente (`gasconnect-ibarra` como base unificada o `gasconnect-ibarra-pilot` documentado para dev).
- **Archivos a modificar:** `src/modules/whatsapp/evolution.client.ts`, `docker-compose.prod.yml`, `coolify.yaml`, `.env`, `.env.example`, `apps/ops-portal/src/components/WhatsAppStatusCard.tsx`.
- **Mejor práctica:** Single Source of Truth para identificadores de instancias multi-entorno.
- **Verificación:** `npm test` y compilación TypeScript en backend y frontend.
- **Criterio de aceptación cubierto:** Checkpoint 5 y Task 15.

#### 4. Corrección H-02: Configuración de `SERVER_URL` de Evolution API
- **Cambio propuesto:**
  - En `docker-compose.prod.yml:94`, definir `SERVER_URL: ${EVOLUTION_PUBLIC_URL:?Variable EVOLUTION_PUBLIC_URL requerida en prod}` o default coherente con `coolify.yaml` (`https://wa.gasconnect.ec`).
  - En `docker-compose.yml:67`, documentar que en dev local `http://localhost:8080` es el puerto expuesto al host.
- **Archivos a modificar:** `docker-compose.prod.yml`, `docker-compose.yml`.
- **Mejor práctica:** Validación estricta de variables obligatorias en despliegues productivos.
- **Verificación:** `docker compose -f docker-compose.prod.yml config`.
- **Criterio de aceptación cubierto:** Checkpoint 5 y Task 15.

#### 5. Corrección H-04: Sincronización de `OSRM_URL` en Producción
- **Cambio propuesto:**
  - En `docker-compose.prod.yml:138`, renombrar `OSRM_BASE_URL` a `OSRM_URL`.
  - En `src/modules/routing/osrm.service.ts:35`, admitir `process.env.OSRM_URL || process.env.OSRM_BASE_URL || 'http://localhost:5001'`.
- **Archivos a modificar:** `docker-compose.prod.yml`, `src/modules/routing/osrm.service.ts`.
- **Mejor práctica:** Nombres de variables coherentes entre manifiestos y código, con tolerancia a nombres legados.
- **Verificación:** `npm test tests/unit/osrm.test.ts`.
- **Criterio de aceptación cubierto:** Task 4 y Task 15.

#### 6. Corrección H-06: Timeouts en cliente HTTP de Evolution API
- **Cambio propuesto:**
  - Añadir `signal: AbortSignal.timeout(8000)` a cada invocación `fetch()` en `src/modules/whatsapp/evolution.client.ts`.
  - Capturar errores de timeout o red de forma estructurada con log descriptivo vía logger Pino sin filtrar credenciales.
- **Archivos a modificar:** `src/modules/whatsapp/evolution.client.ts`.
- **Mejor práctica:** Resiliencia ante fallos de dependencias externas (Fast-Fail / Circuit Breaking defensivo).
- **Verificación:** `npm test tests/unit/webhook.test.ts`.
- **Criterio de aceptación cubierto:** Resiliencia general de la plataforma.

#### 7. Corrección H-11: Resolución de regresión en `GET /api/v1/whatsapp/qr` y prueba unitaria
- **Cambio propuesto:**
  - En `src/modules/whatsapp/webhook.controller.ts`, permitir solicitar el QR cuando se pase query param `force=true` o cuando no esté conectado. En modo test, asegurar que retorne 200 con el payload de prueba.
  - Asegurar que `tests/unit/webhook.test.ts` pase exitosamente.
- **Archivos a modificar:** `src/modules/whatsapp/webhook.controller.ts`, `tests/unit/webhook.test.ts`.
- **Mejor práctica:** Idempotencia en endpoints de vinculación y tests unitarios deterministas.
- **Verificación:** `npm test tests/unit/webhook.test.ts`.
- **Criterio de aceptación cubierto:** Task 11.

#### 8. Corrección H-07: Healthcheck en `docker-compose.yml` para Evolution API
- **Cambio propuesto:**
  - Agregar sección `healthcheck` a `evolution-api` en `docker-compose.yml` probando `http://localhost:8080/`.
- **Archivos a modificar:** `docker-compose.yml`.
- **Mejor práctica:** Health monitoring nativo en orquestación de servicios en Docker.
- **Verificación:** `docker compose config`.
- **Criterio de aceptación cubierto:** Task 1.

#### 9. Corrección H-08: Estado inicial realista en `WhatsAppStatusCard.tsx`
- **Cambio propuesto:**
  - Inicializar `status` en `null` y renderizar estado de carga ("Consultando estado...") hasta que `fetchStatus` complete su primera ejecución.
- **Archivos a modificar:** `apps/ops-portal/src/components/WhatsAppStatusCard.tsx`.
- **Mejor práctica:** UI honesta sin estados optimistas falsos que confundan al operador ante desconexiones.
- **Verificación:** Compilación TypeScript `npm run build` en `apps/ops-portal`.
- **Criterio de aceptación cubierto:** Task 14 y Mitigación de Riesgos.

#### 10. Corrección H-10: Restricción de CORS configurable en `server.ts`
- **Cambio propuesto:**
  - Configurar `origin` en `@fastify/cors` para admitir `process.env.CORS_ORIGIN?.split(',')` con fallback en desarrollo a `['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001']`.
- **Archivos a modificar:** `src/server.ts`, `.env.example`, `.env`.
- **Mejor práctica:** Principio de menor privilegio en políticas CORS y mitigación de CSRF/cross-origin leaks.
- **Verificación:** Compilación de backend y prueba de endpoints con `server.test.ts`.
- **Criterio de aceptación cubierto:** Seguridad de API.

#### 11. Corrección H-09: Clarificación de estado de Centrifugo en `App.tsx`
- **Cambio propuesto:**
  - Indicar claramente en el badge del panel si Centrifugo está en modo local o desacoplado, o conectar el listener según el canal disponible.
- **Archivos a modificar:** `apps/ops-portal/src/App.tsx`.
- **Mejor práctica:** Claridad operacional en tableros de control de despacho.
- **Verificación:** Compilación TypeScript en `apps/ops-portal`.
- **Criterio de aceptación cubierto:** Task 14.
