# Context Map

Goal: the strategic view - which bounded contexts exist, which business capability (subdomain) each realises and how much it is worth, and how they integrate.

Runs any time after phase 1. It never changes the timeline; it only fills `contexts` and `contextRelationships`.

## Steps

1. **Cut the contexts.** Draw a boundary where several of the signals B1-B6 below agree, and check the cut against the anti-patterns A1-A3. A boundary backed by one weak signal alone is a hotspot, not a context. One team can own several contexts; one context should not be owned by several teams. Tell the user which signals drew each boundary.
2. **Say why each one exists.** Write `purpose`: one sentence naming the business problem the context solves. The validator errors without it at `design`. A context whose purpose you cannot state in one sentence is probably two contexts, or none. Where B1 drew the boundary, write the terms that differ into `language` (`[{"term", "meaning"}]`), on both sides.
3. **Name and type the subdomain each one realises** in `subdomain: {name, type}`. One context, one subdomain, and no two contexts share one. The name defaults to the context's; change it only when the business calls the capability something else. A context whose model is a recognised mess gets `bigBallOfMud: true` on top - the point of the mark is to not let that model propagate; its downstreams usually defend with `acl`. A muddy context still realises one subdomain, named and typed by its dominant value; that it also covers other capabilities goes on the board as a `hotspot` - a split waiting to happen.
4. **Find the seams.** Every edge that crosses a context is a seam - except an actor's: a person working in two contexts is not the contexts integrating. Each pair of contexts with at least one seam needs a relationship.
5. **Type each relationship.** `source` = upstream (the one that sets the terms), `target` = downstream. One pair may carry several.
6. Validate, run the gate.

## Where a context ends

Draw a boundary where several signals agree (decision-00018).

| Id | Signal | Boundary here | Not a boundary | Ask |
| --- | --- | --- | --- | --- |
| B1 | **Language.** One word means different things on either side, or the two sides use different words for one thing. The strongest signal. | "Payment" is money applied to an invoice in Invoicing, a collection with retries in Payment | "Order" means the same committed basket in Checkout and Order History | Does `<term>` mean the same thing here as there? |
| B2 | **Pivotal events and swimlanes.** The business changes phase (P1 in `reference/big-picture.md`). | After `Order Placed`, the warehouse takes over | `Item Added to Cart` -> `Cart Viewed`: same people, same phase | After `<pivotal event>`, who takes over? |
| B3 | **People.** Another actor, department or expert owns this part. | Finance answers for refunds, Support for complaints | Two screens the same clerk uses all day | Who would you ask about this part? |
| B4 | **Capability.** The part realises one subdomain, and no other context realises the same one. | Pricing vs Shipping: two capabilities | Two contexts that both "manage customers" | What would the business call this capability? |
| B5 | **Autonomy.** A context decides its commands without synchronously asking another context. Two candidate contexts with many seams between them are probably one. | Dispatch matches drivers without asking Billing | Every Basket command first calls Pricing and Stock | Can it decide this without asking them first? |
| B6 | **Pace and ownership.** The part changes at its own rate, and one team can own it. | Tax rules change yearly, promotions weekly | Two parts always released together by one team | Does this change on its own schedule? Which team owns it? |

| Id | Anti-pattern | Instead |
| --- | --- | --- |
| A1 | **Entity context** - named after a noun that every process touches (`Customer`, `Product`). | Split by phase of the lifecycle; each context keeps its own model of the noun (`Customer` in Sales is a prospect, in Billing a debtor). |
| A2 | **Technical context** - `Notification`, `Database`, `Gateway`. | An `externalSystem`, or a generic subdomain only when it has business language of its own. |
| A3 | **One context per aggregate**, or one context for the whole board. | Regroup by B1-B6. |

**Revisit from Design.** When a constraint needs state from two contexts, either the boundary is wrong, or the rule is really a policy that is eventually consistent (G5 in `reference/design.md`). Raise a hotspot and ask. Do not force the rule into one transaction.

Sources: Brandolini, *Introducing EventStorming*; Evans, *Domain-Driven Design*; ddd-crew, *Bounded Context Canvas*.

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
- Does `<term>` mean the same thing on both sides? (different meaning -> different contexts, B1; write both meanings into `language`)
- In one sentence, which business problem does this context solve? (-> `purpose`)
- If they change their model, do we have to follow?
- Can we ask them for a change and get it?
- What would the business call the capability this context serves? (-> `subdomain.name`)
- Is this something we sell, something we need, or something we could buy? (-> `subdomain.type`)
- What is the contract between these two - an API, events, a shared database, a spreadsheet?
- Would we accept their data as-is, or translate it first?
- Which of these models is a mess we must contain rather than fix? (-> `bigBallOfMud`, downstream `acl`)

## Gate

- [ ] Every boundary is backed by at least two of B1-B6, and no context is A1-A3.
- [ ] Every context has a one-sentence `purpose`.
- [ ] Every term that drew a B1 boundary is in `language` on both sides.
- [ ] Every context has a `subdomain` with a `name` and a `type`; no two contexts name the same subdomain.
- [ ] Every context used by a node is declared in `contexts`, with an `order`.
- [ ] Every pair of contexts with a crossing edge has at least one relationship (else the validator warns `unbacked seam`).
- [ ] No relationship between a context and itself.
- [ ] Core subdomains are few and are the ones the business would defend.
