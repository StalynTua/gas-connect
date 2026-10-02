# GasConnect Ibarra 🚚🔥
> Motor de Coordinación en Tiempo Real y Despacho Oportuno de GLP Doméstico para Ibarra, Ecuador  
> *Real-Time Coordination & Opportunistic LPG Gas Cylinder Dispatch Engine for Ibarra, Ecuador*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.28-black)](https://fastify.dev/)
[![Centrifugo](https://img.shields.io/badge/Centrifugo-v5-007acc)](https://centrifugal.dev/)
[![Evolution API](https://img.shields.io/badge/Evolution_API-v2-green)](https://github.com/EvolutionAPI/evolution-api)
[![PostGIS](https://img.shields.io/badge/PostGIS-16-blue)](https://postgis.net/)
[![OSRM](https://img.shields.io/badge/OSRM-v5-orange)](http://project-osrm.org/)

---

## 🇪🇸 ESPAÑOL

### 1. Filosofía del Proyecto: No es una "App de Pedir Gas"
En Ecuador, el gas licuado de petróleo (GLP) de 15kg tiene un precio oficial subsidiado por el Estado ($1.60 en depósito oficial; $3.00 a domicilio en Ibarra). Con un margen bruto de distribución de apenas **$1.00 a $1.40 por cilindro**, el modelo tradicional de delivery bajo demanda (tipo Uber/Rappi) colapsa financieramente.

**GasConnect Ibarra** invierte el modelo:
- **No despacha desde una bodega central:** Aprovecha los camiones que **ya están circulando activamente** por las calles de Ibarra (Los Ceibos, Caranqui, Centro Histórico, Yacucalle).
- **Desvío vial mínimo (<500m / <5 min):** El motor intercepta pedidos que coinciden con la trayectoria del camión.
- **Sin fricción para el usuario:** El cliente pide por **WhatsApp** enviando su ubicación GPS y una foto o referencia visual de su fachada ("casa amarilla de dos pisos, portón negro"), sin descargar aplicaciones.
- **Asistente de cabina para el ayudante:** PWA móvil ultraligera (<60KB) instalada en el smartphone del ayudante con *Screen Wake Lock*, alarma sonora sintética estridente y navegación en 1 toque hacia Waze o Google Maps.
- **100% Código Abierto y Costo Fijo Mínimo:** Se eliminan las comisiones de Meta Cloud API ($0.018/msg) y Google Maps API ($5/1k calls), reemplazándolas por **Evolution API v2** y **OSRM local**, logrando un costo de infraestructura de solo **~$12 a $18/mes** en un único VPS Hetzner con Coolify.

---

### 2. Arquitectura del Sistema
```
                        +---------------------------------------------+
                        |      CLIENTE EN IBARRA (WhatsApp)           |
                        +---------------------------------------------+
                                              |
                                              v (Webhook HTTP)
+-----------------------------------------------------------------------------+
|                               VPS HETZNER (Coolify)                         |
|                                                                             |
|  +------------------------+       +--------------------------------------+  |
|  | Evolution API v2       | ----> | Fastify TypeScript Monolith          |  |
|  | (Gateway WhatsApp WA)  |       | - Máquina de Estados Conversacional  |  |
|  +------------------------+       | - Orquestador de Despacho (45s)      |  |
|                                   | - Negociador de Stock de Emergencia  |  |
|                                   +--------------------------------------+  |
|                                       |           |              |          |
|                                       v           v              v          |
|                       +------------------+ +-------------+ +-------------+  |
|                       | PostgreSQL 16    | | OSRM Local  | | Centrifugo  |  |
|                       | + PostGIS (GIST) | | (Ecuador)   | | v5 (WS)     |  |
|                       +------------------+ +-------------+ +-------------+  |
|                                                                   |         |
+-------------------------------------------------------------------|---------+
                                                                    |
                                        +---------------------------+
                                        | (Canal privado truck:{id})
                                        v
                        +---------------------------------------------+
                        |     PWA EN CABINA DEL CAMIÓN (Ayudante)     |
                        |  - Alarma Web Audio continua                |
                        |  - Temporizador 45s de aceptación exclusiva |
                        |  - Referencia visual de fachada             |
                        |  - Deep-link directo a Waze / Google Maps   |
                        +---------------------------------------------+
```

---

### 3. Pila Tecnológica 100% Open Source
| Componente | Tecnología | Justificación y Ventaja |
|---|---|---|
| **Backend API** | Fastify + TypeScript + Prisma | Rendimiento sub-milisegundo, tipado estricto y modular monolith. |
| **Base Espacial** | PostgreSQL 16 + PostGIS | Índices espaciales GIST, consultas `ST_DWithin` en < 50ms. |
| **WebSockets** | Centrifugo v5 | Desacopla conexiones de Node.js, *History Recovery* ante caídas de 4G. |
| **Ruteo Vehicular** | OSRM (Backend C++) | Ruteo en carretera y matriz de tiempos en < 5ms sin costo por llamada. |
| **WhatsApp Gateway**| Evolution API v2 | Instancia multi-dispositivo sin coste de $0.018 por mensaje de Meta. |
| **PWA de Cabina** | Vite + React + Tailwind + PWA | < 60KB de bundle, Screen Wake Lock API y Web Audio API. |
| **Panel de Control**| Ops Portal (Vite + React) | Vista cartográfica en vivo de Ibarra, stock restante y métricas. |
| **Despliegue** | Coolify + Docker Compose | Gestión de 1-clic con SSL automático Let's Encrypt en Hetzner Cloud. |

---

### 4. Guía de Inicio Rápido (Desarrollo Local)

#### Prerrequisitos
- Node.js 20+ y npm
- Docker y Docker Compose

#### Paso 1: Clonar e instalar dependencias
```bash
git clone https://github.com/tu-usuario/gasconnect-ibarra.git
cd gasconnect-ibarra
npm install
```

#### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env
```

#### Paso 3: Iniciar la infraestructura con Docker
```bash
docker compose up -d
```
Esto levantará:
- PostgreSQL + PostGIS (`localhost:5432`)
- Redis (`localhost:6379`)
- Centrifugo v5 (`localhost:8001`)
- OSRM Ecuador (`localhost:5000`)
- Evolution API (`localhost:8080`)

#### Paso 4: Migrar la base de datos y cargar semilla de Ibarra
```bash
npx prisma db push
npm run prisma:seed
```
*Inserta el distribuidor piloto y 4 camiones con 40 cilindros cada uno en Los Ceibos, Caranqui, Centro Histórico y Yacucalle.*

#### Paso 5: Ejecutar la suite de pruebas
```bash
npm test
```
*Ejecuta los 9 archivos de test unitarios e integrados (30 pruebas en total).*

#### Paso 6: Iniciar el servidor Fastify
```bash
npm run dev
```
La API estará disponible en `http://localhost:8000/api/health`.

---

### 5. Despliegue en Producción con Coolify (Hetzner VPS)

1. En tu servidor VPS Hetzner (Ubuntu 24.04 LTS), instala Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
2. Accede a tu panel Coolify (`http://IP_DE_TU_VPS:8000`) y crea un nuevo proyecto: **GasConnect Ibarra**.
3. Selecciona **Deploy from Docker Compose** y apunta a `docker-compose.prod.yml` o importa el archivo `coolify.yaml`.
4. Asigna los dominios en Coolify:
   - `api.gasconnect.ec` -> Puerto `8000` (Fastify API)
   - `ws.gasconnect.ec` -> Puerto `8000` (Centrifugo WebSocket)
   - `wa.gasconnect.ec` -> Puerto `8080` (Evolution API)
5. Haz clic en **Deploy**. Coolify configurará automáticamente los certificados SSL con Let's Encrypt.
6. Vincula WhatsApp Business:
   - Ingresa al panel de Evolution API en `https://wa.gasconnect.ec`.
   - Crea la instancia `gasconnect-ibarra` y escanea el código QR desde el WhatsApp del distribuidor.

---

### 6. Respaldos Automatizados (Backup)
El sistema incluye un script con política de retención automática de 7 días:
```bash
./scripts/backup-db.sh
```
Para programarlo diariamente en crontab a las 02:00 AM:
```bash
0 2 * * * cd /home/ubuntu/gasconnect-ibarra && ./scripts/backup-db.sh >> /var/log/gasconnect-backup.log 2>&1
```

---
---

## 🇺🇸 ENGLISH

### 1. Project Philosophy: Not an "Uber for Gas"
In Ecuador, 15kg domestic liquefied petroleum gas (LPG) has a strictly regulated state price ($1.60 depot price; $3.00 home delivery in Ibarra). With a distributor margin of only **$1.00 to $1.40 per cylinder**, the conventional on-demand delivery app model collapses under customer acquisition and per-delivery dispatch costs.

**GasConnect Ibarra** solves the actual problem:
- **No central dispatch warehouse:** Leverages trucks that are **already circulating** along the streets of Ibarra (Los Ceibos, Caranqui, Centro Histórico, Yacucalle).
- **Minimal detour (<500m / <5 min):** Dispatches orders directly into the immediate path of the closest circulating truck.
- **Zero app friction for domestic users:** Customers simply WhatsApp their live GPS location and a visual house landmark ("yellow two-story house, black gate"), without downloading any app.
- **Lightweight Helper Cab PWA:** Sub-60KB web application running on the helper's smartphone with *Screen Wake Lock*, continuous synthetic audio alarms, and 1-tap navigation launch into Waze or Google Maps.
- **100% Open Source & Ultra Low Cost:** Completely eliminates Meta Cloud API message fees ($0.018/msg) and Google Maps API fees ($5/1k calls) by utilizing self-hosted **Evolution API v2** and a local **OSRM** container, reducing total software costs to **~$12 to $18/month** on a single Hetzner VPS managed via Coolify.

---

### 2. Architecture Diagram
```
                     +---------------------------------------------+
                     |         IBARRA CUSTOMER (WhatsApp)          |
                     +---------------------------------------------+
                                            |
                                            v (HTTP Webhook)
+-----------------------------------------------------------------------------+
|                             HETZNER VPS (Coolify)                           |
|                                                                             |
|  +------------------------+       +--------------------------------------+  |
|  | Evolution API v2       | ----> | Fastify TypeScript Monolith          |  |
|  | (WhatsApp Gateway)     |       | - Conversational Dialog State Engine |  |
|  +------------------------+       | - 45-Second Cascading Dispatcher     |  |
|                                   | - Emergency Split Inventory Manager  |  |
|                                   +--------------------------------------+  |
|                                       |           |              |          |
|                                       v           v              v          |
|                       +------------------+ +-------------+ +-------------+  |
|                       | PostgreSQL 16    | | Local OSRM  | | Centrifugo  |  |
|                       | + PostGIS (GIST) | | (Ecuador)   | | v5 (WS)     |  |
|                       +------------------+ +-------------+ +-------------+  |
|                                                                   |         |
+-------------------------------------------------------------------|---------+
                                                                    |
                                        +---------------------------+
                                        | (Private channel truck:{id})
                                        v
                     +---------------------------------------------+
                     |         IN-CAB PWA (Truck Helper)           |
                     |  - Continuous Web Audio synthesize alarm    |
                     |  - 45s exclusive acceptance countdown       |
                     |  - Visual landmark reference                |
                     |  - 1-tap deep link to Waze / Google Maps    |
                     +---------------------------------------------+
```

---

### 3. Open Source Stack Breakdown
- **Backend API:** Fastify 4, TypeScript, Prisma ORM.
- **Spatial Engine:** PostgreSQL 16 + PostGIS extension with GIST indexing.
- **Real-Time Messaging:** Centrifugo v5 with automatic history recovery for 3G/4G dead zones.
- **Road Distance & ETAs:** Local OSRM container loaded with Ecuador OpenStreetMap extract.
- **WhatsApp Gateway:** Evolution API v2 (self-hosted Docker instance).
- **In-Cab Assistant:** React 18, Vite, Tailwind CSS, Screen Wake Lock API, Web Audio API.
- **Operations Portal:** React 18, Vite, live cartographic fleet tracking in Ibarra.
- **Deployment:** Coolify on Hetzner Cloud (CX22 / CX32) with automatic Let's Encrypt SSL.

---

### 4. Quickstart Guide (Local Development)
```bash
# 1. Clone & install dependencies
git clone https://github.com/your-username/gasconnect-ibarra.git
cd gasconnect-ibarra
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Spin up Docker containers
docker compose up -d

# 4. Initialize PostGIS schema & seed pilot fleet in Ibarra
npx prisma db push
npm run prisma:seed

# 5. Run test suite
npm test

# 6. Start development server
npm run dev
```

---

### 5. Production Coolify Deployment
1. Install Coolify on Ubuntu 24.04: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`.
2. Connect your Git repository and point to `docker-compose.prod.yml` or `coolify.yaml`.
3. Set your environment variables in Coolify (`POSTGRES_PASSWORD`, `EVOLUTION_API_KEY`, etc.).
4. Link WhatsApp Business: Open `https://wa.your-domain.com`, generate a QR code, and scan it with the distributor's phone.

---

### 6. Automated Backup & Maintenance
Run the built-in database backup script:
```bash
./scripts/backup-db.sh
```
Includes an automatic 7-day retention cleanup. Add to `crontab -e` for daily automated execution.

---

### 7. License
Licensed under the [MIT License](LICENSE).
GasConnect Ibarra &copy; 2026.

# GasConnect Ibarra — AGENTS.md

> Guía de orientación para agentes de IA que trabajan en este repositorio.  
> Generado el 2026-09-28 con CodeGraph (índice en `.codegraph/codegraph.db`).

---

## ¿Qué es este repositorio?

**GasConnect Ibarra** es un sistema de coordinación y despacho oportuno de GLP (cilindros 15 kg) en Ibarra, Ecuador. Invierte el modelo tradicional de delivery: en lugar de despachar desde una bodega central, intercepta pedidos que coinciden con la trayectoria de camiones que ya circulan por los barrios, con un desvío máximo de 500 m / 5 min y un costo de infraestructura de ~$12–18/mes.

El repositorio es un **monorepo pnpm** organizado en proyectos independientes bajo `apps/` y paquetes compartidos bajo `packages/`:

| Proyecto | Ruta | AGENTS.md |
|---|---|---|
| **Backend API** (Fastify monolith) | `apps/api/` | [`apps/api/AGENTS.md`](./apps/api/AGENTS.md) |
| **cab-pwa** (PWA ayudante del camión) | `apps/cab-pwa/` | [`apps/cab-pwa/AGENTS.md`](./apps/cab-pwa/AGENTS.md) |
| **ops-portal** (Panel de operaciones) | `apps/ops-portal/` | [`apps/ops-portal/AGENTS.md`](./apps/ops-portal/AGENTS.md) |

---

## Mapa de proyectos y relaciones

```
WhatsApp (cliente Ibarra)
        │ POST /api/v1/whatsapp/webhook  (Evolution API → Fastify)
        ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND API  src/server.ts → buildServer()                  │
│                                                              │
│  whatsapp/webhook.controller   ← entrada de mensajes         │
│  whatsapp/conversation.service ← máquina de estados (7 pasos)│
│  dispatch/truck-finder.service ← PostGIS ST_DWithin          │
│  dispatch/dispatch-orchestrator← timeout 45 s + cascada      │
│  routing/osrm.service          ← ETA vial real               │
│  fleet/fleet.controller        ← GET /api/v1/fleet/*         │
│  orders/orders.controller      ← decisión cabina + entrega   │
│  lib/prisma.ts                 ← singleton Prisma ORM         │
└─────────────────┬──────────────────────────┬─────────────────┘
                  │ HTTP REST                 │ HTTP REST
                  ▼                           ▼
    ┌──────────────────────┐      ┌──────────────────────────┐
    │  cab-pwa             │      │  ops-portal              │
    │  apps/cab-pwa/src/   │      │  apps/ops-portal/src/    │
    │                      │      │                          │
    │  cabStore (micro)    │      │  App.tsx (fetch polling) │
    │  POST /dispatch/     │      │  GET /fleet/status       │
    │       decision       │      │  GET /fleet/metrics      │
    │  POST /orders/       │      │  GET /fleet/events       │
    │       complete       │      │  LiveFleetMap (Leaflet)  │
    │  POST /trucks/       │      │  WhatsAppStatusCard      │
    │       telemetry      │      │                          │
    └──────────────────────┘      └──────────────────────────┘
```

**Dependencias cruzadas clave (verificadas con CodeGraph):**

| Cambio en el backend | Afecta a |
|---|---|
| `POST /api/v1/dispatch/decision` (firma o contrato) | `cabStore.ts` → `acceptOffer()` / `rejectOffer()` en cab-pwa |
| `POST /api/v1/orders/complete` (body o respuesta) | `cabStore.ts` → `completeDelivery()` en cab-pwa |
| `POST /api/v1/trucks/telemetry` (body o respuesta) | `cabStore.ts` → `sendTelemetry()` en cab-pwa |
| `GET /api/v1/fleet/status` (schema `trucks[]`) | `App.tsx` de ops-portal + `cabStore.syncWithBackend()` en cab-pwa |
| `GET /api/v1/fleet/metrics` | `App.tsx` + `MetricsCards.tsx` de ops-portal |
| `GET /api/v1/fleet/events` | `App.tsx` + `ActivityLog.tsx` de ops-portal |
| `GET/POST /api/v1/whatsapp/*` | `WhatsAppStatusCard.tsx` de ops-portal |

---

## Convenciones compartidas

- **Lenguaje**: TypeScript 5.6 estricto en los tres proyectos.
- **Imports ESM**: extensión `.js` en los imports aunque el fuente sea `.ts`.
- **Tests**: solo el backend tiene suite (Vitest, 9 archivos, ~30 pruebas). Los frontends no tienen tests.
- **Lint**: `npm run lint` en la raíz (`eslint src --ext .ts`). Los frontends no tienen lint configurado.
- **Variables de entorno**: `.env` en la raíz (modelo: `.env.example`). Frontends usan `VITE_*`.
- **Node.js requerido**: ≥ 20.
- **Singletons de servicio**: cada módulo del backend exporta un singleton al final de su archivo.
- **Logging**: Pino integrado en Fastify; `pino-pretty` solo en `NODE_ENV=development`; silenciado en `NODE_ENV=test`.

---

## Exploración con CodeGraph

> **Usa CodeGraph como primera fuente antes de leer archivos o ejecutar búsquedas de texto.**  
> El índice está en `.codegraph/codegraph.db` y cubre los tres proyectos desde la raíz.

**Ejecutar siempre desde la raíz** del repositorio:

```
# Flujo completo desde la entrada de WhatsApp hasta el despacho:
codegraph deps src/modules/whatsapp/webhook.controller.ts

# Blast radius de un cambio en la API de pedidos:
codegraph usages src/modules/orders/orders.controller.ts

# Símbolos de todos los módulos del backend:
codegraph symbols src/

# Árbol de cab-pwa:
codegraph symbols apps/cab-pwa/src/

# Árbol de ops-portal:
codegraph symbols apps/ops-portal/src/

# Quién llama al orquestador de despacho:
codegraph usages src/modules/dispatch/dispatch-orchestrator.service.ts

# Dependencias cruzadas fleet → ops-portal:
codegraph usages src/modules/fleet/fleet.service.ts
```

**Actualizar el índice** cuando el código cambie:
```
codegraph --help   # confirma el subcomando exacto en tu versión instalada
codegraph index    # re-indexa desde la raíz
```

---

## Contexto de tareas (`tasks/`)

Las tareas están en `tasks/` (raíz del repo), **no** en `.task/`:

- **`tasks/plan.md`** — especificación completa: 5 fases, 15 tareas, criterios de aceptación, decisiones de arquitectura, riesgos.
- **`tasks/todo.md`** — checklist de progreso con `[x]` / `[ ]` por tarea. Al 2026-09-28 todas las 15 tareas están completadas.

Lee `tasks/plan.md` antes de modificar cualquier módulo para entender los criterios de aceptación originales. No copies ni modifiques estos archivos.

---

## Infraestructura Docker

```
# Dev — levanta todos los servicios:
docker compose up -d
# PostgreSQL 16 + PostGIS  → localhost:5432
# Redis                    → localhost:6379
# Centrifugo v5            → localhost:8001
# OSRM Ecuador             → localhost:5000
# Evolution API v2         → localhost:8080

# Producción:
```
