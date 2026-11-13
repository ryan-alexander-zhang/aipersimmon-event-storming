---
id: issue-00040-commentary-edges-counted-as-seams
type: issue
role: main
status: resolved
parent: decision-00017-a-model-splits-into-one-file-per-bounded-context
---

# A Hotspot or Opportunity pointing into another context is reported as an unbacked seam

## Problem

A Hotspot in Payment that annotates a Command in Ordering produces:

> 'Ordering' and 'Payment' are joined by an edge but have no Context Relationship

An Opportunity that `highlights` an element in another context produces the same
warning. Two contexts that do not integrate are told they need a Context
Relationship. Both the editor's health panel and `validate.py` report it.

## Context

Found while answering a request from another session to derive each Context
Relationship's integration style (API or events) from its seams. That
derivation needs every seam to be an integration. Reading `seamFindings`
showed that it only excludes Actors.

## Root cause

- **Expected.** A Seam is two contexts integrating: one context's element
  causes, feeds, constrains or handles another's. That is what makes a Context
  Relationship necessary (decision-00017).
- **Observed.** Every edge whose two ends lie in different contexts counts as a
  seam, unless one end is an Actor:
  - `web/lib/analysis/health.ts` `seamFindings` builds `ctxOf` from every
    non-actor node;
  - `skills/event-storming/scripts/validate.py` `check_seams` skips actor
    endpoints only.
- **Root cause.** The seam rule tests the endpoint *type* (Actor) instead of
  what the edge *means*.
  - `annotates` (Hotspot -> any) and `highlights` (Opportunity -> any) are
    commentary. They mark an element for attention, and they carry no
    behaviour, data or dependency between the contexts.
  - They were never meant to be seams. The CONTEXT.md **Seam** entry simply
    did not name them, because the decision was only asked about Actors.
- **Not the cause.** It is not where the Hotspot's context is placed. Putting
  the Hotspot in the annotated element's context would hide the warning, but a
  Hotspot about a seam is legitimately owned by either side.

## Reproduction

- `web/lib/analysis/health.test.ts`, "does not count a Hotspot's or Opportunity's
  edge as a seam [issue-00040]". It fails before the fix: one `unbacked-seam`
  finding is reported.
- `validate.py` on a two-context model whose only crossings are an `annotates`
  and a `highlights` edge prints `WARN unbacked seam: 'Ordering' and 'Payment'
  ...`.

## Fix

- A seam is a crossing edge whose relation is not `annotates` or `highlights`,
  and neither end of which is an Actor.
- Both checks skip those relations.
- CONTEXT.md **Seam** names them.

## Verification

- **Editor.** The regression test passes. The full unit suite passes: 413 tests.
  `tsc` is clean.
- **Validator.** The reproduction model no longer reports an unbacked seam.
- **Shipped examples.** Every example and `template.json` reports the same errors
  and warnings as before the fix: none of them relied on commentary edges.
- **Skill text.** The skill's `context-map.md` step 4 says the same as the
  glossary.
