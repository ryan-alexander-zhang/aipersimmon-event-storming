---
id: issue-00003-collinear-edge-overlap
type: issue
role: main
status: resolved
parent: plan-00004-readability-tier-b-orthogonal
---

# Edges sharing a column overlap collinearly (opposite arrows on one line)

## Problem

Focusing `Match Driver` draws two edges — `handledBy` (Match Driver → Matching,
down) and `annotates` (the hotspot → Match Driver, up) — on the **same vertical
line**, with opposite arrowheads, indistinguishable. The same collinear overlap
affects other back/long edges (`informs`: Read Model → Actor; `invokes`: Policy →
Command).

## Context / Trigger

Found on the ride-hailing example after Tier B (orthogonal routing) and the focus
highlight made the overlap obvious.

## Root Cause (first principles)

1. **Observed**: two edges render on one centreline with opposite arrows.
   **Expected**: edges sharing a column are visually separated.
2. **Mechanism**: the banded layout places a whole slice in one column (one `x`),
   and orthogonal routing draws every vertical edge on that column's centreline.
   `computeEdgeOffsets` ([`edge-spread.ts`](../../web/lib/layout/edge-spread.ts))
   only separates edges that **share a source handle or a target handle**. The
   overlapping pair here does not: `handledBy` attaches at Match Driver's *bottom
   as source*, `annotates` attaches at Match Driver's *bottom as target* — same
   physical point, different role → different key → no offset. They stay collinear.
3. **True root cause**: separation keys on *shared handle role*, not on *sharing a
   column corridor*. Any two edges whose vertical spans overlap in the same column
   collide — `handledBy`+`annotates` is one instance; `informs` and `invokes`
   (long back-edges up the column) are others. It is not specific to hotspots.

## Reproduction (test-first)

`web/lib/layout/edge-spread.test.ts` — a column with a causal chain plus an
`annotates` edge and an `informs` back-edge; assert the chain stays centred while
the overlapping edges get distinct non-zero offsets. Fails before the fix (the
overlapping edges get no offset and coincide).

## Fix

Generalise `computeEdgeOffsets` from *shared-handle* grouping to **corridor +
interval lane assignment**:

- Group edges by corridor: vertical edges by their column `x`, horizontal by their
  row `y` (needs node positions).
- Within a corridor, treat each edge's span as an interval and assign lanes so
  **overlapping** intervals get different lanes; edges that only touch end-to-end
  (the causal chain) stay on lane 0 (centre). Shorter edges claim the centre first.
- Map lane → a small symmetric px offset, applied (as today) via the
  `getSmoothStepPath` `centerX`/`centerY` shift. Offsets stay well within the
  column, so the timeline (node columns / event order) is unaffected.

## Verification

- Regression tests `web/lib/layout/edge-spread.test.ts` (issue-00003): a column
  with a causal chain + `annotates` + `informs` — the chain stays centred (offset
  0) while the overlapping edges get distinct non-zero offsets. Two of these
  failed before the fix (overlapping edges shared offset 0); all 7 pass after.
- `bun run test` 98 passed; `tsc`, `bun run lint`, `bun run build` clean; `lib/**`
  coverage 90.72% branch / 99.3% line (≥90). 19 E2E passed (no regression).
- Visual: focusing `Match Driver` on the ride-hailing model now shows `handledBy`
  (down to Matching) and the hotspot `annotates` edge on separate lanes instead
  of one overlapping line; the timeline (node columns / event order) is unchanged.
