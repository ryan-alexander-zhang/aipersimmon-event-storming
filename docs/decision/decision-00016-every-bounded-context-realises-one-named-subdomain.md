---
id: decision-00016-every-bounded-context-realises-one-named-subdomain
type: decision
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# Every Bounded Context realises exactly one named Subdomain

> Revises the shape [spec-00004](../spec/spec-00004-strategic-subdomains-context-map.md)
> gave the strategic layer: there a Subdomain was only a classification on a
> context ("classification is not identity"). Here a Subdomain gets a name, and
> the context-to-subdomain mapping becomes a rule of the standard.

## Context

A Subdomain is problem space (a business capability, discovered); a Bounded
Context is solution space (the boundary within which one model holds, designed).
DDD practice recommends aligning them one-to-one; the tool so far recorded only
the Subdomain's strategic type, so it could neither name the capability a context
realises nor check the alignment.

Prior art, surveyed 2026-11-12:

- **Context Mapper (CML)** - Subdomain is a first-class named object with a
  `type` (`CORE_DOMAIN`, `SUPPORTING_DOMAIN`, `GENERIC_SUBDOMAIN`) and a vision
  statement; a Bounded Context `implements` a list of them (many-to-many).
- **ddd-crew Bounded Context Canvas** - only a Strategic Classification
  (core / supporting / generic) on the context; no subdomain name. This was the
  tool's shape.
- **EventCatalog** - domains nest subdomains; the line between domain and
  Bounded Context is left loose.

## Decision

Each context carries one `subdomain` object; `classification` moves inside it as
`type`.

```json
{ "id": "ordering", "name": "Ordering", "order": 1,
  "subdomain": { "name": "Ordering", "type": "core" } }
```

- **One-to-one, both ways.** A context has at most one `subdomain`; no two
  contexts in a model name the same subdomain (names compared case-insensitively).
  A duplicate name is an error at every level.
- **The name defaults to the context's name.** The editor fills it when a context
  is created and keeps it in step on rename while the two are equal; the author
  may set a different name.
- **Required at `design`.** A design-level model in which a context lacks a
  `subdomain` or its `type` is an error. Below design it is optional: at Big
  Picture the boundaries are not drawn yet.
- **No Big Ball of Mud exception.** A muddy context also realises one subdomain,
  named and typed by its dominant value. That it spans several capabilities is
  recorded as a hotspot on the board - a split waiting to happen - not encoded in
  the mapping. `bigBallOfMud` stays orthogonal (decision-00015).
- **DSL `5.0`.** Moving `classification` is breaking, so the major version
  bumps. A `4.0` model migrates deterministically: a context with
  `classification: X` becomes `subdomain: {name: <context name>, type: X}`; a
  context without one becomes `subdomain: {name: <context name>}`.

## Alternatives rejected

**Keep the Canvas shape (classification only).** Simplest, but the tool cannot
name what a context realises, so it cannot check one-to-one, and a model read
alone never says which business capability each boundary serves.

**Context Mapper's many-to-many `implements`.** Records the reality of legacy
systems faithfully, but turns the standard's alignment rule into a warning with
exceptions; the tool models the target design, and a mismatch is something to
resolve on the board, not to encode.

**A `subdomains` list on muddy contexts only.** A second shape for one case;
every reader and the validator would branch on `bigBallOfMud`.

## Consequences

- `contextSchema`: `classification` removed, `subdomain: {name, type?}` added;
  `DSL_VERSION` `4.0` -> `5.0` with the migration above; `validate.py` and
  `grammar.json` gain the duplicate-name and design-level checks.
- Editor: the context's `⋯` menu edits the subdomain name and type; the legend
  chip and Context Map card show the type as before, and the name when it
  differs from the context's.
- `CONTEXT.md` **Subdomain** and **Context Map** entries, the skill's `dsl.md` /
  `context-map.md` / `design.md`, `template.json` and the examples follow.
- persimmon's DSL `4.1` also has a `subdomain` key, as a string id into its Prd.
  The two are not the same shape; a bridge maps persimmon's id to this
  `subdomain.name`.
