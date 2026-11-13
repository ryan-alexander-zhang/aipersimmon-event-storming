---
id: plan-00025-modelling-heuristics
type: plan
role: main
status: resolved
parent: decision-00018-heuristics-decide-events-contexts-and-aggregates
---

# Plan: named heuristics for events, contexts and aggregates

Implements [decision-00018](../decision/decision-00018-heuristics-decide-events-contexts-and-aggregates.md).
Terms follow [CONTEXT.md](../../CONTEXT.md).

Most of the decision is guidance the skill applies in conversation. The code part
is small:

- two optional context fields;
- three health findings, each mirrored in `validate.py`;
- one menu item and the Context Map card.

The examples carry the most work. A scan on 2026-11-13 found four of the five
design-level examples (agile-pm, cargo, ftgo, ride-hailing) and `template.json`
with no constraint at all, so all 20 of their aggregates would be
`unguarded-aggregate`. Only `big.json` has constraints, and 7 of its aggregates
still have none. `ftgo` has the events `Order Created` and `Ticket Created`.
`cargo`'s `Cargo Loaded` is a real business event, which is why `Loaded` is not
in the decision's list.

## Acceptance criteria

| Id | Given / When / Then |
|---|---|
| AC-1 | Given a context with `purpose` and `language`, when imported, then both are kept. An empty `purpose`, an empty `term` or `meaning`, or one term twice in one context is rejected. |
| AC-2 | Given a `5.0` model, when imported, then it migrates to `5.1` with nothing else changed. Export, split and merge keep `purpose` and `language`. |
| AC-3 | Given an event whose label's last word is in the decision's list (`Order Created`, `Button Clicked`), when health runs at any level, then `technical-event` warns once for that event. `Cargo Loaded` and `Item Removed` do not warn. |
| AC-4 | Given a design-level context without `purpose`, then the editor warns `missing-purpose` and the validator errors. Below design, neither reports anything. |
| AC-5 | Given a design-level aggregate none of whose handled commands is `constrainedBy` a constraint, then `unguarded-aggregate` warns. With one such constraint, it does not. Below design, nothing is reported. |
| AC-6 | Given an aggregate over the 5/5 threshold, then the `overloaded-aggregate` message asks which rule its commands share (G2), not only for a split. |
| AC-7 | Given a context, when the Modeler sets its purpose from the context's `⋯` menu, then the model holds it and the Context Map card shows it with the context's terms. Clearing the prompt removes the purpose. |
| AC-8 | Given the same model, the validator reports the same three findings as the editor, plus errors for a malformed `language`. |
| AC-9 | The skill's `big-picture.md`, `context-map.md` and `design.md` carry the decision's heuristic tables (ids, sources, an example and a counter-example per row). `SKILL.md` gates check them by id and tell the skill to name the heuristic when it moves a sticky, draws a boundary or splits an aggregate. |
| AC-10 | Every shipped example and `template.json`: every context has a `purpose`; no aggregate is `unguarded-aggregate`; no event is `technical-event`; the validator reports no error (warnings that predate this plan may remain). |

## Phase 1 - the format

| # | Task | Verify |
|---|---|---|
| P1.1 | `schema.ts`: `purpose` and `language` on `contextSchema`, with a refine for unique terms. `DSL_VERSION` `5.1`. | unit serialize.test: AC-1 |
| P1.2 | `migrate.ts`: `5.0 -> 5.1`, version only. | unit: AC-2 migration; split.test round-trip with both fields |

## Phase 2 - model health

| # | Task | Verify |
|---|---|---|
| P2.1 | `health.ts`: `technical-event` (any level), `missing-purpose` (design), `unguarded-aggregate` (design). | unit health.test: AC-3, AC-4, AC-5 |
| P2.2 | `overloaded-aggregate` message carries the G2 question. | unit: AC-6 |

## Phase 3 - the editor

| # | Task | Verify |
|---|---|---|
| P3.1 | Store: `setContextPurpose(id, purpose \| undefined)`. | unit store.test |
| P3.2 | `board-chrome.tsx` `⋯` menu: **Purpose** prompt, beside **Subdomain name**. `context-node.tsx`: purpose under the name; terms in the card as `term - meaning`. | e2e: AC-7 |

## Phase 4 - the validator

| # | Task | Verify |
|---|---|---|
| P4.1 | `validate.py` and `grammar.json` `5.1`: `language` shape and duplicate-term errors; `missing-purpose` error at design; `technical-event` and `unguarded-aggregate` warnings. | runs on broken copies, one per check: AC-8; grammar guard test passes |

## Phase 5 - the skill

| # | Task | Verify |
|---|---|---|
| P5.1 | `big-picture.md`: E1-E5, P1, and the rejected-sticky table, applied at Converge. `context-map.md`: B1-B6, A1-A3, the `purpose` and `language` steps, the revisit-from-Design rule. `design.md`: G1-G6. The 5/5 rule becomes a size signal there. `dsl.md`: the two fields and the three findings. `SKILL.md`: gates by id; name the heuristic when acting. | read against the decision: AC-9 |

## Phase 6 - examples

| # | Task | Verify |
|---|---|---|
| P6.1 | `purpose` on every context of every example and `template.json`. `language` where two contexts use one term differently (B1). | AC-10 |
| P6.2 | Real invariants as constraints for each unguarded aggregate (45 constraints in the end, see record-00027), each with `properties.rule`, wired by `constrainedBy` from the command it guards. Where a rule spans aggregates, use a policy instead (G5). | AC-10, validator clean |
| P6.3 | `ftgo`: rename `Order Created` and `Ticket Created` to the business fact. ride-hailing's context files are regenerated through `splitModel`, so split-example.test stays green. | AC-10 |

## Out of scope

- Editing `language` in the editor (decision-00018).
- The full Bounded Context and Aggregate Design Canvases.
- Any check that an aggregate's constraints fall into disjoint groups.

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases are done.
- `tsc`, `bun run lint` and `bun run build` are clean.
- Unit and e2e tests are green.
- New code is at 90% line / branch / function coverage.
- A subagent checks every AC against a passing test or a recorded validator run.
  The result is a `docs/record/` acceptance checklist.
