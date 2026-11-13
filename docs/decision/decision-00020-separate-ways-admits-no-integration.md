---
id: decision-00020-separate-ways-admits-no-integration
type: decision
role: patch
status: active
parent: decision-00019-rejected-synonyms-derived-integration-per-context-level
---

# Separate Ways admits no integration

## Context

`separateWays` (decision-00007) declares that two contexts do not integrate at
all: duplicating is cheaper than connecting. Decision-00019 made integration
something the model states twice. A Context Relationship says how two contexts
relate, and the seams between them show what actually crosses.

Nothing checks that the two agree for Separate Ways:

- symmetric types are exempt from the direction checks;
- a pair backed by any relationship is never `unbacked`.

So a model can say "these two do not integrate" and "this event of one triggers
a policy of the other", and stay clean. The skill's own `template.json` did
exactly that. Payment -> Shipping was `separateWays`, while `Payment Captured`
triggers `Ship on Payment Policy`. Every model the skill starts from inherited
the contradiction.

## Decision

A pair that declares `separateWays` admits nothing else.

- **Seams.** A seam between the pair contradicts the declaration.
  - Validator: ERROR. The model asserts two incompatible facts, the same class
    as an avoided word that is also a term.
  - Editor health: warning `contradicted-separate-ways`, naming the seam's
    elements.
- **Other relationships.** Another relationship on the same pair (customer /
  supplier, partnership, and so on) contradicts it the same way. The checks
  and severities are the same.
- **The fix is a modelling choice.** Either the contexts really integrate, so
  replace `separateWays` with the relationship the seams show. Or they really
  do not, so remove the seam, and each side duplicates what it needs.

Commentary edges and actor edges are not seams (issue-00040), so a hotspot or
a person spanning the two never contradicts Separate Ways.

## Consequences

- `health.ts` gains `contradicted-separate-ways`, computed in the same seam
  walk. `validate.py` gains the matching error.
- The skill's `context-map.md` relationship table and gate say that
  `separateWays` means no seam and no other relationship. `dsl.md` lists it
  under Common errors.
- **`template.json`** is fixed rather than exempted: it is the model the skill
  copies. It keeps all eight relationship types, each on a pair where it is
  true:
  - `cr-07`: Catalog - Payment `separateWays`. They share no seam.
  - `cr-08`: Payment -> Shipping `openHostService`. Payment's events are
    consumed as published.
  - `cr-05`: Ordering - Shipping becomes `partnership`, alongside its
    `sharedKernel`. Sharing a kernel is joint ownership.
  - The other types stay where they are.
