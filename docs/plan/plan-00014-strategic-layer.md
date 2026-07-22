---
id: plan-00014-strategic-layer
type: plan
role: main
status: resolved
parent: spec-00004-strategic-subdomains-context-map
---

# Plan: strategic layer — subdomains + context map

Implements [us-00019](../us/us-00019-classify-subdomain.md) and
[us-00020](../us/us-00020-context-relationships-map.md) per
[spec-00004](../spec/spec-00004-strategic-subdomains-context-map.md) /
[design-00007](../design/design-00007-context-map-surface.md), relationship
vocabulary per [decision-00007](../decision/decision-00007-context-relationship-vocabulary.md).
Extends the DSL (bump 3.0 → 4.0, additive migration). Delivered in two stages:
**FR4 first (classification), then FR5 (relationships + Context Map)** — a
checkpoint between. Terms follow [CONTEXT.md](../../CONTEXT.md).

## Stage A — FR4: subdomain classification (small; own commit)

| # | Task | Verify |
|---|---|---|
| A1 | `schema.ts`: `classification?` on `contextSchema`. `migrate.ts`: `migrateV3toV4` version bump; `DSL_VERSION = "4.0"`. | unit serialize/migrate: v3 file → v4, contexts unclassified, lossless (us-00019-AC-4.1, spec-00004-XAC-1.1) |
| A2 | `store.ts`: `setContextClassification(id, c?)`. | unit: sets/clears only that context's classification |
| A3 | `context-color.ts`: `SUBDOMAIN_STYLE` (badge label/colour). `board-chrome.tsx`: classification selector + badge on each context chip. | unit + e2e: set core → badge shows; clear → no badge (us-00019-AC-1.1/2.1) |
| A4 | Round-trip: classification survives export/import. | unit serialize (us-00019-AC-3.1) |
| — | **Checkpoint + commit** FR4. | tsc/lint/build/tests green |

## Stage B — FR5: relationships + Context Map (bulk; own commit)

| # | Task | Verify |
|---|---|---|
| B1 | `lib/eventstorming/context-relations.ts`: the 5 types + `CONTEXT_RELATION_STYLE`. | unit: type set + style map |
| B2 | `schema.ts`: `contextRelationshipSchema` + `contextRelationships` array on `modelSchema`. `serialize.ts` + callers thread it through. | unit serialize: relationships round-trip lossless (us-00020-AC-6.1) |
| B3 | `store.ts`: `contextRelationships` state + `addContextRelationship` (default customerSupplier) / `setContextRelationshipType` / `removeContextRelationship`; `removeContext` prunes touching relationships; transient `contextMapOpen` + `toggleContextMap`, reset in `setModel`/`clear`. | unit: add/type/remove; prune on removeContext (AC-2.1/3.1/4.1/5.1) |
| B4 | `components/nodes/context-node.tsx` + `components/edges/context-relation-edge.tsx` + `components/context-map-canvas.tsx` (isolated RF provider); deterministic node arrangement; connect → add, edge type picker, delete. | run/e2e: open map, connect two contexts, change type, delete (AC-1.1/2.1/3.1/4.1) |
| B5 | `editor.tsx`: view-swap branch for `contextMapOpen` (gate board chrome/panels); `toolbar.tsx`: Context Map toggle. | e2e: toggle map on/off; board unchanged on export (AC-7.1, spec-00004-XAC-2.1) |

## Stage C — docs

| # | Task | Verify |
|---|---|---|
| C1 | CONTEXT.md: add **Subdomain**, **Context Relationship**, **Context Map**. | glossary consistent with code |
| C2 | Promote us-00019/us-00020/spec-00004/design-00007 → `active`; this plan → `open` (decision-00007 already active). | statuses correct |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Both stages done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green;
  `lib/**` coverage ≥90% (lines/funcs) held.
- Behavioural: classify a context (badge + DSL); draw/type/delete relationships in
  the Context Map; relationships round-trip; pre-4.0 files import losslessly; the
  map never mutates the board.
- A subagent verifies from the docs that every us-00019 / us-00020 GWT and
  spec-00004-XAC scenario has a passing test and no requirement is unfinished; a
  `docs/record/` acceptance checklist links the ids (CLAUDE.md §7). Any gap blocks
  `resolved`.

**Verified 2026-07-22** — subagent verdict PASS; the one WEAK item (XAC-2.1 e2e
missing an `edges` check) closed. Acceptance evidence in
[record-00014-strategic-layer-acceptance](../record/record-00014-strategic-layer-acceptance.md).
212 unit + 40 e2e green; tsc/lint/build clean; connect-drag confirmed in a real browser.
