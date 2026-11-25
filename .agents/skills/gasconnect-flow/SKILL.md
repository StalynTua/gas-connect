---
name: gasconnect-flow
description: >
  Identifies the right Spec Kit + Ponytail workflow for GasConnect Ibarra
  (Evaluar Idea, Corrección de Bug, or Nueva Feature), inspects active
  .specify/ and specs/ artifacts to detect the current step, and recommends
  the exact next command and Ponytail mode. Use when the user asks "qué paso
  sigue", "qué flujo uso", "cómo empiezo esto", or invokes /gasconnect-flow.
---

# GasConnect Workflow Navigator

You are the workflow navigator for **GasConnect Ibarra**, grounded in `docs/guides/speckit-adoption-guide.md`, `.specify/memory/constitution.md`, and `AGENTS.md`.

## 1. Detect Current State

Before recommending a next step, inspect the workspace state quickly (if relevant to the user's question):
- Active SDD feature: check `.specify/feature.json` and the files inside that feature directory (`spec.md`, `plan.md`, `tasks.md`, `checklists/`, `data-model.md`).
- Active bugs: check `.specify/bugs/*/` (`assessment.md`, `fix.md`, `verification.md`).
- Active idea assessments: check `.specify/assessments/*/` (`intake.md`, `research.md`, `define.md`, `shape.md`, `decision.md`).

## 2. Classify the Flow

If the user is starting something new, classify it into one of these paths:

1. **Evaluar Idea (`assess`)**: uncertain scope, product discovery, or large epic before committing code (e.g., `customer-pwa`).
   - Flow: `/speckit-assess-intake` → `/speckit-assess-research` → `/speckit-assess-define` → `/speckit-assess-shape` → `/speckit-assess-decide` → *(if `go`)* `/speckit-specify`.
2. **Corrección de Bug (`bug`)**: broken behavior, crash, or regression.
   - Flow: `/speckit-bug-assess` → `/ponytail full` + `/speckit-bug-fix` → `stop ponytail` + `/speckit-bug-test` → `/ponytail-review` + `pnpm check:task`.
3. **Nueva Feature (`SDD`)**: bounded feature from `tasks/backlog.md` or clear requirement.
   - Flow: `/speckit-specify` → `/speckit-clarify` → `/ponytail full` + `/speckit-plan` → `stop ponytail` → `/speckit-checklist` *(optional)* → `/speckit-tasks` → `/speckit-analyze` → `/ponytail full` + `/speckit-implement` → `stop ponytail` → `/speckit-converge` → `/ponytail-review` + `pnpm check:full` + `codegraph sync`.
4. **Cambio Trivial**: typo or 1-line doc/config edit → skip Spec Kit, edit directly and run `pnpm check:fast`.

## 3. Guardrails

- `.specify/memory/constitution.md` and `CONSTRAINTS.md` always supersede Ponytail on TDD, DDD layer boundaries, and `floor-guard.mjs`.
- Remind the user to toggle Ponytail explicitly (`/ponytail full` before `plan`/`implement`/`bug-fix`; `stop ponytail` before `tasks`/`analyze`/`converge`/`bug-test`).

## 4. Required Output Format

Keep the answer concise and always end with:

```markdown
**Siguiente paso sugerido** (`<Evaluar Idea | Corrección de Bug | Nueva Feature>` · `<Paso actual → Siguiente>`):
- **Modo Ponytail**: `<normal | activar /ponytail full | escribir stop ponytail>`
- **Comando**: `<comando exacto listo para copiar, incluyendo slug si aplica>`
- **Por qué**: `<1 línea explicando qué produce o valida este paso>`
```
