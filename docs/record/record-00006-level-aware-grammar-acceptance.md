---
id: record-00006-level-aware-grammar-acceptance
type: record
role: main
status: active
parent: plan-00006-level-aware-grammar-and-creation
---

# Acceptance record: level-aware grammar + creation

Acceptance evidence for [plan-00006](../plan/plan-00006-level-aware-grammar-and-creation.md),
implementing [decision-00003](../decision/decision-00003-level-grammar-constraint-vs-aggregate.md).
Verified 2026-07-21. An independent subagent cross-checked every re-scoped GWT
(us-00007, us-00008) and the decision-00003 behaviors against the tests; verdict
PASS with no coverage gaps.

## Gate results

- Unit: **110 passed** (`bun run test`); coverage on `lib/**` **98.41% stmts /
  88.68% branch / 97.91% funcs / 99.35% lines** (≥90% lines bar met).
- E2E: **24 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT coverage

| GWT / behavior | Test | Result |
| --- | --- | --- |
| us-00007-AC-1.1 (event → Policy, `triggers`) | E2E `builds a slice…` (editor.spec.ts) | pass |
| us-00007-AC-1.2 (event → Command, `produces`, no Aggregate) | E2E `a Command produces a Domain Event… [us-00007-AC-1.2]`; unit `links a Command directly to the Domain Event it produces` (store.test.ts) | pass |
| us-00007-AC-2.1 (event → Read Model, `updates`) | E2E `builds a slice…`; unit store.test.ts | pass |
| us-00007-AC-4.1 (no free positioning) | E2E `elements are not free-draggable` | pass |
| us-00007-AC-5.1 (palette creates Actor at Big Picture; no Command/Aggregate offered) | E2E `creates an Actor directly at Big Picture… [us-00007-AC-5.1]` | pass |
| us-00008-AC-1.1 (Big Picture hides Command/Constraint/Aggregate/Policy/Read Model) | E2E `level filter hides types…`; unit levels.test.ts | pass |
| us-00008-AC-1.2 (Constraint + Aggregate offered only at Design) | E2E `Constraint and Aggregate are offered only at Design… [us-00008-AC-1.2]`; unit levels.test.ts (`process` excludes, `design` includes both) | pass |
| us-00008-AC-2.1 (level round-trips on export/import) | E2E `import then export round-trips… [us-00008-AC-2.1]` | pass |

## decision-00003 behaviors

- **Actor creatable at Big Picture without a Command** — E2E (Big Picture palette). Covered.
- **Command → produces → Domain Event, no Aggregate** — E2E + `store.test.ts` +
  `relations.test.ts` (`["command","produces","domainEvent"]`). Covered.
- **Constraint / Aggregate only at Design** — E2E + `levels.test.ts`. Covered.
- **Command → constrainedBy → Constraint resolves** — `store.test.ts` +
  `relations.test.ts` (`["command","constrainedBy","constraint"]`). Covered.

No test references a removed GWT id. plan-00006 is `resolved`.
