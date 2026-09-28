# 03 — Rule Standards for AI Tooling

Input: docs/architecture/01-analisis-backend.md (Section 7 — Current AI Rules System)

---

## 1. AI Tooling Format Table

| Tool | File name / location | Format / frontmatter | Path scoping | Source consulted |
|---|---|---|---|---|
| **Antigravity IDE / Claude-compatible** (primary) | `AGENTS.md` or `AGENTS-<project>.md` at any directory level; `.agents/rules/*.md` for scoped rules | Plain Markdown, no frontmatter. Agent reads all AGENTS.md files found in the path from root to the file being edited. | **No glob selectors.** Scoping is achieved by placing the file in the relevant subdirectory (e.g., `apps/cab-pwa/AGENTS.md` only loads when editing files under `apps/cab-pwa/`). `.agents/rules/` files are loaded as rules from the workspace customization root. | Existing repo files: AGENTS.md, AGENTS-backend.md, apps/*/AGENTS.md (confirmed format by inspection). Antigravity customization system: `.agents/rules/` directory is the workspace rules location per system instructions. |
| **JetBrains AI (Junie)** | `.junie/plans/` | JSON plan format | Not a rule system — plans are execution artifacts | Confirmed by .junie/plans/ directory inspection. No architectural rule format supported. |

> **Conclusion on scoping:** The AGENTS.md system achieves scoping by directory placement. Rules that apply only to the backend should go in a file at the root or in `.agents/rules/` with a clear scope statement. Rules for cab-pwa should go in `apps/cab-pwa/AGENTS.md` or in a separate rule file with an explicit header. The `.agents/rules/` directory (workspace customization root) is the canonical location for rules that Antigravity loads as structured rules — distinct from the inline documentation in AGENTS.md files.

---

## 2. Rule Quality Standards

Every rule generated in Phase 4 must comply with all of the following:

### Q1 — Imperative and verifiable
Every instruction is written as a command ("Do X", "Never Y"). Each can be verified by inspecting imports, file names, or directory structure. No vague advice.

GOOD: "Never import from an infrastructure file in a domain file. Check: grep for 'prisma' or 'fetch' in any domain/ file — none must appear."
BAD: "Try to keep the domain clean."

### Q2 — Contains only what AI cannot deduce from reading the code
Rules describe non-obvious constraints: dependency direction, prohibited import patterns, layer boundaries. They do not repeat TypeScript syntax or basic React patterns.

### Q3 — Scoped to the correct project
Backend rules must not load when editing cab-pwa files, and vice versa. Achieved by placing each rule in the project's AGENTS.md or in a project-scoped rule file.

### Q4 — Single responsibility
Each rule file covers one topic (layer boundaries, naming conventions, error handling). It does not contradict other rule files or AGENTS.md content.

### Q5 — Size limit: up to 200 lines
If a rule exceeds 200 lines, split it by topic, not by project. Enforce this at generation time.

### Q6 — No content duplication
Each fact lives in exactly one place. AGENTS.md points to the rule file; the rule file does not repeat AGENTS.md content.

### Q7 — Examples use real stack
Code examples use Fastify, Prisma, Zod, React, Zustand/useSyncExternalStore — never generic pseudocode.

### Q8 — Checklist is binary (yes/no per item)
The pre-commit checklist uses items that can be answered yes or no, not graded on a scale.

---

## 3. File Naming Convention for Rules

Existing convention in this repo: kebab-case files (dispatch-orchestrator.service.ts, truck-finder.service.ts). Apply the same to rule files.

| Rule file | Location | Scope |
|---|---|---|
| ddd-backend.md | .agents/rules/ddd-backend.md | Backend API (src/ path) |
| ddd-cab-pwa.md | apps/cab-pwa/.agents/rules/ddd-cab-pwa.md OR inline in apps/cab-pwa/AGENTS.md | cab-pwa only |
| ddd-ops-portal.md | apps/ops-portal/.agents/rules/ddd-ops-portal.md OR inline in apps/ops-portal/AGENTS.md | ops-portal only |

Decision: Because the Antigravity system reads `.agents/rules/` from the workspace customization root (repo root), and because the frontends are subprojects that should have their rules loaded only when editing their files, the safest approach is:
- Backend rule: `.agents/rules/ddd-backend.md` (loaded from root)
- cab-pwa rule: appended to `apps/cab-pwa/AGENTS.md` under a new "DDD Architecture Rules" section
- ops-portal rule: appended to `apps/ops-portal/AGENTS.md` under a new "DDD Architecture Rules" section

This avoids creating nested .agents/ directories whose loading behavior cannot be verified from documentation alone.

> CONFIRMED FORMAT: No frontmatter. Plain Markdown. Section headers. The agent reads the entire file when that AGENTS.md is in scope.
