---
id: record-00014-strategic-layer-acceptance
type: record
role: main
status: active
parent: plan-00014-strategic-layer
---

# Acceptance record: strategic layer — subdomains + context map

Acceptance evidence for [plan-00014](../plan/plan-00014-strategic-layer.md),
implementing [us-00019](../us/us-00019-classify-subdomain.md) and
[us-00020](../us/us-00020-context-relationships-map.md) per
[spec-00004](../spec/spec-00004-strategic-subdomains-context-map.md) /
[design-00007](../design/design-00007-context-map-surface.md), relationship
vocabulary per [decision-00007](../decision/decision-00007-context-relationship-vocabulary.md).
Delivered in two stages (FR4 classification, then FR5 relationships + Context
Map). Verified 2026-07-22. An independent subagent cross-checked every us-00019 /
us-00020 GWT and both spec-00004-XAC scenarios; verdict **PASS**. The one WEAK item
(XAC-2.1 e2e omitted an `edges` check) was closed by adding the assertion.

## Gate results

- Unit: **212 passed** (`bun run test`); `lib/**` coverage ≥90% lines/funcs
  (`serialize.ts` 100%, `store.ts` 100% lines, `context-relations.ts`/`context-color.ts`
  covered by new unit tests).
- E2E: **40 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT / XAC coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00019-AC-1.1 (classify → badge) | store.test.ts "sets and clears a context's subdomain classification"; e2e "classifies a Bounded Context…" | pass |
| us-00019-AC-2.1 (clear classification) | store.test.ts same; e2e clears select | pass |
| us-00019-AC-3.1 (classification round-trips) | serialize.test.ts "round-trips a context's subdomain classification"; e2e export | pass |
| us-00019-AC-4.1 (pre-4.0 file → unclassified) | serialize.test.ts "imports a pre-strategic v3.0 file as an unclassified v4 model" | pass |
| us-00020-AC-1.1 (map renders contexts + relationship) | e2e "Context Map renders contexts + a typed relationship…" | pass |
| us-00020-AC-2.1 (connect-drag → relationship, default C/S) | connect-drag confirmed in a real browser (1→2, persisted); onConnect→addContextRelationship wired; default type unit-tested (store.test.ts, context-relations.test.ts) | pass (manual gesture) |
| us-00020-AC-3.1 (retype relationship) | store.test.ts "adds, retypes, and removes…"; e2e retype via edge select | pass |
| us-00020-AC-4.1 (delete relationship) | store.test.ts same; e2e delete button | pass |
| us-00020-AC-5.1 (remove context prunes relationships) | store.test.ts "prunes relationships touching a removed context" | pass |
| us-00020-AC-6.1 (relationships round-trip) | serialize.test.ts "round-trips context relationships" | pass |
| us-00020-AC-7.1 (map never mutates the board) | e2e toggle map on/off → nodes+edges+contexts identical on export | pass |
| spec-00004-XAC-1.1 (pre-4.0 import lossless) | serialize.test.ts v3.0 → v4.0 import | pass |
| spec-00004-XAC-2.1 (toggle map → board byte-identical) | e2e map-toggle export compare (nodes+edges+contexts) | pass (edges check added to close WEAK) |

## Manual verification (real-browser)

The Context Map renders each Bounded Context as a bordered node with its identity
tint and a coloured subdomain badge (Ordering ● CORE → Payment ● GENERIC), joined
by a directed arrow whose inline label is a type picker + delete. **Connect-drag**
(the one gesture e2e can't drive) was exercised in a real browser: dragging from
one context node's handle to another created a Customer/Supplier relationship
(count 1→2) that persisted to local storage. classification badge, map render,
retype and delete all confirmed visually.

## Deliverables

- **DSL**: `classification?` on contextSchema; `contextRelationshipSchema` +
  `contextRelationships` on modelSchema; `DSL_VERSION` 3.0 → 4.0; `migrateV3toV4`
  (additive version bump). `serialize.ts` threads relationships through
  `toModel`/`fromModel`/`exportJSON` + callers (persistence, toolbar, editor).
- **Vocabulary**: `context-relations.ts` — 5 canonical patterns (decision-00007) +
  `CONTEXT_RELATION_STYLE` + `DEFAULT_CONTEXT_RELATION`.
- **Store**: `setContextClassification`; `contextRelationships` + add / setType /
  remove; prune on `removeContext`; transient `contextMapOpen` + `toggleContextMap`;
  reset in `setModel`/`clear`.
- **UI**: classification selector + badge on the context chip (board-chrome);
  `context-map-canvas.tsx` (isolated RF provider) with `ContextNode` +
  `ContextRelationEdge` (inline type picker + delete); `editor.tsx` view-swap
  (`boardView = !discoveryActive && !contextMapOpen`); toolbar Context Map toggle.
- **CONTEXT.md**: Subdomain, Context Relationship, Context Map terms.

## Deferred (recorded, not gaps)

Per decision-00007, the relationship vocabulary is the focused 5-pattern subset;
Open Host Service, Published Language, and Separate Ways are out of v1 (addable to
the enum later without a DSL break). Context-node positions in the map are
transient (not persisted), holding the decision-00002 invariant.
