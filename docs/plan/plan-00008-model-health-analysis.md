---
id: plan-00008-model-health-analysis
type: plan
role: main
status: resolved
parent: spec-00007-model-health-analysis
---

# Plan: model-health analysis

Implements [us-00011-model-health-findings](../us/us-00011-model-health-findings.md)
per [spec-00007](../spec/spec-00007-model-health-analysis.md). Read-only over the
model: no DSL change, no layout change. Two phases — the **pure analysis core**
lands and is independently correct; the **panel UI** follows and reuses the
existing focus store. Terms follow [CONTEXT.md](../../CONTEXT.md).

## Phase 1 — analysis core

| # | Task | Verify |
|---|---|---|
| P1.1 | New `lib/analysis/health.ts`: `Finding`/`SmellType` types + `analyzeModel(model): Finding[]`, a pure fn over nodes+edges. Threshold constants `AGG_MAX_COMMANDS`, `AGG_MAX_EVENTS`. | unit: types compile; empty model → `[]` (us-00011-AC-4.1) |
| P1.2 | Implement `orphan-event` and `dangling-command` (edge-presence / reachability over `produces`,`handledBy`→`emits`). | unit: orphan event flagged; dangling command flagged; healthy pair not flagged (AC-1.1/1.2) |
| P1.3 | Implement `overloaded-aggregate` (count handled Commands / emitted events vs thresholds) and `unresolved-hotspots` (count Hotspot nodes → one summary finding). | unit: over-threshold flagged, at-threshold not; hotspot count correct (AC-1.3) |
| P1.4 | Implement `policy-cycle` (cycle detection over `triggers`/`invokes`/`produces`/`emits` touching a Policy). | unit: cyclic policy chain flagged; acyclic not (AC-1.4) |
| P1.5 | `health.test.ts` covering every smell type + the clean-model case. | `bun run test` green; `lib/**` coverage ≥90% |

## Phase 2 — panel UI

| # | Task | Verify |
|---|---|---|
| P2.1 | Memoised selector deriving `analyzeModel(model)` from the store so findings recompute on any model change. | run: fix an orphan → its finding disappears (AC-2.1) |
| P2.2 | `components/health-panel.tsx`: toolbar toggle; list findings grouped by severity with smell type + element label(s); healthy empty state. | run: panel lists findings; clean model shows healthy state (AC-4.1) |
| P2.3 | Selecting a finding routes `elementIds` through `lib/store/focus.ts` to select/focus the element(s). | run: click finding → element selected & focused (AC-3.1) |
| P2.4 | Confirm editing stays enabled while the panel is open (advisory, non-blocking). | run: edit an element with panel open → succeeds (AC-5.1, spec-00007-XAC-1.1) |
| P2.5 | `e2e/`: panel open → finding listed → click focuses element; healthy-state path. | `bun run test:e2e` green |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90%.
- Behavioural: orphan events, dangling commands, overloaded aggregates, policy
  cycles, and a hotspot count are all surfaced as advisory findings; selecting a
  finding focuses its element(s); a clean model shows a healthy state; editing is
  never blocked; findings recompute on model change.
- A subagent verifies from the docs that every linked `us-00011` GWT and the
  `spec-00007-XAC` scenarios have a passing test and no requirement is unfinished;
  a `docs/record/` acceptance checklist links the GWT/XAC ids (CLAUDE.md §7). Any
  gap blocks `resolved`.

**Verified 2026-07-21** — subagent verdict PASS (two first-pass gaps closed with
added tests, then re-verified); acceptance evidence in
[record-00008-model-health-acceptance](../record/record-00008-model-health-acceptance.md).
