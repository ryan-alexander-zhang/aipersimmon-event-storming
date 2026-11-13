---
id: plan-00026-synonyms-integration-context-level
type: plan
role: main
status: resolved
parent: decision-00019-rejected-synonyms-derived-integration-per-context-level
---

# Plan: rejected synonyms, derived integration style, a level per context

Implements [decision-00019](../decision/decision-00019-rejected-synonyms-derived-integration-per-context-level.md).
Terms follow [CONTEXT.md](../../CONTEXT.md).

## The one shared idea

Level-dependent checks today read one `level` argument (`analyzeModel(..., level)`,
`check_*(..., level)`). Both sides get one helper instead:
`levelOf(node) = min(contexts[node.context].level ?? meta.level, meta.level)`. Every check that
says "at design" or "not at big-picture" asks it per element.

The seam walk that `unbacked-seam` already does gets a classifier:
`style(relation) -> "events" | "api"` and the upstream end. Both `reversed-dependency`
and the derived style read it. Nothing else is new machinery.

## Scan of the shipped examples (2026-11-13)

`reversed-dependency` would fire on 19 seams:

| Example | Seams | Pattern |
|---|---|---|
| `big.json` | 14 | Notification is drawn downstream though callers depend on it; Invoicing and Payment, and Payment and Connector, depend on each other both ways |
| `ftgo` | 4 | the Order saga calls Accounting and Kitchen, and Accounting's events come back to Order, but Order is drawn upstream |
| `cargo` | 1 | Routing reacts to `Cargo Booked`, but is drawn upstream of Booking |

None fire on `ride-hailing` or `template.json`. Each one is fixed (flip the
relationship, or change its type) or kept with its reason in the acceptance
record. The `big.json` cases go to the user before they change.

## Acceptance criteria

| Id | Given / When / Then |
|---|---|
| AC-1 | Given a term with `avoid`, when imported or validated, then it is kept. An empty word, a word listed twice for one term, or an `avoid` word that is a `term` of the same context (any case) is rejected by the editor and is an ERROR in the validator. |
| AC-2 | Given a `5.1` model, when imported, then it migrates to `5.2` with only the version changed. Export, split and merge keep `avoid` and `contexts[].level`. |
| AC-3 | Given a relationship whose pair has seams, when the validator runs, then it reports the styles they use (`api`, `events`, or both). A pair with no seams reports none. Commentary and Actor edges never count. |
| AC-4 | Given a directional relationship and a seam that makes its declared upstream depend on its declared downstream, then the validator and the editor's health warn `reversed-dependency` once per pair. A pair with another relationship pointing the derived way, or with a symmetric type, is not reported. |
| AC-4b | Given a pair whose seams depend both ways, then the validator and the editor's health warn `mutual-dependency` once for it (and not `reversed-dependency`), unless the pair declares `partnership` or `sharedKernel`; a relationship in each direction does not silence it. |
| AC-5 | Given a policy without `execution`, when its level is `design`, then the validator errors and the editor warns `missing-execution`. Below design, the validator warns and the editor reports nothing. |
| AC-6 | Given a context whose `level` is above `meta.level`, then it imports and validates, its declared level is kept, and every check treats it as at `meta.level` (decision-00019, amended). |
| AC-7 | Given a design model with a `big-picture` context holding a command, then the validator errors, and the editor warns `type-above-level` naming the node. The same command in a context at `design` is fine. In the validator, an Ungrouped node is judged by `meta.level`. In the editor, a type above the model's level is hidden by the view, not reported. |
| AC-8 | Given a design model with one context at `big-picture`: that context needs no `subdomain.type` and no `purpose`; its events are not `orphan-event`; its aggregates, were any allowed, would not be checked for guards. The design context next to it still is. This holds in the validator and in the editor's health. The editor's `orphan-event` is exempt at `big-picture` like the validator's. |
| AC-9 | Given one model written once as a single file and once split, then the validator reports the same errors and warnings for both. |
| AC-10 | Given a context, when the Modeler picks a level from its `⋯` menu, then the context gets it. All three levels are offered, and "Model's level" clears it. |
| AC-11 | The skill documents `avoid`, the derivation table, the severities and per-context level (`dsl.md`, `context-map.md`, `process.md`, `design.md`, `SKILL.md`), with gates that check them. |
| AC-12 | Every shipped example and `template.json` is `5.2`, with 0 errors. Each `reversed-dependency` is fixed, or kept with its reason in the acceptance record. |

## Phase 1 - the format

| # | Task | Verify |
|---|---|---|
| P1.1 | `schema.ts`: `avoid` on `termSchema` (non-empty, unique); context refine: no `avoid` word is a term of the context; `level` on `contextSchema`; `DSL_VERSION` `5.2`. | unit serialize.test: AC-1, AC-6 |
| P1.2 | `migrate.ts`: `5.1 -> 5.2`, version only. | unit: AC-2; split.test round-trip with both fields |

## Phase 2 - model health

| # | Task | Verify |
|---|---|---|
| P2.1 | `health.ts`: effective level per element, replacing every `level === ...` test; `orphan-event` exempt at big-picture. | unit health.test: AC-8 |
| P2.2 | `type-above-level`, `missing-execution`, `reversed-dependency`, `mutual-dependency` (with the style classifier shared by `unbacked-seam`). | unit: AC-4, AC-5, AC-7 |

## Phase 3 - the editor

| # | Task | Verify |
|---|---|---|
| P3.1 | Store `setContextLevel(id, level \| undefined)`; `board-chrome.tsx` `⋯` menu: the three levels, and "Model's level". `health-panel.tsx` already passes contexts and relationships. | unit store.test; e2e: AC-10 |

## Phase 4 - the validator

| # | Task | Verify |
|---|---|---|
| P4.1 | `validate.py` and `grammar.json` `5.2`. Changes: `avoid` checks; `levelOf` everywhere (capped by `meta.level`); `execution` severity; `reversed dependency` warning; an `INFO` line per relationship with its derived style. | broken copies, one per check: AC-1, AC-3..AC-8; grammar guard test |
| P4.2 | A unit test that validates `examples/ride-hailing/` split and merged and compares the output. | AC-9 |

## Phase 5 - the skill

| # | Task | Verify |
|---|---|---|
| P5.1 | `dsl.md`: `avoid`, `contexts[].level`, the derivation table, `execution` severity. `context-map.md`: write `avoid` with the terms; read the derived style; the gate checks `reversed dependency`. `process.md` and `design.md` gates: `execution` is required at design. `SKILL.md`: rule 1 notes contexts may sit at their own level, and the gate wording. | read against the decision: AC-11 |

## Phase 6 - examples

| # | Task | Verify |
|---|---|---|
| P6.1 | All examples, `template.json` and the e2e fixtures at `5.2`. | AC-12 |
| P6.2 | Resolve the reversed and mutual pairs: flip the relationships one-way seams contradict; straighten mutual pairs where the domain allows (ftgo: the saga invokes Kitchen's and Accounting's commands rather than they subscribe to `Order Approved`), otherwise declare `partnership`. | validator: AC-12 |

## Out of scope

- Showing `avoid` or the derived style in the editor.
- A stored `via` on relationships (decision-00019, rejected).
- A level per node.

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases are done.
- `tsc`, `bun run lint` and `bun run build` are clean.
- Unit and e2e tests are green.
- New code is at 90% line / branch / function coverage.
- A subagent checks every AC against a passing test or a recorded validator run.
  The result is a `docs/record/` acceptance checklist.
