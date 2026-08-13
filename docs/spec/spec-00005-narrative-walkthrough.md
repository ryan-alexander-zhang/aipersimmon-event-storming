---
id: spec-00005-narrative-walkthrough
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: narrative walkthrough

> The shippable capability: **walk the Domain Event timeline** forward and
> backward, highlighting the current event's slice, to validate the flow by
> telling its story. Delivers
> [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR6.

## 1. Context

Canonical terms from [CONTEXT.md](../../CONTEXT.md): Domain Event, Timeline, and
the new term **Walkthrough** — added to CONTEXT.md with this spec. Inputs:
prd-00002 FR6;
[analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md) §2 (#5).

Read-only over the model. It reuses the existing focus/dim rendering
(design-00003 Tier A): a walkthrough step just moves the **selection** along the
ordered Domain Events, so the board already dims everything outside the current
event's slice. Design decisions (stated so they can be challenged):

- **Steps are one Domain Event at a time**, in timeline order — sorted by
  `order`, then context, then id for determinism. Concurrent events (equal
  `order`) become consecutive steps.
- **Highlight = the existing selection focus** (the event + its directly
  connected slice, rest dimmed), not a hide/isolate. One code path, consistent
  with hover/selection — plus the step's own marking per US28: the selection
  outline alone does not read as "this is the current step".
- **Navigation is via on-screen controls** (Prev / Next / Exit) **and the ←/→
  arrow keys** (us-00028-FR-5). Arrows nudge a selected event's timeline order
  only outside a walkthrough; inside one they step the cursor, which writes
  nothing to the model, so XFR-1 still holds. (This reverses the original
  decision to leave arrows out entirely — that kept the model safe by making the
  most obvious key for "next" do nothing at all.)

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US14 | [us-00014-narrative-walkthrough](../us/us-00014-narrative-walkthrough.md) | active | Start a walkthrough; step forward/back through events; each slice highlighted; exit unchanged |
| US28 | [us-00028-walkthrough-step-legibility](../us/us-00028-walkthrough-step-legibility.md) | active | The current step is ringed and pulses; visited/upcoming events read differently; overlay leads with the label + progress; ←/→ step |

## 3. Cross-cutting requirements

- **spec-00005-XFR-1** (State) While a walkthrough is active, the system shall not
  mutate the model — timeline-nudge keys are suppressed and no step writes to the
  model.

### Acceptance (XAC)

- **spec-00005-XAC-1.1** (spec-00005-XFR-1)
  Given an active walkthrough on a selected Domain Event
  When the Modeler presses an arrow key
  Then the event's timeline order does not change

## 4. Technical Design (inline — extract to `design/` if reused)

Read-only; reuses focus + selection. Terms per CONTEXT.md.

**Pure core** — `web/lib/store/timeline.ts`: `timelineOrder(nodes): string[]`
returns Domain Event ids sorted by `(order, context, id)`.

**Store** (`store.ts`): view-only state `walk: { active: boolean; index: number }`
(never persisted). Actions:
- `startWalkthrough()` — compute the order, set active, index 0, select the first
  event (empty model → active with no selection).
- `walkStep(dir: -1 | 1)` — clamp `index` within `[0, n-1]` (no wrap), select the
  event at the new index.
- `stopWalkthrough()` — set inactive; selection/model unchanged.

**UI**: a toolbar **Walk** toggle starts/stops; while active, a small overlay
leads with the current event's label and shows `n / N`, a progress bar, and
Prev / Next / Exit. The overlay lives inside the canvas (React Flow context),
calls `fitView` on the current event when the index changes, and owns the ←/→
step keys. The editor suppresses the arrow-key timeline nudge while `walk.active`
(spec-00005-XFR-1), so the same keys cannot do both.

**Step rendering** (US28): the Current Step carries the **Step Ring** (a white gap
plus a violet ring, replacing the selection outline on that node) and plays a
one-shot halo; **Visited** events outside the current slice keep a half-muted copy
of their own colour; **Upcoming** ones stay fully muted by the existing dim layer.
All of it is injected CSS keyed by `data-id` — the route the dim layer already
takes — so a step never rebuilds a node object (issue-00019).

## 5. Error handling

- Empty board / no Domain Events → starting a walkthrough activates with no
  selection and the overlay shows `0 / 0`; stepping is a no-op.
- Stepping past either end clamps to the current end (us-00014-AC-4.1).

## Links

- PRD: prd-00002 (FR6) · Plan:
  [plan-00010-narrative-walkthrough](../plan/plan-00010-narrative-walkthrough.md)
