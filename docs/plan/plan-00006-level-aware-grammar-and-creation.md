---
id: plan-00006-level-aware-grammar-and-creation
type: plan
role: main
status: resolved
parent: spec-00001-mvp-editor
---

# Plan: level-aware grammar + creation (Constraint vs Aggregate)

Implements [decision-00003](../decision/decision-00003-level-grammar-constraint-vs-aggregate.md):
make the element grammar level-scoped, add the `Command → produces → Domain Event`
spine, add the **Constraint** element, and replace aggregate-first slice creation
with level-aware palette + slice. Terms follow [CONTEXT.md](../../CONTEXT.md).
Builds on issue-00006 (Ungrouped free elements).

Two phases: the **model core** (pure, unit-tested) lands first and is independently
correct; the **creation UI** follows.

## Phase 1 — model core

| # | Task | Verify |
|---|---|---|
| P1.1 | `relations.ts`: add `produces` (command→domainEvent) and `constrainedBy` (command→constraint); keep `handledBy` (command→aggregate/externalSystem) and `emits` (aggregate/externalSystem→domainEvent). Rules stay mutually exclusive on (source,target). | unit: `resolveRelation("command","domainEvent")==="produces"`, `("command","constraint")==="constrainedBy"`; existing rules unchanged |
| P1.2 | `elements.ts`: add `constraint` (label, distinct color, band). Band order: `actorSystem · command · constraint · aggregate · domainEvent · policy · readModel · hotspot`. | unit/tsc: `ELEMENT_TYPES`/`ELEMENT_BAND` include constraint; `bandIndex` ordered |
| P1.3 | `levels.ts`: Design `LEVEL_TYPES` adds `constraint` (and keeps `aggregate`); Big Picture / Process unchanged. Semantic-zoom tiers still bounded by level. | unit: `isVisibleAt("design","constraint")` true, `isVisibleAt("process","constraint")` false |
| P1.4 | Update `relations.test.ts`, `levels.test.ts`, `store.test.ts` for the new relations/element; add cases for `produces` and `constrainedBy` slices. | `bun run test` green; `lib/**` coverage ≥90% |
| P1.5 | `CONTEXT.md`: add **Constraint** (input, constrains a Command) and **produces** (Command → Domain Event); clarify **Aggregate** as the designed output boundary. | glossary-only; links checked |

## Phase 2 — level-aware creation

| # | Task | Verify |
|---|---|---|
| P2.1 | Level-aware palette: create the current level's own elements directly as free (Ungrouped) nodes — Big Picture: Domain Event / Actor / External System / Hotspot; Process: + Command / Policy / Read Model; Design: + Constraint / Aggregate. Reuses issue-00006 free-node creation. | run: at Big Picture the palette offers Actor and it is placeable with no context |
| P2.2 | Re-scope property-panel `SLICE` to the corrected grammar, filtered by level: Domain Event → `+ Command (produces)`, `+ Policy`, `+ Read Model`, `+ Hotspot`; Command → `+ Actor (issues)`, `+ Domain Event (produces)`, `+ Constraint` (Design), `+ Aggregate` (Design), `+ Hotspot`; Actor → `+ Command`; etc. No aggregate-first path. | run: from a Command you add its Actor directly; Constraint/Aggregate absent below Design |
| P2.3 | Update `e2e/editor.spec.ts`: new slice labels; **Big Picture creates an Actor**; `Command → produces → Domain Event`; Constraint/Aggregate only at Design. Fix tests that referenced old labels. | `bun run test:e2e` green |
| P2.4 | Re-scope `us-00007` (slice grammar) and `us-00008` (levels) to the level-aware grammar; keep GWT ids stable where behaviour is unchanged, revise where it changed. | docs consistent; every referenced AC has a test |

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- Phase 1 + Phase 2 tasks done; `tsc`, `bun run lint`, `bun run build` clean;
  unit + e2e green; `lib/**` coverage ≥90%.
- Behavioural: at Big Picture an Actor is creatable without any Command; a Command
  links directly to the Domain Event it produces (no Aggregate); Constraint and
  Aggregate appear only at Design, with `Command → constrainedBy → Constraint` and
  `Command → handledBy → Aggregate → emits → Domain Event`.
- A subagent verifies from the docs that every linked `us` GWT has a passing test
  and no requirement is unfinished; a `docs/record/` acceptance checklist links the
  GWT ids (CLAUDE.md §7). Any gap blocks `resolved`.
