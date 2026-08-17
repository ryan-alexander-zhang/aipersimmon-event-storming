---
id: plan-00023-hotspot-resolution
type: plan
role: main
status: resolved
parent: spec-00003-hotspot-workflow-opportunity
---

# Plan: a resolved Hotspot records how it was resolved

Implements [us-00033](../us/us-00033-hotspot-resolution.md) per
[spec-00003](../spec/spec-00003-hotspot-workflow-opportunity.md) §4. Terms follow
[CONTEXT.md](../../CONTEXT.md).

Two optional properties — `resolution` and `resolvedAt` — plus the state change
that stamps them, a health finding for the ones left blank, and the panel field.
No DSL bump and no migration: they are optional additive properties, the same
footing as `state`/`kind`/`priority` (spec-00003 §4) and spec-00011's rule fields.

The one thing to get right is that **resolving is now a two-field change**, not a
one-field one. `updateNodeData` is generic and cannot know that setting
`state: "resolved"` should also stamp `resolvedAt`, so the panel would have to make
two calls in the right order. That belongs in the store, as one action, or it will
drift the first time another surface resolves a Hotspot.

Setting a Hotspot back to `open`, by contrast, changes the state and nothing else.
`resolvedAt` records that the Hotspot *was* resolved at that moment; un-ticking the
box does not un-happen it, and clearing it would throw away the trace this story
exists to keep. (This is the Hotspot's own state — nothing here is about opening a
Project or a file.)

## Phase 1 — the two properties, and the state change that stamps them

| # | Task | Verify |
|---|---|---|
| P1.1 | `schema.ts` `propertiesSchema`: `resolution: z.string().optional()`, `resolvedAt: z.string().optional()`. Mirror both on `ESNodeData` (`types.ts`) and map them both ways in `serialize.ts`. | unit serialize.test: a Hotspot with a resolution round-trips unchanged (us-00033-AC-6.1); a pre-story file without them imports clean (us-00033-AC-6.2) |
| P1.2 | `store.ts`: `setHotspotState(id, state)` — sets `state` and, on resolve, stamps `resolvedAt` over any earlier one. Setting it back to `open` changes the state and nothing else. | unit store.test: resolve → state + `resolvedAt`; back to open → both fields untouched, only state changed (us-00033-AC-3.1); resolve → open → resolve → the second timestamp wins (us-00033-AC-3.2) |
| P1.3 | The resolution itself keeps going through `updateNodeData` — it is ordinary text like `description`, and writing it must not touch the description. | unit store.test: writing a resolution leaves `description` unchanged (us-00033-AC-1.1) |

## Phase 2 — model health

| # | Task | Verify |
|---|---|---|
| P2.1 | `health.ts`: `unrecorded-resolution`, severity `warning`, listing Hotspots with `state === "resolved"` and no non-blank `resolution`. Sits beside `unresolved-hotspots`, which is unchanged. | unit health.test: of two resolved Hotspots, only the blank one is reported; an open Hotspot with no resolution is not (us-00033-AC-5.1) |

## Phase 3 — the panel

| # | Task | Verify |
|---|---|---|
| P3.1 | `property-panel.tsx`: a **Resolution** textarea under the state control for a selected Hotspot, wired to `updateNodeData`; the state control calls `setHotspotState`. | e2e: resolve a Hotspot, type a resolution, reselect it — both are there (us-00033-AC-4.1) |
| P3.2 | Resolving reveals and focuses the field; it never blocks the state change, and an empty one is left to model health. | e2e: setting resolved puts focus in the Resolution field and the state is already resolved (us-00033-AC-2.1) |
| P3.3 | The panel shows when it was resolved under the field whenever one is recorded — including on a Hotspot set back to `open`, where it reads as history ("Last resolved …"). It sits outside the field's `<label>`, or the timestamp becomes part of the field's accessible name. | e2e: the resolved time is rendered, and survives being set back to open (us-00033-AC-4.1) |

## Phase 4 — the glossary

| # | Task | Verify |
|---|---|---|
| P4.1 | `CONTEXT.md`: **Resolution** as its own term — what closed a Hotspot, distinct from its description (the uncertainty) — and note on **Hotspot** that resolving records one. | review: nothing in the glossary contradicts the code |

## Phase 5 — the authoring skill

Added after the rest was already `resolved`: the skill mirrors the DSL, so a new
property silently breaks it. `validate.py` rejects any property outside its
whitelist, so it would have failed a valid v4.0 model.

| # | Task | Verify |
|---|---|---|
| P5.1 | `skills/event-storming/scripts/validate.py`: `resolution` / `resolvedAt` in `PROPS`, hotspot-only; and a warning mirroring `unrecorded-resolution`. | run it on `template.json` (0 errors) and on a copy with the resolution stripped (the warning fires) |
| P5.2 | `reference/dsl.md`: both properties in the property table, and on the `hotspot` row. | the table matches `propertiesSchema` |
| P5.3 | `template.json`: the resolved hotspot carries a real resolution, so the template still exercises every property. | validator clean |
| P5.4 | `SKILL.md` and `reference/big-picture.md`: closing a hotspot means writing what closed it. | checklist item present |

## Out of scope

- **Linking a Hotspot to the elements that resolved it.** The alternative weighed
  and set aside in spec-00003 §4; it needs a relation type of its own and does not
  replace the sentence a reader wants.
- **Promoting a resolution to a `docs/decision`.** Already deferred by spec-00003 §1
  and still heavier than this.
- **Who resolved it.** Single-user, no accounts (prd-00001) — a `resolvedBy` would
  be a field nobody could fill honestly.
- **Requiring a resolution before resolving.** Prompted, not enforced: a modal in
  the middle of a workshop is how people learn to type "ok" into a required field.

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green.
- Every us-00033 GWT has a passing test, recorded in `docs/record/`.
- Behavioural: resolve a Hotspot, write what was decided, reload the Project, and
  find the decision still attached to the question it answered — and export it,
  import it elsewhere, and find it there too.
