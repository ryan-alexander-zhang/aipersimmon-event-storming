---
id: issue-00037-an-external-system-cannot-issue-a-command
type: issue
role: main
status: resolved
parent: decision-00003-level-grammar-constraint-vs-aggregate
---

# An External System cannot issue a Command, though the grammar says it can

## Problem

The board refuses `External System —issues→ Command`: the connection is invalid, and
no slice action offers it. An outside system can only appear as something we call
(`Command —handledBy→ External System`) or as a source of facts
(`External System —emits→ Domain Event`) — never as the one asking us to act.

## Context / Trigger

Asked directly while modelling a payment flow: "External System 可以 issue command
吗?" Method-wise yes — a Command's origin is a person, a Policy, or an outside
system — and **this project's own decision doc already says so**.

## Root Cause (first principles)

1. **Observed**: `resolveRelation("externalSystem", "command")` returns `null`, so
   the edge cannot be drawn and no slice action exists.
   **Expected**: it resolves to `issues`, per
   [decision-00003](../decision/decision-00003-level-grammar-constraint-vs-aggregate.md)'s
   Process-level grammar, which lists verbatim:
   `External System —issues→ Command / —emits→ Domain Event`.
2. **Mechanism**: the connection-rule table
   ([`relations.ts`](../../web/lib/eventstorming/relations.ts)) had
   `{ relation: "issues", sources: ["actor"], targets: ["command"] }` — one source.
   `resolveRelation` matches on (source, target), so the pair simply had no rule.
   `SLICE` ([`property-panel.tsx`](../../web/components/property-panel.tsx)) mirrored
   that: `externalSystem` offered `emits` and `handled by` only, and `command`
   offered `+ Actor (issues)` as its only origin.
3. **True root cause**: **decision-00003 was implemented in halves.** It introduced
   the level-scoped grammar and the `Command —produces→ Domain Event` spine, and the
   External System line's `emits` half shipped while its `issues` half did not. The
   rule table is the single source of truth for both the validator and the tests, so
   nothing was left to catch the omission — the test table
   (`relations.test.ts` `VALID`) was written from the code, not from the decision.
   It is not an Event Storming disagreement (the method allows it), not a layout
   limitation (an External System shares the top `actorSystem` band with Actor, so it
   lays out above the Command exactly as an Actor does), and not a store limitation
   (`connect` resolves whatever the table allows).

## Why the distinction matters (not just completeness)

The three External System relations say three different things, and only two existed:

| relation | meaning | direction |
|---|---|---|
| `Command —handledBy→ External System` | we call out to it | outgoing |
| `External System —emits→ Domain Event` | a fact arrives from outside | incoming, already true |
| `External System —issues→ Command` | it asks us to act | incoming, **may be refused** |

A provider callback modelled as an event asserts something already happened; modelled
as a Command it can be `constrainedBy` and can fail. Forcing the second kind into the
first erases exactly the validation and rejection the model exists to expose.

## Fix

- `relations.ts`: `issues` sources become `["actor", "externalSystem"]`. Direction
  keeps it apart from `handledBy` — `resolveRelation` is directional, so
  `externalSystem → command` is `issues` while `command → externalSystem` stays
  `handledBy`, with no ambiguity to resolve.
- `SLICE`: `externalSystem` gains `+ Command (issues)`; `command` gains
  `+ External System (issues)` beside `+ Actor (issues)`, so the alternative origin is
  reachable from either end.
- Nothing else needed changing: `computePlacement` already pulls a Command's `issues`
  source into the Command's column ([`layout.ts:72`](../../web/lib/layout/layout.ts)),
  the `actorSystem` band puts it above, and model health does not look at issuer type.
- The prose mirrors of the rule table are aligned with the code and **guarded** so
  they cannot drift again — `web/tests/grammar-doc-guard.test.ts` parses both
  `design-00002` §3 and `CONTEXT.md`'s relation list and fails if either disagrees
  with `CONNECTION_RULES`:
  - `design-00002` §3 gains the four relations it never listed (`produces`,
    `constrainedBy`, `updates` was there, `highlights`) and the `issues` source added
    here, with a note recording which decision brought each.
  - `CONTEXT.md`: `issues` gains External System; `handledBy` gains it too (a
    pre-existing omission the guard surfaced); `emits`'s parenthetical becomes a plain
    second source so the glossary parses.
  - `spec-00001` §1 stops enumerating the terms and points at `CONTEXT.md`, which is
    where they are defined — the enumeration was stale by four relations.
  - `design-00001` §2 is left as it was: that doc is `archived` and superseded by
    design-00002, so its table is history, not a claim about today.
  - The **authoring skill** carried the grammar twice more, and one copy was worse than
    stale: `skills/event-storming/scripts/validate.py`'s `RULES` **rejected**
    `externalSystem -> command` outright (`ERROR edge e1: externalSystem -> command is
    not a legal connection`), so the skill would have refused to write a model the app
    now accepts. Both its copies — `reference/dsl.md`'s table and the validator — are
    fixed and guarded, and the prose that repeated the old rule follows:
    `reference/process.md` step 2 and its gate, `reference/dsl.md`'s element table
    ("can issue and handle commands"), and `SKILL.md`'s Process gate.

## Reproduction (test-first)

- unit `relations.test.ts`: `["externalSystem", "issues", "command"]` added to the
  `VALID` table (which also drives the exhaustive type-matrix test), plus "keeps the
  two directions between a Command and an External System apart [issue-00037]".
  Three tests red before the fix (`expected null to be 'issues'`).
- e2e `editor.spec.ts` "an External System issues a Command, as well as handling one
  [issue-00037, decision-00003]": at Process level, add an External System, use
  `+ Command (issues)`, assert the `issues` edge and that the system lays out above
  the Command; then use `+ Command (handled by)` from the same system and assert the
  `handledBy` edge. Red before the fix — the slice action did not exist
  (`waiting for getByRole('button', { name: '+ Command (issues)' })`), verified by
  stashing the two source files.

## Verification

- unit **373 passed** (`bun run test`), e2e **92 passed, 1 failed** — the failure is
  the pre-existing `[issue-00028]` wheel-zoom timing budget, which fails the same way
  on a clean tree. `tsc --noEmit` and lint clean.
- The guard was checked in both directions: it goes red when a mirror is edited back
  (design-00002's `issues` row, `CONTEXT.md`'s `handledBy` line), and it was red on
  both skill mirrors before they were fixed.
- `validate.py` run on a minimal `externalSystem —issues→ command —produces→ event`
  model: 1 error before the fix, 0 after. Re-run on `template.json` and all five
  `examples/*.json`: 0 errors each, warnings unchanged.

## Noted, not fixed

`design-00002`'s other sections still describe the board as it was designed then — DSL
v2 in §3's class diagram, and a per-context column model in §4 that
[decision-00005](../decision/decision-00005-global-timeline-bc-as-region.md) replaced
with one global timeline. Those read as the record of that design step rather than as
current claims, and re-deriving them is a doc job of its own; only the rule table was
presented as live truth, and only it is guarded.
