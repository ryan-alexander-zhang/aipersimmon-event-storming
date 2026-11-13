---
id: record-00027-modelling-heuristics-acceptance
type: record
role: main
status: active
parent: plan-00025-modelling-heuristics
---

# Acceptance record: named heuristics for events, contexts and aggregates

Acceptance evidence for [plan-00025](../plan/plan-00025-modelling-heuristics.md),
which implements [decision-00018](../decision/decision-00018-heuristics-decide-events-contexts-and-aggregates.md).
Verified 2026-11-13.

An independent subagent checked each AC against the docs, the tests and its own
validator runs (CLAUDE.md §7). The gaps it found were fixed in-session, as noted
below.

## Gate results

- **Unit: 412 passed** (`bunx vitest run`).
  - Added to `health.test.ts`, `serialize.test.ts`, `split.test.ts`,
    `store.test.ts` and `tests/skill-grammar-guard.test.ts`.
  - `tests/split-example.test.ts` counts updated.
- **E2E: 103 passed** (`bunx playwright test`). New test: the purpose and terms on
  the Context Map.
- `tsc --noEmit`, `bun run lint` and `bun run build` are clean.
- **Coverage on changed logic** (line / branch / function):
  - `health.ts`: 99.4 / 95.6 / 100.
  - `store.ts`: 97.7 / 85.6 / 97.1. Its uncovered lines predate this plan;
    `setContextPurpose` is covered.
  - `migrate.ts`: 100 / 81.3 / 100. The uncovered branches are in the v1-v3
    migrations; `5.0 -> 5.1` is covered.
- **DSL `5.1`.** A `5.0` file imports with only its version changed.

## AC coverage

| AC | Evidence |
|---|---|
| AC-1 | `serialize.test.ts` "a context's purpose and language": round-trip; rejects an empty purpose, an empty term or meaning, and a term twice in any case. |
| AC-2 | `serialize.test.ts` "migrates a 5.0 file by its version alone". `split.test.ts` AC-2/AC-3 round-trip, whose fixture context carries `purpose` and `language`. |
| AC-3 | `health.test.ts` "warns on an event named by a CRUD or UI verb": `Cargo Loaded`, `Item Removed` and a command named `Order Created` do not warn. |
| AC-4 | `health.test.ts` "warns on a design-level context without a purpose". Validator runs: an error at `design`, nothing at `process`. |
| AC-5 | `health.test.ts` "warns on a design-level aggregate whose commands no constraint guards". |
| AC-6 | `health.test.ts` overloaded-aggregate test asserts the G2 question. The validator prints the same text (seen on `big.json`'s `Payment`). |
| AC-7 | `e2e/editor.spec.ts` "sets a context's purpose and shows it with its terms on the Context Map"; `store.test.ts` "sets and clears a context's purpose". |
| AC-8 | One broken copy per check (missing purpose, duplicate term, malformed language, a `... Created` event, an unguarded aggregate): the validator reports each one. Run on a model combining all three findings, `analyzeModel` returns exactly `missing-purpose`, `technical-event` and `unguarded-aggregate`. `skill-grammar-guard.test.ts` locks `grammar.json` `technicalVerbs` to `TECHNICAL_VERBS`. |
| AC-9 | `big-picture.md`: E1-E5, the rejected-sticky table, P1. `context-map.md`: B1-B6, A1-A3, revisit-from-Design. `design.md`: G1-G6. Each has a sources line. `SKILL.md` gates cite the ids, and rule 5 says to name the heuristic. |
| AC-10 | Validator on `big.json`, the three single-file examples, `ride-hailing/domain.json` and `template.json`: 0 errors, and none of the three new findings. |

### AC-10: warnings that predate this plan and remain

- open hotspots in every example;
- reaction cycles in `big.json`, `ftgo` and `ride-hailing`;
- in `big.json`:
  - one unordered event;
  - three commands nothing issues;
  - an overloaded `Payment` aggregate.

AC-10 means "no error and none of the new findings", not "no warning".

## Gaps the audit found, and what was done

1. **AC-9: examples per row.** Only the E table had an example and a
   counter-example in each row. Fixed:
   - B1-B6 got "Boundary here" and "Not a boundary" columns;
   - G1-G6 got "Example" and "Counter-example" columns;
   - P1 got one pivotal and one non-pivotal event.

   A1-A3 carry the bad shape in the pattern and the fix in "Instead".
2. **ftgo `Schedule Delivery` was constrained by "A courier is available".** That
   is availability, not an invariant, and the model has no "no courier" outcome.
   Replaced with "One delivery per order".
3. **agile-pm `Start Discussion` was constrained by a subscription held in
   Identity & Access.** That is a cross-context rule (G6). Replaced with "One
   discussion per subject".
4. **The template's `Item in stock` needs stock that no context owns.** It
   predates this plan. The template now raises the hotspot the skill prescribes
   for this case (`ord-h-stock`, annotating the constraint). This makes the
   template teach the G6 rule rather than the smell.

## Known, left as they are

- `big.json`: `Pay Invoice` and `Start Automatic Charge` (Payment) are constrained
  by `Committed Invoice only` (Invoicing). This is a cross-context constraint
  that predates this plan.
- `big.json`: its 14 earlier constraints carry `description` but no `rule`.
- `big.json`: the `Notification` context matches anti-pattern A2 (a technical
  context).

  Each of these is a modelling change to an example, out of this plan's scope.

## Example changes

- **45 constraints** added, and 56 `constrainedBy` edges. Every aggregate in every
  example now guards at least one constraint.
- **Every context has a `purpose`.** `language` is written where B1 draws the
  boundary:
  - Invoicing / Payment: "Payment";
  - Catalog / Ordering: "Price";
  - Booking "Itinerary" / Routing "Route";
  - Trip Ordering "Ride" / Trip Lifecycle "Trip";
  - Identity & Access "User" / Agile Project Management "Team Member" /
    Collaboration "Author".
- **ftgo renamed for E2/E5:**
  - `Create Order` / `Order Created` -> `Place Order` / `Order Placed`;
  - `Create Ticket` / `Ticket Created` -> `Open Ticket` / `Ticket Opened`.

  Ids are unchanged.
- The ride-hailing context files are byte-identical to `splitModel` output
  (`tests/split-example.test.ts`).
