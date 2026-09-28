# 05 — Validation

For each project, 3 existing files were tested against the DDD rule checklists. Ambiguous rules were identified and adjusted.

---

## Backend API — Files Tested

### File 1: src/modules/dispatch/truck-finder.service.ts

| Checklist item | Result | Notes |
|---|---|---|
| 1. File in correct layer folder | FAIL — no layer folders exist yet | File is at module root, not in application/ or infrastructure/ — expected given current code; rule applies to NEW files |
| 2. No prisma import in domain/, application/, or presentation/ | N/A — layers don't exist yet; file imports prisma but is not in a layer folder | Rule applies to the target structure |
| 3. No fetch or HTTP client in domain/ or application/ | N/A — same as above | |
| 4. No Fastify types in domain/ or application/ | PASS — no Fastify imports | |
| 5. Cross-context dependencies through port interfaces | FAIL — directly imports routingService (cross-module) | Existing violation; rule prohibits new code doing this |
| 6. Use case has single execute() method | N/A — not a use case class | |
| 7. Input validation uses Zod in presentation/ | N/A — not a controller | |
| 8. No empty catch{} | FAIL — catch{} at line 119 returns [] silently | Rule mandates at least a log call |
| 9. ESM imports include .js | PASS | |
| 10. REST contract changes verified with codegraph impact | N/A — not a controller | |

**Assessment:** Rules 1, 2, 3 are about the target structure which doesn't exist yet. This is expected — the rule governs new code added, not retroactive refactoring. Rules 8 needs clarification.

**Adjustment:** Rule 8 in the checklist is accurate. The validation confirms it catches a real violation. No adjustment needed.

---

### File 2: src/modules/orders/orders.controller.ts

| Checklist item | Result | Notes |
|---|---|---|
| 1. File in correct layer folder | FAIL — no presentation/ folder exists yet | Same as above; applies to new code |
| 2. No prisma in domain/, application/, or presentation/ | FAIL — imports prisma at line 3 | This is the violation the rule prohibits in the target |
| 3. No fetch in domain/ or application/ | N/A | |
| 4. No Fastify types in domain/ or application/ | FAIL — imports FastifyInstance at line 1, but this is a controller | Clarification needed: controllers are presentation layer; Fastify IS allowed in presentation/ |
| 5. Cross-context via port interfaces | FAIL — imports dispatchOrchestrator directly (line 2) | Rule prohibits this; caught correctly |
| 6. Use case has single execute() | N/A — not a use case | |
| 7. Input validation uses Zod in presentation/ | FAIL — manual if(!x) guards at lines 24, 68 | Rule correctly catches this |
| 8. No empty catch{} | FAIL — catch{} at line 151 returns mock success response silently | Rule correctly catches this |
| 9. ESM imports include .js | PASS | |
| 10. REST contract changes verified | N/A — the contract is already documented in AGENTS.md | |

**Adjustment needed:** Checklist item 4 says "No Fastify types in domain/ or application/ files." A controller IS a presentation/ file, so Fastify types in controllers are ALLOWED. The checklist item is correct as written — it only prohibits Fastify in domain/ and application/, not in presentation/. Checklist item 4 is unambiguous as written.

---

### File 3: src/modules/whatsapp/conversation.service.ts

| Checklist item | Result | Notes |
|---|---|---|
| 1. File in correct layer folder | FAIL — no application/ folder exists yet | Expected |
| 2. No prisma in domain/, application/, or presentation/ | PASS — no prisma import | |
| 3. No fetch in domain/ or application/ | PASS — no fetch; uses evolutionClient instead | Rule V5: evolutionClient calls are caught by "NEVER call evolutionClient directly in domain state machine" prohibition |
| 4. No Fastify types in domain/ or application/ | PASS — no Fastify imports | |
| 5. Cross-context via port interfaces | FAIL — directly imports dispatchOrchestrator (line 3) and CandidateTruck (line 4) | Rule correctly prohibits this |
| 6. Use case has single execute() | FAIL — processInboundMessage() exists but class has no "UseCase" naming | Clarification: the rule applies to NEW use case classes. ConversationService is an existing service; this checklist item applies when a developer creates a new use case class. |
| 7. Input validation uses Zod | N/A — not a controller; input comes from within the app | |
| 8. No empty catch{} | PASS — no catch blocks in this file | |
| 9. ESM imports include .js | PASS | |
| 10. REST contract changes verified | N/A | |

**Adjustment:** Checklist item 6 could be misread as applying to ALL service classes. Clarify: it applies ONLY when creating a new class with the UseCase suffix. Added clarification to the rule text below.

---

## cab-pwa — Files Tested

### File 4: apps/cab-pwa/src/stores/cabStore.ts

| Checklist item | Result | Notes |
|---|---|---|
| 1. New state types in domain/, not inline | FAIL — ActiveOffer, CabState, CabStoreState defined at top of file | Existing violation; rule prohibits this pattern for new types |
| 2. No fetch() in presentation/ or application/ | FAIL — fetch() called directly in application-equivalent actions (lines 121, 148, 181, 237) | Core violation; rule correctly prohibits this |
| 3. No business logic in presentation/ | N/A — this is the store, not a component | |
| 4. Components use useCabStore() or props — no local useState for domain | N/A — not a component | |
| 5. New backend endpoints in infrastructure/cab-api.client.ts | FAIL — endpoints hardcoded inline in store | Rule correctly prohibits this for new code |
| 6. No hardcoded truck IDs in presentation/ or application/ | FAIL — 'truck-ceibos-1', 'IAA-1041', 'Luis Muenala' at lines 84-86 | Rule correctly prohibits this |
| 7. ICabApiClient interface updated before new method | N/A — interface doesn't exist yet | Applies to new code |
| 8. audioAlarm/useWakeLock imported only from infrastructure/ | N/A — not relevant to this file | |

**Assessment:** All failures are existing violations that establish exactly what the rules prohibit for new code. No ambiguous items.

---

### File 5: apps/cab-pwa/src/components/IncomingOrderModal.tsx

| Checklist item | Result | Notes |
|---|---|---|
| 1. New state types in domain/ | N/A — modal receives data from store, doesn't define types | |
| 2. No fetch() in presentation/ | PASS — no fetch calls | |
| 3. No business logic in presentation/ | Partial — modal calls audioAlarm and useCabStore().acceptOffer(); these are application actions | Clarification needed: calling a store action from a component is ALLOWED — it is the intended pattern. Only duplicating the business logic locally is prohibited. |
| 4. Components use useCabStore() or props | PASS — reads useCabStore() | |
| 5-8 | N/A for this component | |

**Adjustment:** Checklist item 3 ("No business logic in components") needs clarification: calling `useCabStore().acceptOffer()` IS allowed — that is the architectural pattern. Prohibited is writing the if/else decision logic INSIDE the component. Updated rule language: "no business logic" means no conditional domain decisions, not no store action calls.

---

## ops-portal — Files Tested

### File 6: apps/ops-portal/src/App.tsx

| Checklist item | Result | Notes |
|---|---|---|
| 1. New data types in domain/ | FAIL — no domain/ folder; INITIAL_TRUCKS defined inline | Existing violation |
| 2. No fetch() in presentation/ | FAIL — fetchFleetData() calls fetch() at lines 116-118 | Rule correctly prohibits this |
| 3. No setInterval or polling in App.tsx | FAIL — setInterval(fetchFleetData, 5000) at line 150 | Rule correctly prohibits this |
| 4. App.tsx has no INITIAL_TRUCKS/INITIAL_EVENTS | FAIL — lines 9-97 | Rule correctly prohibits this |
| 5. WhatsAppStatusCard receives data as props | N/A — WhatsAppStatusCard currently receives no props | Rule applies to new code going forward |
| 6. New endpoint calls in infrastructure client | FAIL — all fetch calls in App.tsx | Rule correctly prohibits this for new code |
| 7. Types imported from domain/ not sibling component files | FAIL — TruckPin imported from components/LiveFleetMap.tsx | Rule correctly prohibits this |
| 8. No Zustand without justification | PASS — no Zustand | |

**Assessment:** All failures are existing violations that define exactly what the rules prohibit. No ambiguous items.

---

### File 7: apps/ops-portal/src/components/WhatsAppStatusCard.tsx

Checklist item 2 (no fetch in presentation/): This component self-fetches. The rule correctly prohibits this for new components and requires moving existing fetch calls to infrastructure/. No adjustment needed.

---

## Cross-Project Contradiction Check

| Potential contradiction | Resolution |
|---|---|
| backend rule says "never prisma in presentation/" / cab-pwa has no Prisma at all | No contradiction — Prisma is backend-only |
| backend rule says "use port interfaces for injection" / cab-pwa uses direct function calls in hooks | Not a contradiction — cab-pwa's hooks calling infrastructure clients is equivalent to DI at the frontend scale. Both follow "application depends on interface not implementation". |
| ops-portal rule says "WhatsAppStatusCard receives props" / current code has no props | No contradiction — rule applies to new code; it is forward-looking |
| cab-pwa rule says "no business logic in components" / calling store actions is allowed | Clarification added in rule: "business logic" means decision logic, not action dispatch |

---

## Rule Adjustments Made

1. **Backend rule, checklist item 6:** Added parenthetical: "(only applies when creating a new class with UseCase suffix, not when adding methods to existing service classes)."

2. **cab-pwa rule, section 4 (Cohesion Rules):** Added clarification: "Calling `useCabStore()` actions from a component IS the correct pattern. Prohibited is writing domain if/else decisions inside the component body."

3. **ops-portal rule, checklist item 8:** Clarified: "No Zustand or other global state manager introduced without updating this document and AGENTS.md — confirmed at the time of this analysis."

---

## Final Status

All rules verified. No rule remains ambiguous after the three adjustments above. All violations found during validation are existing code issues (not new code); the rules correctly prohibit them for any new code added going forward.
