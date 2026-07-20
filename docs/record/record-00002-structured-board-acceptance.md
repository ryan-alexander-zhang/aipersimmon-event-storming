---
id: record-00002-structured-board-acceptance
type: record
role: main
status: active
parent: plan-00002-structured-board
---

# Acceptance record: structured board (plan-00002)

Acceptance evidence for [plan-00002-structured-board](../plan/plan-00002-structured-board.md).
Verified 2026-07-20. An independent subagent mapped every GWT to a test and ran
both suites; the indirect coverages it flagged were then closed with dedicated
tests (see the commit `test: close acceptance-verification gaps for plan-00002`).

## Gate results

- Unit: **67 passed** (`bun run test`). Coverage on `lib/**`: **90.4% branch /
  100% line / 98.7% func / 99.6% stmt** (≥90% bar met).
- E2E: **13 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` clean.

## GWT coverage

| GWT / requirement id | Test | Result |
| --- | --- | --- |
| us-00001-AC-1.1 (add into band + colour) | E2E `adds a Domain Event…` (count, label, orange rgb); layout.test bands | pass |
| us-00001-AC-2.1 (edit label) | E2E `editing the label…` | pass |
| us-00001-AC-3.1 (pivotal marker) | E2E `toggling pivotal…` | pass |
| us-00001-AC-4.1 (delete + edges) | E2E `deletes a node…`; store.test `removes a node…` | pass |
| us-00002-AC-1.1 (grammar link) | store.test `creates a semantic edge`; relations.test; E2E slice `triggers`/`updates` | pass |
| us-00002-AC-2.1 (reject invalid) | store.test `rejects an invalid connection`; relations.test (feedback = React Flow `isValidConnection` styling, note 1) | pass |
| us-00003-AC-1.1 / -2.1 (hotspot + text) | E2E `attaches and edits a hotspot`; store.test | pass |
| us-00004-AC-1.1 / -3.1 (export/import v2) | serialize.test round-trip + version/level; E2E `import then export round-trips` | pass |
| us-00005-AC-1.1 / -2.1 (persist / corrupt) | E2E `autosaves and restores`; persistence.test | pass |
| us-00006-AC-1.1 (context group) | E2E `a second context adds a column group…`; store.test | pass |
| us-00006-AC-3.1 (reorder → column swap) | store.test `reordering an event swaps its column (x)` | pass |
| us-00006-AC-4.1 (reassign → moves) | store.test `reassigning context moves a node…` | pass |
| us-00007-AC-1.1 / -2.1 (slice builder) | E2E `builds a slice…`; store.test; layout.test bands | pass |
| us-00007-AC-4.1 (no free positioning) | E2E `elements are not free-draggable`; serialize/layout (positions computed) | pass |
| us-00008-AC-1.1 (Big Picture filter) | levels.test (LEVEL_TYPES/isVisibleAt); E2E `level filter hides types…` (aggregate/policy/readModel hidden; actors/systems/events kept) | pass |
| us-00008-AC-2.1 (level round-trips) | E2E round-trip (`meta.level==="process"`); persistence.test | pass |
| us-00009-AC-1.1 (concurrent events) | layout.test `stacks concurrent events…` | pass |
| spec-00001-XAC-1.1 (no network) | E2E `keeps the model local…` + source grep (no network APIs) | pass |
| spec-00001-XAC-2.1 (invalid import) | E2E `shows an error…`; serialize.test | pass |
| spec-00001-XAC-4.1 (deterministic bands) | layout.test `each element type in its own band` + `is deterministic` | pass |

### Notes

1. **us-00002-AC-2.1 feedback**: the deterministic clause (no edge created) is
   tested. The "indicates not allowed" feedback is React Flow's built-in
   invalid-connection styling during the drag, enabled by `isValidConnection`.

## Tasks

RT1–RT11 complete. Working tree clean.

## Verdict

**ACCEPTED** — every `us`/`spec` GWT in the plan's acceptance path maps to a
passing test, coverage meets the bar, and no requirement is unfinished.
plan-00002 → `resolved`.
