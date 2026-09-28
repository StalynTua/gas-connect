---
sessionId: session-260928-023046-io6l
---

# Requirements

### Overview & Goals
The objective of this task is to translate all `AGENTS.md` and related agent instruction files across the GasConnect Ibarra repository from Spanish to English. Translating these documents maximizes clarity, onboarding efficiency, and automated agent comprehension while standardizing technical documentation throughout the codebase.

### Scope
- **In Scope:**
  - `AGENTS.md` (root monorepo overview)
  - `AGENTS-backend.md` (backend Fastify API documentation)
  - `apps/cab-pwa/AGENTS.md` (cabin assistant PWA documentation)
  - `apps/ops-portal/AGENTS.md` (operations dashboard documentation)
- **Out of Scope:**
  - Modifying code files (`*.ts`, `*.tsx`, `*.json`, `*.sql`).
  - Translating task logs or historical execution plans in `.junie/` or `tasks/` unless explicitly specified.

### User Stories
- **As an AI Agent or Developer**, I want clear and consistent English documentation in all `AGENTS*.md` files so that I can understand the system architecture, REST contracts, and operational guidelines without language ambiguity.
- **As a Repository Maintainer**, I want all relative markdown links and code identifiers preserved so that cross-file navigation remains seamless.

### Functional Requirements
- Translate all headings, body text, tables, bullet points, callouts, and notes into professional English.
- Preserve all code snippets, file paths, endpoint names (`POST /api/v1/dispatch/decision`, `GET /api/v1/fleet/status`, etc.), CLI commands, and markdown formatting.
- Maintain identical document structures and cross-references between the root file and subproject documents.

# Technical Design

### Current Implementation
The repository contains 4 active AGENTS documentation files written in Spanish:
1. `AGENTS.md`: Root document outlining monorepo layout, shared conventions, cross-project dependencies, and CodeGraph usage.
2. `AGENTS-backend.md`: Backend guide covering Fastify architecture, module boundaries (`whatsapp`, `dispatch`, `routing`, `fleet`, `orders`), Prisma conventions, and agent constraints.
3. `apps/cab-pwa/AGENTS.md`: Guide for the driver assistant PWA, explaining `cabStore.ts` state management, audio alarms, WakeLock, and backend interactions.
4. `apps/ops-portal/AGENTS.md`: Guide for the operations portal, explaining Leaflet live fleet mapping, 5s HTTP polling, mock fallbacks, and UI component composition.

### Key Decisions
- **Complete In-Place Translation:** Replace Spanish text directly in each respective markdown file to avoid fragmentation and ensure immediate accessibility for all agents and contributors.
- **Domain Terminology Consistency:** Standardize domain terminology (e.g., *dispatch cascade*, *order lifecycle*, *truck candidate filtering*, *offer acceptance timeout*, *telemetry reporting*).
- **Preserve Code and Links:** Retain exact endpoint paths, npm commands, parameter names, and relative markdown links (`[./AGENTS-backend.md](./AGENTS-backend.md)`, `[../../AGENTS.md](../../AGENTS.md)`).

### Target File Structure & Mappings
| File Path | Description | Key Topics |
|---|---|---|
| `AGENTS.md` | Monorepo overview | System summary, frontend-backend contracts, CodeGraph tools, shared rules |
| `AGENTS-backend.md` | Backend API | Fastify architecture, modules, PostGIS/OSRM routing, commands, agent guidelines |
| `apps/cab-pwa/AGENTS.md` | Driver Cabin PWA | PWA views, reactive micro-store, telemetry calls, WakeLock, audio alerts |
| `apps/ops-portal/AGENTS.md` | Dispatch Ops Portal | Dashboard layout, Leaflet fleet map, 5s polling, KPI metrics, event logging |

### Quality & Verification Strategy
- Verify that markdown syntax (tables, code blocks, blockquotes) is valid.
- Verify that all relative links resolve correctly.
- Ensure that no technical identifiers or CLI commands are altered.

# Delivery Steps

### ✓ Step 1: Translate root AGENTS.md
The root `AGENTS.md` file is fully translated into clear, accurate English while maintaining all table structures, link references, and CodeGraph instructions.

- Translate overview sections explaining GasConnect Ibarra monorepo architecture (WhatsApp orders, PostGIS/OSRM routing, 45s dispatch cascade, Centrifugo coordination).
- Translate the cross-project dependencies section detailing endpoints consumed by `cab-pwa` and `ops-portal`.
- Translate shared conventions, CodeGraph CLI exploration guides, and task context pointers (`tasks/plan.md`, `tasks/todo.md`).
- Ensure all relative markdown links (`./AGENTS-backend.md`, `apps/cab-pwa/AGENTS.md`, `apps/ops-portal/AGENTS.md`) remain intact and valid.

### ✓ Step 2: Translate AGENTS-backend.md
The `AGENTS-backend.md` file is translated into idiomatic English with consistent technical terminology across modules, commands, and rules.

- Translate Fastify backend architecture description, tech stack specifications, and directory breakdown.
- Translate module documentation (`whatsapp`, `dispatch`, `routing`, `fleet`, `orders`, `lib/prisma.ts`) and CodeGraph verification mappings.
- Translate development commands (`npm run dev`, `prisma:*`, `dev:cab`, `dev:ops`), code conventions, and strict agent guidelines (e.g., migrations, `.env` handling, 45s dispatch timeout).

### ✓ Step 3: Translate apps/cab-pwa/AGENTS.md
The `apps/cab-pwa/AGENTS.md` documentation file is translated into accurate English for the cabin assistant PWA subproject.

- Translate the purpose and stack sections (Vite, React, TypeScript, Tailwind, `useSyncExternalStore` store, WakeLock, audio alarms).
- Translate architecture, component breakdown (`ActiveDeliveryView`, `IdleView`, `IncomingOrderModal`), and `cabStore.ts` action mappings.
- Translate local commands, CodeGraph exploration commands, and subproject-specific agent rules.

###   Step 4: Translate apps/ops-portal/AGENTS.md
The `apps/ops-portal/AGENTS.md` documentation file is translated into precise English detailing dashboard polling, components, and integration constraints.

- Translate the purpose, stack, and architecture sections (Vite, React, Leaflet map, 5s HTTP polling in `App.tsx`, static Centrifugo badge notes).
- Translate component structure (`LiveFleetMap`, `TrucksList`, `MetricsCards`, `ActivityLog`, `WhatsAppStatusCard`) and data contracts (`TruckPin`, `ActivityEvent`).
- Translate CLI commands, CodeGraph exploration guides, and strict rules preventing premature realtime assumptions or unneeded global stores.