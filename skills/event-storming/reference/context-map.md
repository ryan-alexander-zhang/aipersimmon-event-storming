# Context Map

Goal: the strategic view - which bounded contexts exist, how much they are worth, and how they integrate.

Runs any time after phase 1. It never changes the timeline; it only fills `contexts` and `contextRelationships`.

## Steps

1. **Cut the contexts.** Group the board where the language changes meaning, the owner changes, the pace of change differs, or the data can be stale without harm. One team can own several contexts; one context should not be owned by several teams.
2. **Classify each one** with `classification`.
3. **Find the seams.** Every edge that crosses a context is a seam. Each pair of contexts with at least one seam needs a relationship.
4. **Type each relationship.** `source` = upstream (the one that sets the terms), `target` = downstream. One pair may carry several.
5. Validate, run the gate.

## Classification

| value | means | test |
| --- | --- | --- |
| `core` | the competitive advantage | if a competitor copied it, we would lose |
| `supporting` | needed, not differentiating | we must build it, but nobody buys us for it |
| `generic` | a solved problem | we could buy or outsource it |

Most models have 1-2 core contexts. If everything is core, nothing is.

## Relationship types

| type | use when | direction |
| --- | --- | --- |
| `partnership` | both teams succeed or fail together, plan releases jointly | symmetric |
| `sharedKernel` | they share a piece of model or code, changed only by agreement | symmetric |
| `customerSupplier` | downstream is a paying customer, upstream takes its needs into the plan | upstream -> downstream |
| `conformist` | downstream just accepts the upstream model, no negotiation | upstream -> downstream |
| `acl` | downstream translates the upstream model to protect its own | upstream -> downstream |
| `openHostService` | upstream publishes one protocol for many consumers | upstream -> downstream |
| `publishedLanguage` | integration runs on a shared documented schema | upstream -> downstream |
| `separateWays` | no integration at all, duplication is cheaper | symmetric |

Picking between the near ones:
- Downstream can ask for changes -> `customerSupplier`. It cannot -> `conformist`.
- It cannot ask and cannot live with their model -> `acl`.
- Upstream serves many consumers the same way -> `openHostService`, plus `publishedLanguage` when that contract is a documented schema.

## Question bank

- Who owns this part - which team, which roadmap?
- Does `<term>` mean the same thing on both sides? (different meaning -> different contexts)
- If they change their model, do we have to follow?
- Can we ask them for a change and get it?
- Is this something we sell, something we need, or something we could buy?
- What is the contract between these two - an API, events, a shared database, a spreadsheet?
- Would we accept their data as-is, or translate it first?

## Gate

- [ ] Every context has a `classification`.
- [ ] Every context used by a node is declared in `contexts`, with an `order`.
- [ ] Every pair of contexts with a crossing edge has at least one relationship.
- [ ] No relationship between a context and itself.
- [ ] Core contexts are few and are the ones the business would defend.
