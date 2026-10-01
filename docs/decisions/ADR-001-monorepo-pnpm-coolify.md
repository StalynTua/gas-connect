# ADR-001: Migración a Monorepositorio pnpm, Turborepo y Despliegue 100% Autohospedado en Coolify

- **Estado:** Aceptado (Accepted)
- **Fecha:** 2026-09-30
- **Autores:** Equipo de Arquitectura e Ingeniería GasConnect Ibarra
- **Decisores:** Desarrollador Principal, Operador de Despacho GLP

---

## 1. Contexto y Problemática

GasConnect Ibarra nació como una solución monolítica de alta criticidad para coordinar pedidos de GLP doméstico por WhatsApp (Evolution API v2), calcular rutas con OSRM y PostGIS, y despachar órdenes a camiones repartidores en Ibarra mediante una cascada de 45 segundos.

Con la evolución del sistema, la base de código acumuló tres subsistemas acoplados pero dispersos:
1. **Backend Fastify** en la raíz del proyecto.
2. **PWA de Cabina (`apps/cab-pwa`)** para los ayudantes de reparto.
3. **Portal de Operaciones (`apps/ops-portal`)** para la central de despacho.

Esta configuración presentaba fricciones operativas y arquitectónicas severas:
- **Duplicación masiva de dependencias:** Múltiples árboles de `node_modules` consumían más de 509 MB en disco con versiones desincronizadas de React, TypeScript y utilidades.
- **Deriva de contratos de red (Contract Drift):** Los tipos DTO y esquemas Zod se redefinían manualmente en cada frontend, arriesgando fallos silenciosos en producción al alterar endpoints de la API (`/api/v1/dispatch/decision`, `/orders/complete`, `/trucks/telemetry`).
- **Polling ineficiente de 5 segundos:** `apps/ops-portal` ejecutaba `setInterval` cada 5000 ms realizando 3 peticiones HTTP concurrentes a `/fleet/status`, `/fleet/metrics` y `/fleet/events`, saturando conexiones y generando latencia innecesaria.
- **Dilema de Despliegue (Vercel vs. Self-Hosted):** Se evaluó inicialmente desplegar los frontends en Vercel. Sin embargo, esto introducía dependencia de terceros, costos variables, fragmentación de certificados y mayor latencia de red hacia la base de datos e infraestructura en Ibarra/Hetzner.

---

## 2. Decisión Arquitectónica

Se decidió unificar el 100% de la solución en un **Monorepositorio Integral gobernado por `pnpm` workspaces y Turborepo v2**, desplegado en su totalidad de manera **autohospedada en un VPS Hetzner Cloud gestionado por Coolify**.

### 2.1. Estructura del Monorepositorio y Paquetes Compartidos
- **Gestor de paquetes:** `pnpm` (v9.15+) con `pnpm-workspace.yaml` y deduplicación por hardlinks (content-addressable storage).
- **Pipeline de orquestación:** Turborepo v2 (`turbo.json`) con caché incremental y ejecución concurrente de `build`, `test`, `lint` y `dev`.
- **`packages/tsconfig`:** Configuraciones TypeScript modulares (`base.json`, `node.json`, `react.json`).
- **`packages/contracts`:** Única fuente de verdad del monorepo conteniendo 37 esquemas Zod y tipos DTO compilados (`telemetry`, `dispatch`, `order`, `fleet`).

### 2.2. Reestructuración DDD en 4 Capas
Se aplicó estrictamente la arquitectura de Dominio Guiado por el Diseño (DDD) en los 3 proyectos:
- **`apps/api` (`@gasconnect/api`):** 5 contextos delimitados (`dispatch`, `routing`, `fleet`, `orders`, `whatsapp`). Inyección de dependencias por constructor en `server.ts` (Composition Root). 0 llamadas a Prisma ORM fuera de la capa `infrastructure/`.
- **`apps/cab-pwa`:** Bounded context `CabOperation` desacoplado de `fetch` mediante el puerto `ICabApiClient`. Adaptadores de hardware (`audio-alarm.adapter.ts`, `use-wake-lock.adapter.ts`) en infraestructura. Presupuesto estricto de bundle (< 60 kB gzip; certificado en 52.09 kB).
- **`apps/ops-portal`:** Bounded context `FleetDashboard`. **Eliminación total del polling HTTP de 5s**, reemplazado por suscripción reactiva en tiempo real a Centrifugo v5 (`centrifugo.adapter.ts`) consumida por el hook de aplicación `useFleetDashboard.ts`. Componentes React 100% presentacionales.

### 2.3. Despliegue 100% Coolify y Docker Multi-Stage Nginx
- **Imágenes ultraligeras de frontends:** Tanto `cab-pwa` como `ops-portal` se empaquetan con Docker multi-stage (Node 20 Alpine builder -> Nginx Alpine runner) con un consumo de memoria inferior a 25 MB RAM por contenedor y compresión Gzip nativa.
- **Orquestación unificada:** `docker-compose.prod.yml` y `coolify.yaml` orquestan los 8 servicios en una única red privada (`gasconnect-net`):
  1. `postgres` (PostGIS 16)
  2. `redis` (Redis 7 Alpine)
  3. `centrifugo` (Centrifugo v5 WebSocket)
  4. `osrm-ecuador` (Ruteo vehicular MLD)
  5. `evolution-api` (Gateway WhatsApp v2.1.2)
  6. `app` (Fastify Monolito en `apps/api`) -> `api.gasconnect.ec`
  7. `cab-pwa` (PWA de Ayudante) -> `cab.gasconnect.ec`
  8. `ops-portal` (Dashboard Central) -> `ops.gasconnect.ec`

---

## 3. Alternativas Evaluadas

| Opción | Pros | Contras | Razón de Descarte |
|---|---|---|---|
| **Frontends en Vercel + Backend en VPS** | Despliegue automático de SPA sin administrar Nginx | Dependencia de plataforma externa, costos por ancho de banda, fragmentación de DNS y mayor latencia hacia Centrifugo. | El usuario solicitó expresamente soberanía operativa total y despliegue unificado en Coolify. |
| **npm / Yarn Classic Workspaces** | Compatibilidad nativa sin herramientas adicionales | Duplicación de paquetes en disco (> 500 MB), resolución lenta de dependencias (`phantom dependencies`). | Ineficiente para servidores de recursos contenidos (VPS Hetzner). |
| **Monolito sin DDD (código plano en controladores)** | Rápido desarrollo inicial en fases tempranas | Acoplamiento extremo con Prisma, imposible testear en aislamiento, lógica de negocio fugada en controladores HTTP. | Inmantenible y propenso a regresiones en auditorías de seguridad y rendimiento. |

---

## 4. Consecuencias y Beneficios Validados

### Positivas
- **Ahorro de disco del 51.26%:** El peso de dependencias se redujo de 509 MB a 248.1 MB gracias al almacenamiento de hardlinks de `pnpm`.
- **Compilación ultra-rápida:** Turborepo v2 ejecuta la compilación completa de los 5 paquetes en ~2.9 segundos con caché incremental.
- **Cero Deriva de Contratos:** Cualquier cambio en los esquemas de `@gasconnect/contracts` rompe en tiempo de compilación (`pnpm run build`), previniendo errores en producción.
- **Eliminación de Polling y Sobrecarga de Red:** Reemplazo de 36 peticiones HTTP por minuto por un canal persistente WebSocket en Centrifugo v5.
- **Aislamiento DDD Total:** 100% de consultas SQL y Prisma aisladas en `infrastructure/repositories/`. Cero importaciones de Prisma en capas de dominio o presentación.
- **Soberanía Operativa y Costos Fijos:** 100% de la infraestructura autohospedada bajo una única factura mensual en Hetzner Cloud.

### Negativas / Compromisos
- Se requiere disciplina en el equipo para no importar módulos cruzados entre `apps/*` sin pasar por `packages/contracts`.
- El despliegue de producción requiere que el agente Coolify ejecute Docker Compose con el archivo `docker-compose.prod.yml`.
