---
id: spec-00007-model-health-analysis
type: spec
role: main
status: active
parent: prd-00002-complex-business-analysis
---

# Spec: model-health analysis

> The shippable capability: derive **advisory findings** ("model smells") from the
> structured model and let the Modeler jump from a finding to the element(s) it
> concerns — never blocking editing. Delivers
> [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR9.

## 1. Context

Canonical terms from [CONTEXT.md](../../CONTEXT.md): Domain Event, Command,
Aggregate, Policy, Hotspot, and the relations `produces`, `handledBy`, `emits`,
`triggers`, `invokes`, `annotates`. This spec introduces one new term —
**Model Health / Model Smell** — to be added to CONTEXT.md when this spec is
promoted. Inputs: prd-00002 FR9;
[analysis-00002](../analysis/analysis-00002-complex-business-analysis-gaps.md) §2 (#7).

This is the highest-leverage Phase-2 item: it is **read-only over the existing
model** (no DSL change, no layout change), so it exercises the doc→implementation
chain cheaply as the template for the other six specs.

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US11 | [us-00011-model-health-findings](../us/us-00011-model-health-findings.md) | draft | List model smells as advisory findings; select a finding to focus its element(s) |

## 3. Cross-cutting requirements

- **spec-00007-XFR-1** (State) While findings are displayed, the system shall keep
  all model editing enabled — findings are advisory and never block an action.
- **spec-00007-XFR-2** (Complex) While a model of up to a few hundred elements is
  loaded, when the model changes, the system shall recompute findings without a
  perceptible editing stall (analysis is O(nodes+edges), memoised on the model).

### Acceptance (XAC)

- **spec-00007-XAC-1.1** (spec-00007-XFR-1)
  Given the health panel shows findings
  When the Modeler adds or edits an element
  Then the edit succeeds and the panel stays advisory (no block, no modal)
- **spec-00007-XAC-2.1** (spec-00007-XFR-2)
  Given a model with a few hundred elements
  When the model changes
  Then findings recompute and the board stays responsive

## 4. Technical Design (inline — small-spec exception)

Read-only analysis; extract to a `design/` doc only if reused. Terms per CONTEXT.md.

**Pure core** — `web/lib/analysis/health.ts`:

```
type Severity = "warning" | "info"
type Finding = { id: string; type: SmellType; severity: Severity;
                 message: string; elementIds: string[] }
function analyzeModel(model): Finding[]   // pure fn of nodes + edges only
```

Smell types (v1, fixed set):

| type | rule | severity |
|---|---|---|
| `orphan-event` | Domain Event with no incoming `produces`/`emits` | warning |
| `dangling-command` | Command with no path to a Domain Event (`produces`, or `handledBy`→`emits`) | warning |
| `overloaded-aggregate` | Aggregate handling `> AGG_MAX_COMMANDS` Commands or emitting `> AGG_MAX_EVENTS` events (module constants) | info |
| `policy-cycle` | a cycle over `triggers`/`invokes`/`produces`/`emits` involving a Policy | warning |
| `unresolved-hotspots` | count of Hotspot nodes (a single summary finding) | info |

> Hotspot has no lifecycle state yet; spec-00003 adds it. Until then
> `unresolved-hotspots` counts all Hotspots. When spec-00003 lands, the rule
> narrows to `state=open` — a forward dependency noted, not built here.

**UI** — a Health panel toggled from the toolbar (`web/components/`), listing
findings grouped by severity with the smell type and element label(s). Selecting a
finding routes its `elementIds` through the existing focus store
(`web/lib/store/focus.ts`) to select/isolate them. Findings are derived from the
model (memoised selector), so they update on any model change with no manual refresh.

## 5. Error handling

- Empty / clean model → `analyzeModel` returns `[]`; the panel shows a healthy
  empty state, never an error (us-00011-FR-4).
- Findings reference element ids that always exist at compute time (derived from
  the current model); a finding is never shown for a deleted element because it is
  recomputed on change (us-00011-FR-2).

## Links

- PRD: prd-00002 (FR9) · Decision: — · Plan:
  [plan-00008-model-health-analysis](../plan/plan-00008-model-health-analysis.md)
