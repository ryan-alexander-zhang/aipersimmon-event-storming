---
id: issue-00020-zoom-frame-guard-fails-on-one-stalled-frame
type: issue
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# The zoom-frame guard fails on a single stalled frame, so a healthy board reports a performance regression

## Problem

`a zoom gesture inside one semantic band does not stall a frame [issue-00019]`
(`web/e2e/editor.spec.ts`) fails on an unchanged, healthy board:

```
expect(frames.max).toBeLessThan(60)
Received: 61   ·   Received: 60   ·   Received: 68
```

It fails intermittently on a quiet machine and repeatedly under load, so a green
suite depends on machine conditions rather than on the board's behaviour. False
failures on a perf guard are worse than a missing guard: the next real regression
arrives in a test that everyone already knows "just fails sometimes".

## Context / trigger

Found while verifying an unrelated Context Map change (feat 10c2644): the full
e2e suite reported this one failure. It reproduces on `main` with the working
tree clean, so it is not caused by that change.

Sensitive to machine conditions: 6 Playwright workers on a machine at load
average ≈6 fails roughly one run in three; a single worker on a warm dev server
passes.

## Root cause (first principles)

1. **Observed**: the guard fails while the board is healthy. **Expected**: it
   fails only when a zoom frame does work proportional to the whole board.
2. The measurement itself is sound — `FRAME_CLOCK` samples every
   `requestAnimationFrame` delta during a six-tick wheel gesture. The defect is
   the **statistic**: `__frameStop` (`web/e2e/editor.spec.ts:1289`) reduced ~60
   samples to `max`, and the test asserted `frames.max < 60`
   (`web/e2e/editor.spec.ts:1414`, the line the fix replaces).
3. The samples are bimodal, not noisy: ~8ms idle frames plus six wheel-tick
   frames. Dumping every sample (160-node board, dev server, this machine):

   | condition | worst | 2nd worst | top 5 |
   | --- | --- | --- | --- |
   | healthy, 1 worker, warm server | 29–32 | 26–28 | ~27 |
   | healthy, 1 worker, fresh server | 29–30 | 27–28 | ~27 |
   | healthy, full suite / 6 workers, ×3 runs | 27 / **68** / 30 | 26 / 26 / 26 | ~26 |
   | perf fix reverted (the real regression), ×3 runs | 129–131 | **68–73** | all ≥65 |

   In the failing run the tick frames stay at ~26ms and **one** frame reaches
   68ms — a scheduling/GC stall, not board work. Every other sample is healthy.
4. **True root cause**: `Math.max` over the gesture makes the guard a
   single-sample assertion, and its real headroom is much thinner than the
   comment claims. The comment reasons from "8ms healthy vs >100ms regressed"
   (7x), but an in-band wheel tick legitimately costs ~26ms even with
   issue-00019 fixed (React Flow's own transform work, dev-mode React on top),
   so the actual margin is 60/26 ≈ 2.3x — and any one stall spends it.
5. Ruled out: not a board regression (the whole distribution is healthy in the
   failing run, and the same commit measures 29ms worst on a quiet machine); not
   a cold dev server (a fresh server measures the same 29–30ms); not the
   Context Map change (reproduces with it stashed).

## Reproduction

A failing test written before the fix is not applicable — the defect *is* in the
test, and its trigger is CPU contention rather than product state. Strongest
verification used instead: instrument `__frameStop` to dump every sample, then
run the guard under both conditions. That is the table in §3 — the failing run
shows one 68ms outlier over an otherwise ~26ms distribution, which is what
distinguishes a flaky statistic from a real stall.

## Fix

Assert on the **second-worst** frame instead of the worst, at a threshold
recalibrated to the measured distributions (50ms):

- The regression this guard exists for is *systemic* — every tick frame of the
  gesture re-renders the whole board (2nd worst 68–73ms, top five all ≥65ms), so
  the second-worst sample proves it exactly as well as the worst.
- Unlike the worst, the second-worst cannot be set by one stall: it held at
  25–28ms across every healthy run, including the runs that failed on `max`.
- 50ms sits 1.8x above the healthy value and 1.36x below the regressed one. The
  previous 60ms would still work with this statistic but only by 1.15x, which
  would let a *partial* regression through; the e2e suite runs on developer
  machines only (no CI job runs Playwright), so the tolerance does not need to
  cover slow shared runners.

## Verification

**Resolved 2026-07-28.** Same 160-node board, same machine, dev server; the
issue-00019 perf fix stashed and restored between runs so nothing else differs.

| condition | recalibrated guard |
| --- | --- |
| perf fix reverted, ×3 | **fails** at 2nd-worst 73 / 73 / 76 ms (as it must) |
| healthy, 1 worker, ×3 | passes |
| healthy, full suite via `npm run test:e2e` (6 workers), ×4 | passes, 57/57 every run |

The guard's own coverage is unchanged otherwise: it still asserts the node count
is untouched by the gesture and that the frame clock actually sampled it. 271
unit + 57 e2e green; lint and `tsc --noEmit` clean.

Not addressed here: `playwright.config.ts`'s `webServer` cannot start while a
`next dev` is already running in the same directory (Next 16 allows one dev
server per directory), so `npm run test:e2e` fails outright with
`Process from config.webServer was not able to start` until the dev server is
stopped. Independent of this issue and deliberately left open.
