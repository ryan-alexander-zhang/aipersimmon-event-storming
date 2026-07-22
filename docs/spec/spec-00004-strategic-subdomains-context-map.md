---
id: spec-00004-strategic-subdomains-context-map
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: strategic layer — subdomains + context map

> The shippable capability: lift Bounded Contexts from a visual grouping to a
> **strategic** artifact — classify each as core / supporting / generic (FR4), and
> model typed, directed **context relationships** rendered as a **Context Map**
> (FR5). Delivers [prd-00002](../prd/prd-00002-complex-business-analysis.md)
> FR4/FR5. Relationship vocabulary fixed by
> [decision-00007](../decision/decision-00007-context-relationship-vocabulary.md).

## 1. Context

analysis-00002 §4: the tool models the tactical flow well but has no bridge to
**strategic DDD** — no subdomain classification, no context relationships. This
spec adds both. It **extends the DSL** (classification on a context; a new
`contextRelationships` array) and bumps `DSL_VERSION` 3.0 → 4.0 with an additive
migration. The Context Map is a distinct view (Discovery-Mode surface pattern),
never mutating the timeline board.

New CONTEXT.md terms added at implementation (plan-00014): **Subdomain**,
**Context Relationship**, **Context Map**.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US19 | [us-00019-classify-subdomain](../us/us-00019-classify-subdomain.md) | active | Classify a Bounded Context core/supporting/generic; badge on the chip; stored in DSL |
| US20 | [us-00020-context-relationships-map](../us/us-00020-context-relationships-map.md) | active | Draw typed directed relationships between contexts; view them as a Context Map |

## 3. Cross-cutting requirements

- **spec-00004-XFR-1** (Ubiquitous) The system shall migrate pre-4.0 DSL files
  (no classification, no `contextRelationships`) deterministically: contexts load
  unclassified and relationships default to empty, without error.
- **spec-00004-XFR-2** (Ubiquitous) The system shall keep the Context Map view
  separate from the timeline board — opening/closing it never changes elements,
  order, or context membership.

### Acceptance (XAC)

- **spec-00004-XAC-1.1** (spec-00004-XFR-1)
  Given a v3.0 DSL file
  When it is imported
  Then it loads as a v4.0 model with every context unclassified and no
  relationships, without error
- **spec-00004-XAC-2.1** (spec-00004-XFR-2)
  Given a populated timeline board
  When the Modeler toggles the Context Map on and off
  Then the board's nodes, edges, order, and contexts are byte-identical on export

## 4. Technical Design

Full design in [design-00007](../design/design-00007-context-map-surface.md). Sketch:

- **DSL** (`schema.ts`): `classification?` on `contextSchema`; new
  `contextRelationshipSchema {id, source, target, type}` + `contextRelationships`
  array on `modelSchema`; `DSL_VERSION = "4.0"`. `migrate.ts`: `migrateV3toV4` =
  version bump (fields are optional/defaulted). `serialize.ts` threads
  `contextRelationships` through `toModel`/`fromModel`/`exportJSON` + callers;
  classification rides inside `contexts`.
- **Relationship types** (`lib/eventstorming/context-relations.ts`): the 5 in
  decision-00007 + `CONTEXT_RELATION_STYLE` (label/colour).
- **Store** (`store.ts`): `setContextClassification`; `contextRelationships` state +
  `addContextRelationship`/`setContextRelationshipType`/`removeContextRelationship`;
  `removeContext` prunes touching relationships; transient `contextMapOpen` +
  `toggleContextMap`, reset in `setModel`/`clear`.
- **UI**: `board-chrome.tsx` classification selector + badge on each chip;
  `context-map-canvas.tsx` (isolated RF provider) with `ContextNode` +
  `ContextRelationEdge`; `editor.tsx` view-swap branch; `toolbar.tsx` Context Map
  toggle.

## 5. Error handling

- Pre-4.0 import → additive migration (XAC-1.1); no loss, no crash.
- A relationship whose source/target context was deleted → pruned on
  `removeContext` (us-00020-AC-5.1); stale ids never render.
- Duplicate relationship between the same pair → allowed (a pair may carry more
  than one pattern); no dedup enforced in v1.

## Links

- PRD: prd-00002 (FR4, FR5) · Decision: decision-00007 · Design: design-00007 ·
  US: us-00019, us-00020 · Plan:
  [plan-00014-strategic-layer](../plan/plan-00014-strategic-layer.md)
