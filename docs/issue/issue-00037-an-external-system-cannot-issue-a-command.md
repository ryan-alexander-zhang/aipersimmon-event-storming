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
- `design-00001` §2's rule table updated to match.

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

- unit **325 passed** (`bun run test`), e2e **92 passed, 1 failed** — the failure is
  the pre-existing `[issue-00028]` wheel-zoom timing budget, which fails the same way
  on a clean tree. `tsc --noEmit` and lint clean.

## Noted, not fixed

`design-00001` §2's table is stale beyond the row corrected here: it predates
decision-00003 and spec-00003, so it still omits `produces`, `constrainedBy`, and
`highlights`, and its element list omits `constraint` and `opportunity`. Left alone to
keep this change surgical.
