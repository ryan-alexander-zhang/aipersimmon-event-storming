---
id: record-00025-alternative-sets-acceptance
type: record
role: main
status: active
parent: us-00035-alternative-sets
---

# Acceptance record: things that happen instead of each other

Acceptance evidence for [us-00035](../us/us-00035-alternative-sets.md) under
[spec-00011](../spec/spec-00011-structured-rule-expression.md), designed by
[decision-00013](../decision/decision-00013-alternative-sets-recover-the-fork-the-layout-removed.md).
Verified 2026-08-18. Replaces the mechanism recorded in
[record-00024](./record-00024-policy-branch-dispatch-acceptance.md): `Policy.dispatch` was
removed the day after it shipped.

No `docs/plan` doc: one optional attribute plus two health findings across schema /
serialize / panel / sticky / health and the skill's copy — localized, so DEVELOPMENT.md's
inline-reasoning path applies. Coverage was cross-checked assertion-by-assertion in-session
rather than by an independent subagent (CLAUDE.md §7), because this session was instructed
not to spawn agents. Read the mapping below as self-reported.

## Gate results

- Unit: **347 passed** (`bun run test`). New/changed: 1 in `serialize.test.ts`, 3 in
  `health.test.ts`; each was red before the implementation. (353 before FR-6 was withdrawn,
  which removed 6.)
- E2E: **93 passed, 1 failed** (`bunx playwright test`). The failure is the pre-existing
  `[issue-00028]` wheel-zoom budget, unrelated and confirmed pre-existing on a clean tree in
  issue-00036.
- `tsc --noEmit` and lint clean.
- No DSL bump: `alternativeSet` is an optional additive property. A model written with the
  one-day-old `dispatch` still imports — unknown properties are stripped by the schema, so
  the field is dropped rather than rejected.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (two events in one set; each shows it) | e2e "two events are marked as alternatives…": both Commands get set `route` and both stickies read "one of"; unit serialize.test round-trip for the stored value | pass |
| AC-1.2 (clearing the set drops the marker) | e2e same test's tail: clearing one member's field removes its "one of" | pass |
| AC-2.1 (a mixed Command + Domain Event set is stored, not rejected) | unit serialize.test "round-trips an alternative set, across both member types" — `hold-outcome` spans a Command and an Event | pass |
| AC-3.1 (the set survives export/import) | unit serialize.test same test: `fromModel(toModel(...))` keeps all four keys, export writes `properties.alternativeSet` | pass |
| AC-3.2 (a Model from before this story imports clean) | unit serialize.test "imports a pre-spec v4.0 file without the rule fields unchanged", extended with `alternativeSet` undefined | pass |
| AC-4.1 / AC-4.2 / AC-4.3 | **withdrawn** the same day — see the amendment note in us-00035 and the entry below | n/a |
| AC-5.1 (a one-member set is reported) | unit health.test "reports a set with one member — nothing happens instead of itself", "says nothing once the set has two members"; e2e asserts the "one member" finding after clearing one side | pass |
| FR-8 (nothing evaluates a set) | no test: a scope statement; the only code reading `alternativeSet` is the sticky chip and the two findings | n/a |

## Notes

- **Why the marker is not on the Command.** Derived from the method, not from the repo's
  models: a Domain Event has four sources (a Command against an Aggregate, an External
  System, time passing, and nothing at all at Big Picture), so any element-anchored marker
  covers one case and fails where branches are first discussed. decision-00013 has the full
  argument, including the part that matters most — a wall carries the fork in its *shape*,
  and decision-00002 / decision-00005 deleted free geometry here.
- **Health asks only at a moment.** A Policy firing and a Command attempting are moments; an
  Aggregate is a boundary handling many Commands across the whole board, so its `emits` are
  never questioned. This is what keeps the finding from firing on every aggregate.
- **Chip and tooltip.** The sticky shows `ONE OF`; the set's key is the chip's `title`,
  because the chip has one line and the sticky has a 96px ceiling (issue-00036). Measured
  after the change: a two-line event with the chip stays inside the ceiling.
- **The skill was updated in the same change**: `alternativeSet` in `validate.py`'s `PROPS`
  (restricted to `domainEvent` / `command`, so it errors elsewhere), warnings mirroring both
  findings, an "Alternative sets" section in `reference/dsl.md`, the branch question and gate
  item in `reference/process.md`, and a line in `reference/big-picture.md` — the level where
  the marker matters most and where no Command exists to carry one. Verified: warns with no
  set, silent with a set on both outcomes, warns on a one-member set, errors on a set placed
  on a Policy.
- **Per-type legality is enforced in the panel and the skill, not in Zod.** `propertiesSchema`
  is flat, exactly as it already is for `condition` / `rule` / `execution`; the property panel
  offers the field on Domain Event and Command only.
- **The skill's `template.json` demonstrates it**, on the case that motivated the design:
  `Payment Captured` / `Payment Failed` share `alternativeSet: "charge-outcome"`, and their
  moment — the gateway's response — is an External System `emits`, so no element-anchored
  marker could have carried it. The stale wording "one of two *concurrent* outcomes" in that
  event's description is corrected in the same edit. Verified by importing the template into
  the app: two `one of` chips titled `one of: charge-outcome`, and health reports only the
  template's deliberate open hotspot.
- **The shipped examples now carry their forks.** `ride-hailing`: the offer's three ways
  (`Driver Accepted` / `Driver Declined` / `Match Timed Out`, the issue-00002 case) as
  `dispatch-outcome`, and `Payment Captured` / `Payment Failed` as `charge-outcome`; `ftgo`:
  `Card Authorized` / `Card Declined` as `card-authorization` and `Order Approved` /
  `Order Rejected` as `order-approval`. `cargo-shipping` and `agile-pm` have no fork worth
  claiming — their multi-event emitters are sequential steps — and were left alone. Three
  descriptions that called those pairs "concurrent outcomes" are corrected in the same edit;
  they were the exact confusion this story removes.
- **The `undeclared-alternatives` finding was built, shipped, and withdrawn the same day.**
  `ftgo`'s `Create Order Saga` invokes `Create Ticket` *and* `Authorize Card` — both fire, in
  sequence — and with `Policy.dispatch` gone the model cannot say so, so the finding nagged a
  correct example with a question it had no way to answer. It was dropped rather than
  silenced by annotating a fork that does not exist: a finding that fires on correct models
  teaches people to ignore model health. `lone-alternative` stays, because a set of one is
  wrong under any reading, and the question moved into the skill's interview
  (`reference/process.md`, `reference/big-picture.md`, `reference/dsl.md` all now say plainly
  that nothing warns about a missing set). Every example and the template are advisory-clean
  on this axis afterwards: `ftgo` 3 warnings, `ride-hailing` 4, both only pre-existing
  hotspot and reaction-cycle notes.
