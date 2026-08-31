---
id: issue-00039-a-time-raised-event-cannot-exist-without-a-fake-producer
type: issue
role: main
status: resolved
parent: decision-00014-temporal-events-carry-the-clock-not-a-fake-producer
---

# A time-raised event cannot exist without a fake producer

## Problem

An event raised by time passing — `Billing Month Ended`, `Hold Expired`, `Review Window
Closed` — cannot be written legally. The grammar offers no source for it, the validator
rejects any attempt to mark it (`ERROR node …: unknown property 'temporal'`), and at
Process level both the skill's gate ("every event has a producing command or external
system") and the editor's health check (`orphan-event`) flag it until the modeller
invents a fake `Clock`/`Scheduler` External System. The fake is a wrong model: it
asserts an outside integration and a context seam that do not exist.

## Context / Trigger

A methodology review against Brandolini's canon (2026-08-31): *Introducing
EventStorming* treats **time-triggered events** as first-class notation (a calendar icon
on the orange sticky). This DSL's own docs mention "a deadline elapsing" as an
`alternativeSet` example (`reference/dsl.md`), so the concept is acknowledged — but has
no carrier. Ranked the most severe finding of the review: the grammar gap and the gates
*combine* to force a wrong model, systematically.

## Root Cause (first principles)

1. **Observed**: a producerless `domainEvent` warns (`orphan event` in `validate.py`,
   `orphan-event` in `web/lib/analysis/health.ts:61`) and fails the skill's Process
   gate; marking it `temporal: true` is an ERROR in `validate.py` (unknown property)
   and is silently **stripped** on editor import (`propertiesSchema` is a non-strict
   `z.object`, `web/lib/dsl/schema.ts:13` — unknown keys are dropped, so the marker
   would not even survive a round-trip).
   **Expected**: the method's calendar-icon event — raised by time, no producer, still
   an ordinary event downstream.
2. **Mechanism**: every source of an event the DSL implements is an on-board node —
   `command —produces→`, `aggregate/externalSystem —emits→`. The two producer checks
   (`validate.py` `check_health`, `health.ts` `orphan-event`) quantify over *all*
   events with no exemption, and `reference/process.md`'s gate repeats the same
   quantifier in prose.
3. **True root cause**: [decision-00013](../decision/decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md)
   enumerated four sources of a Domain Event — Command, External System, **time
   passing**, and (at Big Picture) none — but the DSL only ever grew carriers for the
   first two. "Time passing" received `alternativeSet` membership as a *fork* member,
   never a *source* marker, while the producer checks were written as if the first two
   sources were the only ones. It is not a layout problem (a temporal event sits on the
   timeline like any other), not a gate-wording problem alone (relaxing the gate would
   just silence the check for the majority case it exists for), and not an editor-only
   problem (the skill's validator rejects the model before the editor ever sees it).

## Fix

Per [decision-00014](../decision/decision-00014-temporal-events-carry-the-clock-not-a-fake-producer.md):
optional `temporal: boolean` on `domainEvent`, exempting the event from both producer
checks; clock badge + panel checkbox in the editor; skill reference docs and gates
updated; `CONTEXT.md` glossary entry. DSL stays `4.0` (additive).

Consumer-facing surfaces carry the change: `reference/dsl.md` (property table, a
dedicated "Temporal events" section, two Common-errors entries), `reference/process.md`
step 1 + question bank + gate, `reference/big-picture.md` step 4, the `SKILL.md`
Process gate, `template.json` (a temporal `Refund Window Elapsed`), and
`examples/ride-hailing-event-storming.json` — which shipped the exact anti-pattern
this issue names: a fake `Dispatch Timer` External System emitting `Match Timed Out`.
The timer node and its `emits` edge are removed and the event is marked `temporal`
(0 errors, warning count unchanged).

## Reproduction (test-first)

Written before the fix, each failing for the reason the issue states:

- `web/lib/dsl/schema.test.ts` — "keeps the temporal marker on import [issue-00039]":
  parse strips `temporal: true` (got `undefined`).
- `web/lib/dsl/serialize.test.ts` — round-trip test: `temporal` lost in both
  directions.
- `web/lib/analysis/health.test.ts` — "a temporal Domain Event is not an orphan
  [issue-00039]": one `orphan-event` finding where none is expected.
- `web/lib/dsl/diff.test.ts` — "records a temporal toggle as a changed field
  [issue-00039]": the toggle produces no field diff.
- `skills/event-storming/scripts/validate.py` on a minimal temporal model:
  `ERROR node bil-e-month-ended: unknown property 'temporal'` plus
  `WARN orphan event 'Billing Month Ended'` before the fix; 0 errors, 0 warnings after.

## Verification

- The four reproduction tests were red before the fix (schema stripped the marker,
  serialize lost it both ways, health flagged the orphan, diff missed the toggle)
  and are green after; they stay as the regression guard.
- unit **351 passed** (`bun run test`), lint and `tsc --noEmit` clean,
  `bun run build` clean.
- e2e **94 passed, 1 failed** — the failure is the pre-existing flaky Isolate test
  (`Isolate stays visible with nothing selected and exits with Esc [design-00003]`),
  which passes when run alone on this tree; the new
  "toggling temporal shows the clock badge [issue-00039]" test passes in the suite
  and alone.
- `validate.py` on the minimal temporal model (temporal event → policy → command →
  event): `ERROR unknown property 'temporal'` + `WARN orphan event` before the fix;
  **0 errors, 0 warnings** after. Re-run on `template.json` (which now carries a
  temporal `Refund Window Elapsed` event) and all five `examples/*.json`: 0 errors
  each, warning counts unchanged.
