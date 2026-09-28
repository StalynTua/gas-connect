# 04 — AGENTS.md Changes Summary

## Decision

All four AGENTS.md files were modified with the minimum necessary addition. No existing content was removed or duplicated.

## Changes Made

### 1. AGENTS.md (root)

Added at end of file: a "DDD Architecture Rules" section with a 3-row table pointing to each project's rule location.

Rationale: the root AGENTS.md is the first file read in any session. It is the appropriate place for a cross-project index of DDD rules.

No existing content removed. No rule content duplicated here — only pointers.

### 2. AGENTS-backend.md

Added before "Rules for agents" section: a "DDD Architecture Rules" section pointing to .agents/rules/ddd-backend.md with a one-line scope description.

Rationale: agents working on the backend read AGENTS-backend.md. This section ensures the DDD rule is discoverable without requiring them to find it via root AGENTS.md.

No existing content removed. No rule content duplicated — the actual rule content lives only in .agents/rules/ddd-backend.md.

### 3. apps/cab-pwa/AGENTS.md

Appended: a full "DDD Architecture Rules" section (Sections 1-8: layers, folder structure, dependency rules, cohesion rules, low-coupling rules, naming, checklist, prohibitions).

Rationale: the Antigravity system loads apps/cab-pwa/AGENTS.md when editing files in apps/cab-pwa/. Since no separate .agents/rules/ scoping mechanism is verified for subdirectories, the rule is embedded directly in the project's AGENTS.md to guarantee it loads.

No existing content removed. The new section is clearly separated by a horizontal rule.

### 4. apps/ops-portal/AGENTS.md

Appended: a full "DDD Architecture Rules" section (same structure as cab-pwa, adapted to ops-portal's context).

Rationale: same as cab-pwa.

No existing content removed.

## Verification: No Contradictions or Duplications

| Potential conflict | Resolution |
|---|---|
| AGENTS-backend.md already has a "Rules for agents" section | The new DDD section is placed ABOVE it, not merged into it |
| cab-pwa AGENTS.md already mentions "business state in cabStore.ts" | The DDD rule extends this to layer structure; it does not contradict it |
| ops-portal AGENTS.md already warns about Centrifugo not being wired | The DDD rule reinforces this prohibition; it does not contradict it |
| root AGENTS.md has "Shared conventions" section | DDD rules are in a separate section; shared conventions remain unchanged |

## Reachability Check

| Rule | Reachable from AGENTS.md? |
|---|---|
| .agents/rules/ddd-backend.md | YES — via AGENTS.md table and AGENTS-backend.md section |
| cab-pwa DDD rules (in AGENTS.md) | YES — via AGENTS.md table pointing to apps/cab-pwa/AGENTS.md |
| ops-portal DDD rules (in AGENTS.md) | YES — via AGENTS.md table pointing to apps/ops-portal/AGENTS.md |
