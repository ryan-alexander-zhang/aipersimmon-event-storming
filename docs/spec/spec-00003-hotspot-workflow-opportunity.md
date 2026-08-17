---
id: spec-00003-hotspot-workflow-opportunity
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: hotspot workflow + opportunity

> The shippable capability: make surfaced uncertainty and value **actionable** —
> a Hotspot gains a lifecycle (open/resolved), a kind, and a priority; a new
> **Opportunity** element (the positive counterpart) can be attached to any
> element. Delivers [prd-00002](../prd/prd-00002-complex-business-analysis.md)
> FR2 and FR3.

## 1. Context

Canonical terms from [CONTEXT.md](../../CONTEXT.md): Hotspot, and the new terms
**Opportunity** (element), **highlights** (relation), and the Hotspot attributes
**state / kind / priority** — all added to CONTEXT.md with this spec. Inputs:
prd-00002 FR2, FR3;
[analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md) §2 (#3).

Scope decided (single-user, no backend): Hotspot v1 = **state** (open→resolved) +
**kind** (conflict/question/risk) + **priority** (low/medium/high); resolved
hotspots render muted; model-health counts only open ones. **Deferred** (recorded
here, not built): dot-voting (a collaboration feature, → #2) and one-click
"promote to a `docs/decision`" (heavier document generation).

This closes the forward dependency noted in
[spec-00007](./spec-00007-model-health-analysis.md): `unresolved-hotspots` now
narrows to `state !== resolved`.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US12 | [us-00012-hotspot-workflow](../us/us-00012-hotspot-workflow.md) | active | Hotspot gets state / kind / priority; resolved is muted; health counts open |
| US13 | [us-00013-opportunity-element](../us/us-00013-opportunity-element.md) | active | Add an Opportunity element attachable to any element, distinct from Hotspot |
| US33 | [us-00033-hotspot-resolution](../us/us-00033-hotspot-resolution.md) | active | A resolved Hotspot records the resolution that closed it, and when; health reports resolved-without-one |

## 3. Cross-cutting requirements

- **spec-00003-XFR-1** (Ubiquitous) The system shall keep DSL v2.0 backward
  compatible: the new node attributes are optional additive fields and a new
  `opportunity` type, so an existing v2.0 file without them shall import
  unchanged, with any Hotspot defaulting to `state = open`.

### Acceptance (XAC)

- **spec-00003-XAC-1.1** (spec-00003-XFR-1)
  Given a v2.0 export produced before this spec (no state/kind/priority, no
  opportunity nodes)
  When the Modeler imports it
  Then it loads without error and its Hotspots are open

## 4. Technical Design (inline — extract to `design/` if reused)

Terms per CONTEXT.md. Additive and backward compatible — **DSL stays `2.0`**
(new fields optional, new enum value unused by old files), so `migrate.ts` is
untouched.

**New element type** — `opportunity` (`web/lib/eventstorming/elements.ts`):
distinct colour (positive green, separate from Read Model), a Lightbulb icon
(`element-node.tsx`), and its own bottom band `opportunity` in `BAND_ORDER` /
`ELEMENT_BAND` (rendered on the band rail by `board-chrome.tsx`). Visible at every
level (`levels.ts` — added to all three `LEVEL_TYPES`, like Hotspot).

**New relation** — `highlights` (`relations.ts`): `opportunity → any element`, the
positive parallel of `annotates` (`hotspot → any element`). Added to
`RELATION_TYPES`, `CONNECTION_RULES`, and `edge-style.ts`.

**Node attributes** (`schema.ts` `propertiesSchema`, mirrored on `ESNodeData` and
mapped in `serialize.ts`), all optional:
- `state`: `"open" | "resolved"` — Hotspot lifecycle (absent = open).
- `kind`: `"conflict" | "question" | "risk"` — Hotspot classification.
- `priority`: `"low" | "medium" | "high"` — Hotspot priority.
- `resolution`: free text — what closed the Hotspot (us-00033). One field for all
  three kinds: a `question` resolves to an answer, a `conflict` to a decision, a
  `risk` to a mitigation or an explicit "accepted". Separate from `description`,
  which holds the uncertainty itself and must survive being answered.
- `resolvedAt`: ISO timestamp, stamped when `state` becomes `resolved` and replaced
  each time it is resolved again. Setting the Hotspot back to `open` does **not**
  clear it — it is the record
  of a thing that happened, not a description of the current state, and clearing it
  would destroy exactly the trace this story exists to keep. `state` alone says
  whether the Hotspot is open now. No `resolvedBy`: single-user, no accounts.

Still additive and optional, so the DSL stays **4.0** and `migrate.ts` is untouched
— the same footing as `state`/`kind`/`priority` here and the spec-00011 rule fields.

**Store** (`store.ts`): `addOpportunity(targetId, text)` mirrors `addHotspot` (the
`highlights` relation resolves from the types). Hotspot attributes are written
through the existing `updateNodeData`.

**Model health** (`health.ts`): `unresolved-hotspots` counts Hotspots with
`state !== "resolved"`. A second finding, `unrecorded-resolution`, lists Hotspots
that are resolved with no `resolution` — the "we agreed in the room and ticked it
off" case, which is exactly the one that loses the reasoning.

**UI**: the property panel shows state / kind / priority controls for a selected
Hotspot; the element palette and slice actions offer **+ Opportunity**; resolved
Hotspots render muted (reduced opacity) in `element-node.tsx`. The Resolution field
sits under the state control and is revealed and focused on resolving — prompted,
never blocking, in keeping with how this tool handles invalid connections. An
unfilled one is caught by model health rather than by a modal. A Hotspot set back
to `open` still shows both, read as history ("Last resolved …"), since that is what
they are.

### Not built: a link to whatever resolved it (us-00033)

The DDD-native alternative is to point the Hotspot at the elements that answer it —
the Policy that was added, the Constraint that was agreed — so the resolution *is*
the model change. Rejected for now: it needs a new relation type, its own
connection rules, and a rendering that does not read as another `annotates` edge,
and it still would not carry the sentence a reader actually wants ("we chose
per-item reservation because warehouse cannot hold a basket-level lock"). The text
field is the smaller thing that answers the question asked. The link stays open as
a later addition — the two compose; neither forecloses the other.

## 5. Error handling

- Import of a pre-spec v2.0 file → new fields absent → treated as `state = open`,
  no opportunity nodes (XAC-1.1).
- An invalid manual connection from/to an Opportunity is rejected by the existing
  `isValidConnection` gate (only `highlights` from an Opportunity is allowed).

## Links

- PRD: prd-00002 (FR2, FR3) · Plan:
  [plan-00009-hotspot-workflow-opportunity](../plan/plan-00009-hotspot-workflow-opportunity.md),
  [plan-00023-hotspot-resolution](../plan/plan-00023-hotspot-resolution.md) (us-00033)
