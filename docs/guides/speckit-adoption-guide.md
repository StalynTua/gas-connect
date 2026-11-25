# Guía de Adopción y Uso de Spec Kit en GasConnect Ibarra

Esta guía explica cómo funciona **GitHub Spec Kit** dentro del monorepo `gas-connect` (un proyecto ya inicializado con `AGENTS.md`, `CONSTRAINTS.md`, reglas DDD y `tasks/`), qué conservar del contexto anterior y cómo ejecutar el flujo día a día en Antigravity.

---

## 1. Qué quedó instalado

### Instalación global (una sola vez en tu máquina)
- **`uv`** (`0.12.23`) instalado vía Homebrew.
- **`specify-cli`** (`1.4.4`) instalado globalmente con `uv tool install specify-cli` en `~/.local/bin/specify`.

Comandos útiles del CLI en terminal:
```bash
specify version                      # Verifica versión instalada
specify check                        # Revisa herramientas e integraciones disponibles
specify extension list               # Lista extensiones instaladas en el proyecto
uv tool upgrade specify-cli          # Actualiza Spec Kit globalmente en el futuro
```

### Instalación local en `gas-connect`
Inicializado con:
```bash
specify init --here --force --non-interactive --integration agy --script sh --extension bug --extension assess
```

Esto creó únicamente dos rutas (sin sobrescribir nada de tu proyecto):
- **`.specify/`**: infraestructura de Spec Kit (scripts `sh`, plantillas, configuración de extensiones y la Constitución en `.specify/memory/constitution.md`).
- **`.agents/skills/speckit-*/SKILL.md`**: **17 skills nativas** listas para invocarse en el chat de Antigravity:
  - **9 skills Core (SDD)**: `constitution`, `specify`, `clarify`, `plan`, `tasks`, `checklist`, `analyze`, `implement`, `converge`.
  - **3 skills de Bug Triage (`bug`)**: `bug-assess`, `bug-fix`, `bug-test`.
  - **5 skills de Evaluación de Ideas (`assess`)**: `assess-intake`, `assess-research`, `assess-define`, `assess-shape`, `assess-decide`.

---

## 2. Qué hacer con el contexto anterior (Conservar vs. Reemplazar)

**Regla de oro para proyectos existentes (brownfield):** **NO borres ni reescribas retroactivamente el pasado.** Spec Kit no requiere especificar todo lo ya construido; se adopta hacia adelante, feature por feature.

| Archivo / Carpeta actual | ¿Se conserva o se reemplaza? | Rol con Spec Kit activo |
| :--- | :--- | :--- |
| **`AGENTS.md`** (raíz y `apps/*/AGENTS.md`) | **Se conserva** | Sigue siendo el manual operativo del agente (CodeGraph, convenciones ESM, protocolo Prisma ADR-004, mapa de endpoints). |
| **`CONSTRAINTS.md`** | **Se conserva (Fuente de verdad numérica)** | Define los umbrales verificables (`pnpm check:fast`, `check:task`, `check:full`, presupuestos de bundle). La Constitución de Spec Kit lo referencia explícitamente. |
| **`.agents/rules/ddd-backend.md`** | **Se conserva** | Reglas finas de importación DDD que complementan el Principio I de la Constitución. |
| **`docs/architecture/*`** | **Se conserva** | Contexto arquitectónico histórico que `/speckit-plan` lee al diseñar nuevas features. |
| **`tasks/plan.md` y `tasks/todo.md`** | **Se congelan como archivo histórico** | Documentan las fases ya completadas del MVP. **Para toda nueva feature**, los artefactos viven ahora en `specs/<NNN>-<slug>/` (`spec.md`, `plan.md`, `tasks.md`). |
| **`tasks/backlog.md`** | **Se conserva como bandeja de entrada** | Es tu fuente ideal para elegir el próximo épico (ej. `ops-auth`, `cab-dual-theme`) y pasarlo a `/speckit-specify` o `/speckit-assess-intake`. |
| **`.specify/memory/constitution.md`** | **Nuevo (ya adaptado)** | Ya quedó precargado en versión `1.0.0` con tus reglas reales de `AGENTS.md`, `CONSTRAINTS.md` y DDD. |

> **Nota sobre convivencia con `agent-skills`**: Las skills de Spec Kit orquestan el **ciclo de artefactos** (`spec → plan → tasks → implement → converge`), mientras que tus skills de ingeniería (`test-driven-development`, `frontend-ui-engineering`, `code-review-and-quality`, etc.) siguen aplicando durante `/speckit-implement`. Se complementan, no compiten.

---

## 3. Cómo definir y ajustar la base (Constitución)

`.specify/memory/constitution.md` es la **autoridad máxima** durante `/speckit-plan`, `/speckit-analyze` y `/speckit-converge`. Ya incluye:
1. **Strict DDD Layer Boundaries** (`check-ddd-boundaries.mjs`, `server.ts < 50 líneas`, cero `fetch()` en presentación).
2. **Contract & Cross-Project Compatibility** (`codegraph impact`, TypeScript estricto + `.js` ESM).
3. **Test-First & Zero Floor Violations** (TDD, `floor-guard.mjs`, `pnpm test` ≥ 40, Pino en lugar de `console.log`).
4. **Database & PostGIS Synchronization (ADR-004)** (`prisma:push` → `prisma:generate` → `prisma:seed`).
5. **Mobile Performance & Operational Accessibility** (`cab-pwa ≤ 300 kB`, `ops-portal ≤ 500 kB`, WCAG 2.1 AA/AAA).

Cuando quieras cambiar o añadir una regla de gobernanza en el futuro, **no la edites a mano**: usa la skill para mantener el versionado semántico:
```text
/speckit-constitution Añade el principio de que todo endpoint administrativo en /api/v1/fleet/* debe validar rol OPS_OPERATOR mediante middleware de sesión.
```

---

## 4. Cómo partir: elegir el proceso correcto

Spec Kit te da **3 puntos de entrada independientes**. No necesitas ejecutar SDD completo para todo:

| Situación en `gas-connect` | Proceso a usar | Carpeta de salida |
| :--- | :--- | :--- |
| **Nueva funcionalidad acotada** (ej. `ops-auth`, `cab-dual-theme` del backlog) | **SDD Core** (`/speckit-specify` → `converge`) | `specs/<NNN>-<slug>/` |
| **Bug o regresión en producción/local** (ej. timer de 45s no dispara cascada) | **Bug Triage** (`/speckit-bug-assess` → `test`) | `.specify/bugs/<slug>/` |
| **Idea grande o incierta** antes de invertir código (ej. `customer-pwa` con OTP) | **Idea Assessment** (`/speckit-assess-intake` → `decide`) | `.specify/assessments/<slug>/` |

> **Regla de oro en chat**: ejecuta **una skill por turno** en el chat de Antigravity y revisa el archivo Markdown generado antes de pasar a la siguiente.

---

## 5. Flujo A: Nueva Feature con SDD (Paso a Paso)

Tomemos como ejemplo real el primer ítem pendiente de `tasks/backlog.md`: **Autenticación en Ops Portal (`ops-auth`)**.

### Paso 1 — Especificar el *qué* y el *por qué* (sin detalles de implementación)
```text
/speckit-specify Restringir el acceso a ops-portal mediante autenticación de operadores (rol OPS_OPERATOR). Debe incluir creación de cuentas de operador, pantalla de login contra POST /api/v1/auth/login, protección de rutas del mapa en vivo/métricas/eventos, logout, y visualización diferenciada de camiones OFF_DUTY en el mapa. Mantener intactos los endpoints consumidos por cab-pwa.
```
- **Resultado**: crea `specs/001-ops-portal-auth/spec.md` y registra el directorio activo en `.specify/feature.json`.
- **Qué revisar**: historias de usuario (P1, P2…), criterios de aceptación medibles y límites de compatibilidad.

### Paso 2 — Despejar ambigüedades *(muy recomendado en proyectos existentes)*
```text
/speckit-clarify
```
- Escanea 9 categorías (alcance, datos, UX, seguridad, edge cases, etc.) y te hace **hasta 5 preguntas concretas** (ej. expiración de sesión, almacenamiento del JWT, qué pasa cuando vence el token durante el polling de 5s).
- Actualiza `spec.md` directamente con tus respuestas.

### Paso 3 — Diseñar el plan técnico sobre el monorepo actual
```text
/speckit-plan Reutilizar el módulo auth existente en apps/api (Argon2id + JWT/sesiones) respetando estrictamente las capas DDD y el barrel modules/auth/index.js. En ops-portal mantener las llamadas HTTP en infrastructure/ y no superar el presupuesto de 500 kB. Verificar impacto en cab-pwa con codegraph impact.
```
- **Resultado**: genera `plan.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md`, verificando el *Constitution Check*.

### Paso 4 — Validar calidad de requisitos *(opcional, útil para seguridad/auth)*
```text
/speckit-checklist Enfócate en seguridad de sesiones, manejo de expiración de token durante polling y control de acceso por rol OPS_OPERATOR.
```
- Genera `specs/001-ops-portal-auth/checklists/security.md` ("unit tests para el inglés de la spec"). **Importante**: `/speckit-implement` se detendrá a pedir confirmación si dejas ítems sin marcar `[x]`.

### Paso 5 — Generar tareas atómicas ordenadas por dependencias
```text
/speckit-tasks
```
- Genera `specs/001-ops-portal-auth/tasks.md` agrupado por fases e historias de usuario, con marcadores `[P]` para tareas paralelizables y rutas exactas de archivo.

### Paso 6 — Auditoría cruzada antes de escribir código *(read-only)*
```text
/speckit-analyze
```
- Cruza `spec.md`, `plan.md`, `tasks.md`, `data-model.md` y `constitution.md` sin modificar archivos. Corrige cualquier hallazgo `CRITICAL` o `HIGH` antes de implementar.

### Paso 7 — Implementar fase por fase
```text
/speckit-implement
```
- Ejecuta las tareas de `tasks.md` respetando TDD, DDD y las puertas de `CONSTRAINTS.md` (`pnpm check:fast` / `pnpm check:task`).
- Puedes pedirle que avance por fases (ej. `/speckit-implement Ejecuta solo Phase 1 y Phase 2`).

### Paso 8 — Bucle de convergencia *(cierre de brechas real)*
```text
/speckit-converge
```
- Inspecciona el **código real** (sin fiarse de checkboxes marcados) contra `spec.md`, `plan.md`, `tasks.md` y la Constitución.
- Si encuentra huecos, añade `## Phase N: Convergence` al final de `tasks.md`. Entonces vuelves a correr `/speckit-implement` y luego `/speckit-converge` hasta que reporte **`Converged`**.
- Cierra con `pnpm check:full` y `codegraph sync`.

---

## 6. Flujo B: Corrección de Bugs (`bug`)

Úsalo para cualquier fallo sin crear una spec completa:

```text
/speckit-bug-assess "Cuando un camión rechaza una oferta, la cascada no pasa al siguiente candidato si el stock era exacto." slug=dispatch-cascade-reject
```
Revisa `.specify/bugs/dispatch-cascade-reject/assessment.md` y luego:
```text
/speckit-bug-fix slug=dispatch-cascade-reject
/speckit-bug-test slug=dispatch-cascade-reject
```
Solo un veredicto **`verified`** (no `partial` ni `failed`) da el bug por cerrado.

---

## 7. Flujo C: Evaluar una Idea (`assess`)

Úsalo para épicos grandes del backlog como `customer-pwa` antes de diseñar código:

```text
/speckit-assess-intake "PWA ciudadana para pedir gas con OTP por WhatsApp e historial de direcciones" slug=customer-pwa
/speckit-assess-research slug=customer-pwa
/speckit-assess-define slug=customer-pwa
/speckit-assess-shape slug=customer-pwa
/speckit-assess-decide slug=customer-pwa
```
Si `.specify/assessments/customer-pwa/decision.md` resulta en **`go`**, pasas su resumen de handoff directamente a `/speckit-specify`. Si resulta en `kill`, ahorraste semanas de desarrollo con evidencia documentada.

---

## 8. Personalización y Mantenimiento en `gas-connect`

### Extensiones adicionales opcionales
Si más adelante quieres automatizar ramas/commits o crear GitHub Issues desde `tasks.md`:
```bash
specify extension add git             # Crea ramas y hooks opcionales de commit en cada fase
specify extension add github          # Añade /speckit-github-taskstoissues (usa github-mcp-server)
specify extension add agent-context   # Añade /speckit-agent-context-update
```
*(No se instaló `git` por defecto para no imponer hooks automáticos de creación de ramas mientras te adaptas al flujo.)*

### Overrides locales de plantillas
Si quieres que toda `spec.md` o `plan.md` de `gas-connect` incluya siempre una sección obligatoria (por ejemplo, *"Impacto CodeGraph en Frontends"* o *"Plan de sincronización Prisma/PostGIS"*), puedes añadir un override local en `.specify/templates/overrides/` sin modificar las plantillas core.

### Qué versionar en Git
- **Sí versionar**: `.specify/memory/constitution.md`, `.specify/templates/`, `.specify/extensions.yml`, `.specify/init-options.json`, `.agents/skills/speckit-*/` y `specs/`.
- **Ignorar o revisar**: `.specify/.gitignore` ya protege archivos temporales de runtime. Al hacer tu primer commit de adopción, revisa `git status` para confirmar que no se incluyan secretos ni archivos locales temporales.

---

## 9. Cómo combinar Spec Kit con Ponytail sin conflictos

**Spec Kit** y **Ponytail** resuelven problemas distintos y se complementan bien si respetas su rol:
- **Spec Kit** gobierna el **qué y la trazabilidad** (`spec → plan → tasks → implement → converge`).
- **Ponytail** gobierna el **tamaño y simplicidad del diff** (reutilizar código existente, evitar dependencias/abstracciones innecesarias). Ponytail respeta las capas DDD existentes y nunca recorta validaciones, seguridad ni requisitos explícitos.

### Reglas de convivencia (para evitar choques)
1. **Alcance de sesión de Ponytail**: `/ponytail` queda activo toda la sesión hasta que escribes `stop ponytail` o `normal mode`. Actívalo solo al **diseñar** e **implementar**, y desactívalo antes de auditar o converger.
2. **Jerarquía en tests y arquitectura**: `.specify/memory/constitution.md` y `CONSTRAINTS.md` siempre tienen prioridad sobre Ponytail en **TDD** y **límites DDD**. Ponytail recorta complejidad innecesaria, nunca tests ni fronteras de capa.
3. **Atajos `shortcut:` compatibles con `floor-guard.mjs`**: `CONSTRAINTS.md` prohíbe `TODO`, `@ts-ignore` y `eslint-disable`, pero permite documentar decisiones acotadas con `// shortcut: <límite>, <cuándo mejorar>`, auditable luego con `/ponytail-debt`.

### Mapa de uso por fase

| Fase | Modo recomendado | Propósito |
| :--- | :--- | :--- |
| `/speckit-specify` y `/speckit-clarify` | **Normal** *(o `/ponytail ultra` solo si quieres recortar alcance antes de definir)* | Capturar requisitos completos sin recortar criterios de aceptación. |
| `/speckit-plan` | **`/ponytail full`** (o `lite`) | Evitar planes sobre-ingenierizados y proteger los presupuestos de bundle (`cab-pwa ≤ 300 kB`, `ops-portal ≤ 500 kB`). |
| `/speckit-tasks` y `/speckit-analyze` | **Normal** (`stop ponytail`) | Desglose y reporte de consistencia completos. |
| `/speckit-implement` | **`/ponytail full`** | Escribir el menor diff limpio que cumple cada tarea respetando DDD y `pnpm check:fast`. |
| `/speckit-converge` | **Normal** (`stop ponytail`) | Verificar que no falte nada contra `spec.md`, `plan.md` y `tasks.md`. |
| **Pre-merge / PR** | **`/ponytail-review`** | Complemento de `converge`: caza bugs de borde, carga, seguridad y líneas sobrantes (`Lean: -N lines possible`). |
| **Mantenimiento periódico** | **`/ponytail-debt`** | Listar todos los comentarios `shortcut:` para que ningún atajo quede olvidado. |

### Secuencia recomendada

```text
1. /speckit-specify ...                 # modo normal
2. /speckit-clarify                     # modo normal
3. /ponytail full                       # anti-bloat para diseño
4. /speckit-plan ...
5. stop ponytail
6. /speckit-tasks
7. /speckit-analyze
8. /ponytail full                       # diff mínimo para implementación
9. /speckit-implement
10. stop ponytail
11. /speckit-converge                   # completitud vs spec
12. /ponytail-review                    # calidad, bugs y bloat antes de merge
```

