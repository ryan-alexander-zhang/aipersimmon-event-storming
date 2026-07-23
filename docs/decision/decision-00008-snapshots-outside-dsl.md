---
id: decision-00008-snapshots-outside-dsl
type: decision
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# Named snapshots live outside the model DSL, in their own local store

> Driven by [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR10 and
> [spec-00008](../spec/spec-00008-model-versioning-compare.md). **Overrides** the
> prd-00002 *Risks & Dependencies* note that groups FR10 with FR3/FR4/FR5 as a
> DSL-schema extension ("snapshots — must version and migrate" via
> `schema.ts`/`migrate.ts`).

## Context

FR10 needs multiple **named snapshots** of the model, kept locally, so a modeller
can save an *as-is* version, evolve the board into *to-be*, and compare them.

The model is already fully serializable: `toModel` produces a validated DSL
`Model` (with its own `version` field), and `importJSON` migrates older `Model`s on
load. So a snapshot is naturally just a stored `Model` + a name + a timestamp.

The open question is **where** that collection of snapshots lives. Two shapes:

1. **In the model DSL** — add a `snapshots` array to `modelSchema`, bump
   `DSL_VERSION` 4.0 → 5.0 with a migration. Snapshots ride along in every
   export/import. (This is what the prd-00002 Risks note implies.)
2. **In a separate local store** — snapshots persist under their own
   `localStorage` key, each entry a full validated `Model`. They are *not* part of
   the current model's `exportJSON`.

## Decision

Store snapshots in a **separate local-storage collection**, not inside the model
DSL (shape 2). Each snapshot is `{ id, name, createdAt, model: Model }`.

1. **Own key.** Snapshots persist under `event-storming:snapshots`, alongside the
   model (`event-storming:model`) and the discovery wall
   (`event-storming:discovery`, [decision-00004](./decision-00004-discovery-mode-free-placement.md)).
2. **DSL stays "the current model".** `modelSchema` / `DSL_VERSION` are unchanged;
   `exportJSON` of the working model contains **no** snapshots. A model's export is
   that one model, not a bundle of its history.
3. **Still versioned and migrated.** Each stored snapshot *is* a `Model` carrying a
   `version`. On load, every snapshot runs through `migrateToLatest` + schema
   validation exactly like the main model; invalid ones are dropped, not fatal. So
   the prd-00002 "must version and migrate" requirement is met — via per-snapshot
   `Model` migration, not a `snapshots` field on the schema.
4. **Snapshots are model-scoped, not file-scoped.** They belong to the browser-local
   working model. `clear()` ("New model") discards them; importing a different model
   leaves them in place (a known, documented boundary — see spec-00008 §5).

## Consequences

- No DSL bump for FR10; `schema.ts` and `migrate.ts` are untouched. The DSL
  evolution risk in prd-00002 narrows to FR3/FR4/FR5 only.
- Export size stays linear in one model. Snapshots cannot bloat an export with
  nested full-model copies (which shape 1 would allow to grow quadratically as
  snapshots accumulate).
- Snapshots do not travel with an exported `.json` file. Sharing history across
  machines/files is out of scope for FR10 and this phase (single-user, local).
- The prd-00002 Risks note is corrected in place to point here (mirroring how the
  PRD already annotates the dropped FR8 with decision-00006).
- Detailed shape (store slice, persistence, capture/restore/compare surface) is
  owned by spec-00008 / design-00008; this decision only fixes the boundary.
