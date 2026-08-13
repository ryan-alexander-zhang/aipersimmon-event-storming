---
id: record-00020-walkthrough-step-legibility-acceptance
type: record
role: main
status: active
parent: plan-00020-walkthrough-step-legibility
---

# Acceptance record: walkthrough step legibility

Acceptance evidence for
[plan-00020](../plan/plan-00020-walkthrough-step-legibility.md), implementing
[us-00028](../us/us-00028-walkthrough-step-legibility.md) per
[spec-00005](../spec/spec-00005-narrative-walkthrough.md). Verified 2026-08-13.

Coverage was cross-checked assertion-by-assertion in-session rather than by an
independent subagent (CLAUDE.md §7), because this session was instructed not to
spawn agents. Read the mapping below as self-reported.

## Gate results

- Unit: **281 passed** (`bun run test`, Vitest). No `lib/**` change — the step
  states are derived in `editor.tsx` from the existing `timelineOrder`, so the
  pure core is untouched and its coverage is unmoved.
- E2E: **70 passed, 1 failed** (`bun run test:e2e`, Playwright/chromium). The
  failure is `"a wheel zoom does not re-render the board on every tick
  [issue-00028]"`, which asserts a hard 3 ms/render budget and measures 7.3 ms on
  this machine. It fails identically with these changes stashed, so it is a
  pre-existing environment-sensitive threshold, not a regression here.
- `tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| us-00028-AC-1.1 (Step Ring on the current event only) | e2e "a walkthrough step reads at a glance…": the current event's computed `box-shadow` contains the violet ring, and each of the other three events is asserted ring-free | pass |
| us-00028-AC-2.1 (a step moves the ring and plays the pulse) | same test: after Next, the ring is on the second event and gone from the first; that event's computed `animation-name` is `es-walk-step` | pass |
| us-00028-AC-3.1 (visited / current / upcoming are three fills) | same test at the third of four unconnected events: the two visited fills are equal to each other, the current one is the Domain Event's own `rgb(246, 166, 35)`, and the three values are distinct | pass |
| us-00028-AC-4.1 (overlay leads with the label, shows position + progress) | same test: label `Beta`, counter `2 / 4`, the label's computed font-size greater than the counter's, and the progress bar polled to half its track's width | pass |
| us-00028-AC-5.1 (←/→ step without reordering) | e2e "narrative walkthrough steps the timeline…": ArrowLeft on the last event moves the cursor to the first (Prev then disabled), and after exit the board's left→right event order is unchanged — the nudge would have swapped the two columns | pass |
| us-00028-FR-2, reduced-motion clause | e2e "the step pulse is dropped where the reader prefers reduced motion": under `reducedMotion: "reduce"` the ring is present and `animation-name` is `none` | pass |

`us-00014` and `spec-00005-XAC-1.1` still hold: no walkthrough path writes to the
model, and the arrow-key timeline nudge stays suppressed while walking. The
existing walkthrough e2e was rewritten where it used "the overlay label did not
change" as its proxy for "no reorder" — arrows now legitimately change that label,
so the read-only check reads the board's column order instead.

## Not covered

- The overlay overlapping the framed event at high zoom, and the clickable
  segmented progress rail — both declared out of scope in plan-00020.
- The pulse's *appearance* (a halo growing and fading) is verified by eye from a
  1440×900 screenshot of the Process board mid-walkthrough; the tests assert the
  animation is attached, not how it looks.
