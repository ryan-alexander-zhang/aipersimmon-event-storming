---
id: decision-00015-big-ball-of-mud-marks-the-context-not-a-relationship
type: decision
role: main
status: active
parent: decision-00007-context-relationship-vocabulary
---

# Big Ball of Mud marks the context, because it is a designation, not an integration

> Completes [decision-00007](./decision-00007-context-relationship-vocabulary.md),
> whose consequences left Big Ball of Mud "out of scope (an anti-pattern label,
> rarely drawn as a typed relationship); addable later without a DSL break".
> This is that later addition - and 00007's own parenthesis names the reason it
> is not joining the relationship enum.

## Context

The canonical context-mapping pattern set is nine, not eight. Evans's Big Ball of
Mud (*DDD Reference*): draw a boundary around the entire mess, designate it a big
ball of mud, and **don't let this lousy model propagate** into the other Bounded
Contexts. A methodology review against the ddd-crew context-mapping material
(2026-08-31) ranked the missing pattern a Quadrant-I gap: legacy-heavy models are
exactly where a Context Map earns its keep, and the mess is the first thing worth
saying about such a map.

## Decision

An optional boolean on the context itself:

```json
{ "id": "legacy", "name": "Legacy ERP", "order": 4,
  "classification": "generic", "bigBallOfMud": true }
```

- It is a **designation of one context** - "this model is a recognised mess" -
  which is what Evans describes: a boundary you draw *around* something, not a
  contract *between* two things. The pattern's one instruction is about
  relationships only by consequence: downstreams defend themselves, typically
  with `acl`, and those seams stay ordinary `contextRelationships`.
- Orthogonal to `classification` (a muddy context can still be `core`).
- The editor shows the mark as a badge on the context's legend chip and on its
  Context Map card, toggled from the context's `⋯` menu next to the subdomain
  choices.

## Alternative rejected

**A ninth `contextRelationships` type.** Cheaper (one enum value), but it forces
the designation of one context into a (source, target) pair: which neighbour does
the mud edge point at when the mess borders four contexts? Every answer invents
semantics the pattern does not have - decision-00007 already recorded that it is
"rarely drawn as a typed relationship", and the review that prompted this change
flagged the same mismatch.

## Consequences

- `contextSchema` gains the optional boolean (additive, DSL stays `4.0`);
  `validate.py` accepts and type-checks it; the skill's `dsl.md` /
  `context-map.md`, `template.json` and `CONTEXT.md` document it.
- decision-00007's relationship enum is unchanged and complete as it stands; its
  "out of scope" consequence is superseded by this doc.
