---
id: issue-00042-domain-file-imports-as-an-empty-model
type: issue
role: main
status: resolved
parent: decision-00017-a-model-splits-into-one-file-per-bounded-context
---

# A split model's domain file imported on its own opens as a near-empty model

## Problem

The Modeler picks a split model's `domain.json` with **Import a model file…**
instead of **Import a model folder…**. The editor accepts it and shows only
what the domain file holds itself: Ungrouped actors and external systems, and
the edges between contexts. Every event, command, policy and aggregate lives in
the context files, so all of them are missing. Edges whose ends are in those
files point at nothing.

Nothing says anything went wrong. The user reported exactly this: "only actors
and systems show".

A Refresh of a file source pointing at a domain file does the same.

## Context

Found while explaining how to import a split model. It was then hit in use.

## Root cause

- **Expected.** Either the whole model opens, or the import is refused with a
  reason.
- **Observed.** `importJSON` (`web/lib/dsl/serialize.ts`) parses the file and
  hands it to `parseModel`, which validates it against `modelSchema`.
  - `contextSchema` has an optional `file` (decision-00017), so a domain file
    with links is schema-valid.
  - Nothing checks that edge endpoints exist.
  - The result is accepted.
- **Root cause.** A domain file whose contexts carry `file` is not a whole
  model: it is one part of a model stored in several files. Only `mergeFiles`
  knows that links must be followed. The single-file path treats `file` as
  inert data, because the same key is legitimately present on a merged model
  in memory.
  - The single-file path cannot follow links: a browser file input gives no
    access to sibling files. So the only correct behaviour there is to refuse.
- **Not the cause.**
  - Not the level view filter: it hides types per level but never events.
  - Not the folder import, which merges correctly.
- **Related, not fixed here.** The schema accepts dangling edges, while the
  validator rejects them. That is a referential-integrity gap in its own
  right, and it is what let this case pass silently.

## Fix

`importJSON` refuses a document in which any context has a `file` link. The
message names the linked files and says to use **Import a model folder…**.
`parseModel` is unchanged, so `mergeFiles` and stored Projects, which keep
links on the merged model, still load.

## Reproduction

`web/lib/dsl/serialize.test.ts`, "a split model's domain file on its own
[issue-00042]", imports `examples/ride-hailing/domain.json` on its own. Before
the fix it was accepted: 0 nodes and 3 edges with no ends.

## Verification

- **The fix.** The test passes, and the refusal names
  `contexts/ord.json`, `contexts/dsp.json`, `contexts/trp.json` and
  `contexts/bil.json`.
- **`split.test.ts`.** It now builds its in-memory model with `parseModel`. A
  model in memory keeps its links; only a single-file import refuses them.
- **Suites.**
  - Unit: 442 passed.
  - E2E: 104 passed. One known-flaky render-count test failed once under load
    and passed on rerun.
  - `tsc` and lint are clean.
