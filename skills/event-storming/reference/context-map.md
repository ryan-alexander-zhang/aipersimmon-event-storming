# Context Map

Goal: the strategic view - which bounded contexts exist, which business capability (subdomain) each realises and how much it is worth, and how they integrate.

Runs any time after phase 1. It never changes the timeline; it only fills `contexts` and `contextRelationships`.

## Steps

1. **Cut the contexts.** Group the board where the language changes meaning, the owner changes, the pace of change differs, or the data can be stale without harm. One team can own several contexts; one context should not be owned by several teams.
2. **Name and type the subdomain each one realises** in `subdomain: {name, type}`. One context, one subdomain, and no two contexts share one. The name defaults to the context's; change it only when the business calls the capability something else. A context whose model is a recognised mess gets `bigBallOfMud: true` on top - the point of the mark is to not let that model propagate; its downstreams usually defend with `acl`. A muddy context still realises one subdomain, named and typed by its dominant value; that it also covers other capabilities goes on the board as a `hotspot` - a split waiting to happen.
3. **Find the seams.** Every edge that crosses a context is a seam - except an actor's: a person working in two contexts is not the contexts integrating. Each pair of contexts with at least one seam needs a relationship.
4. **Type each relationship.** `source` = upstream (the one that sets the terms), `target` = downstream. One pair may carry several.
5. Validate, run the gate.

## Subdomain type

| value | means | test |
| --- | --- | --- |
| `core` | the competitive advantage | if a competitor copied it, we would lose |
| `supporting` | needed, not differentiating | we must build it, but nobody buys us for it |
| `generic` | a solved problem | we could buy or outsource it |

Most models have 1-2 core subdomains. If everything is core, nothing is.

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
- What would the business call the capability this context serves? (-> `subdomain.name`)
- Is this something we sell, something we need, or something we could buy? (-> `subdomain.type`)
- What is the contract between these two - an API, events, a shared database, a spreadsheet?
- Would we accept their data as-is, or translate it first?
- Which of these models is a mess we must contain rather than fix? (-> `bigBallOfMud`, downstream `acl`)

## Gate

- [ ] Every context has a `subdomain` with a `name` and a `type`; no two contexts name the same subdomain.
- [ ] Every context used by a node is declared in `contexts`, with an `order`.
- [ ] Every pair of contexts with a crossing edge has at least one relationship (else the validator warns `unbacked seam`).
- [ ] No relationship between a context and itself.
- [ ] Core subdomains are few and are the ones the business would defend.
