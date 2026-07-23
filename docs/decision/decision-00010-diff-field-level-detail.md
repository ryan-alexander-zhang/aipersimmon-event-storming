---
id: decision-00010-diff-field-level-detail
type: decision
role: patch
status: active
parent: decision-00009-compare-as-unified-diff
---

# Compare diff shows field-level change detail (before → after)

> Patch extending [decision-00009](./decision-00009-compare-as-unified-diff.md).
> Driven by a usability finding on the shipped unified diff (us-00023).

## Context

decision-00009 delivered a unified diff that marks elements added / removed /
**changed**. In use, a "changed" element only shows a ring and the `~N changed`
count — the target's current value is visible but **not what it changed from**. A
rename shows the new label with no hint of the old; a timeline move, context
reassignment, or property toggle shows nothing at all. decision-00009 explicitly
deferred "field-by-field change detail" as out of scope; that gap is now the main
complaint.

## Decision

Bring **field-level change detail** into scope for changed elements, via the combo
settled with the user (A′ + B′):

1. **Inline on the sticky (headline change).** A renamed element shows its previous
   label struck-through beneath the new label. Other changed fields show a compact
   change **chip**: timeline order as a **direction** (`⬅ earlier` / `➡ later`, not a
   raw slot number — the number is meaningless to a reader), pivotal as `★ set` /
   `★ cleared`, hotspot state/kind/priority as `state: open→resolved` etc., and
   context / description as a short "changed" marker.
2. **Full detail on hover (B′).** Hovering a changed element reveals every changed
   field as `before → after`, including resolved **context names** and the
   description — the values that do not fit as inline chips.
3. **Order shows direction, not slot numbers.** The board already places the element
   at its new column; the chip conveys the *sense* of the move.

## Consequences

- spec-00008 §6 non-goal "field-by-field change detail" is **reversed**; us-00023 is
  extended with FR-8 (inline before→after) and FR-9 (hover detail). Design in
  [design-00010](../design/design-00010-compare-diff-detail.md), plan in
  plan-00017.
- The diff engine (`lib/dsl/diff.ts`) now carries, for each changed node, the
  `before`/`after` nodes and the list of changed fields (not just a status).
- **Still deferred** (not this increment): a spatial "ghost of the element at its old
  position + arrow" for moves — the strongest move representation but markedly more
  costly; recorded as a future enhancement. N-way compare also stays out.
