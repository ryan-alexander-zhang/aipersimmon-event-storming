---
id: decision-00017-a-model-splits-into-one-file-per-bounded-context
type: decision
role: main
status: active
parent: decision-00016-every-bounded-context-realises-one-named-subdomain
---

# A model splits into one file per Bounded Context, linked from a domain file

> Builds on [decision-00016](./decision-00016-every-bounded-context-realises-one-named-subdomain.md):
> a context realises one subdomain, so a file per context is a file per subdomain.

## Context

A model is one JSON file. The largest shipped example (`examples/big.json`) is
96 KB: 7 contexts, 143 nodes, 225 edges, 58 of them (26%) crossing contexts. The
browser handles that without effort; the cost is elsewhere:

- the authoring skill reads and rewrites the whole file to change one context;
- a change to one context is a diff in a file everyone touches;
- two people cannot work on two contexts without a merge in one file.

All three grow with the number of contexts, so the file format should let a
context live on its own.

## Decision

**One format, with an optional link per context.** The domain file is today's
model file. A context may carry `file`, a path relative to the domain file; that
context's nodes and internal edges then live in the linked file instead of
inline. No context linked = today's single file, unchanged. Some linked = a
partly split model, also valid.

```text
order-fulfilment/
  domain.json            # version, meta, contexts (+ file links), contextRelationships,
                         # Ungrouped nodes, inline contexts' nodes, cross-context edges
  contexts/
    ordering.json        # one linked context: its nodes, its internal edges
    payment.json
```

```json
// domain.json
{ "version": "5.0", "meta": { "name": "Order Fulfilment", "level": "design", "createdAt": "..." },
  "contexts": [
    { "id": "ord", "name": "Ordering", "order": 0,
      "subdomain": { "name": "Ordering", "type": "core" }, "file": "contexts/ordering.json" } ],
  "contextRelationships": [ ... ],
  "nodes": [ ... ],
  "edges": [ ... ] }

// contexts/ordering.json
{ "context": "ord", "nodes": [ ... ], "edges": [ ... ] }
```

Rules:

- **Membership is the file.** A node in a context file belongs to that context
  and carries no `context` key; writing one is an error. A node in the domain file
  may name only a context that has no `file`.
- **An edge lives where both its ends live.** Both endpoints in one linked
  context: that context's file. Anything else - crossing two contexts, or touching
  an Ungrouped or inline node - the domain file. One rule, so every writer puts
  every edge in the same place, and context files never reference each other.
- **Ids stay unique across all files** - nodes, edges, contexts. Merging is
  concatenation; nothing is renamed.
- **`order` stays one global sequence** across files (decision-00005).
- **`file` is relative, inside the domain file's directory**, ending `.json`;
  `contexts/<context id>.json` by default. A path that escapes the directory, or
  that two contexts share, is an error.
- **The domain file is named `domain.json`** when the model is split, so a folder
  is opened by finding it.
- **Every crossing edge is backed by a Context Relationship.** A new warning,
  `unbacked-seam`, for a pair of contexts joined by an edge but by no
  `contextRelationships` entry in either direction - the Context Map gate's rule,
  now checked. Applies to single files too. An edge with an Actor at either end is
  not a seam: a Context Relationship is an integration between models and teams,
  and a person working in two contexts is not one.

**The editor holds one model in memory.** Splitting is serialisation only: open
merges every file into today's model; the store, the board, health, the Context
Map, Bounded Context Focus and Isolate are unchanged, and Isolate already shows
the far side of every seam. File I/O is what changes:

- **Open folder** reads a split model in every browser (a directory input).
- **Save to folder** writes `domain.json` and every linked file back, on Chromium
  through the File System Access API; a context created in the editor gets the
  default link. A folder Project re-reads its folder on Refresh, as a file Project
  re-reads its file.
- **Firefox and Safari** cannot write a folder; there Export downloads the merged
  model as one file, which is still a valid model.
- A context deleted in the editor leaves its file on disk; the editor never deletes
  files.

**The skill splits once boundaries exist.** Big Picture stays one file - the
contexts are not cut yet. After the Context Map, the skill offers to split, and
from then on edits the one context file a change touches. `validate.py
domain.json` follows the links and validates the merged model.

## Alternatives rejected

**YAML.** Easier to write by hand, with comments - but Python's standard library
has no YAML parser, so the skill's validator would need PyYAML installed, and the
editor a new dependency. Split files are small enough that JSON stays readable.

**Crossing edges in the source context's file.** Keeps the domain file smaller,
but every context file then points into other files, and a context can no longer
be read, reviewed or rewritten on its own.

**A split-only format.** One rule set, but a Big Picture board would be an empty
`contexts/` directory next to a domain file holding everything, and small models
would pay for a folder they do not need.

**A ZIP download.** Same behaviour in every browser, but a new dependency, and the
user unpacks it over their folder by hand.

## Consequences

- `contextSchema` gains optional `file`; a context-file schema
  `{context, nodes, edges}` is added. The DSL stays `5.0`: a single file is
  unchanged, and the split is a container around the same model.
- `serialize.ts` gains merge (files -> model) and split (model -> files);
  `source-file.ts` and Projects gain a folder source; the File menu gains Open
  folder / Save to folder.
- `validate.py` follows links and reports per-file errors; `unbacked-seam` is
  added there and to editor health.
- The skill's `SKILL.md` (rule 1: one model, grown in place - split after the
  Context Map), `dsl.md` and `context-map.md` document the layout; one example
  ships split.
- Renumbering the global `order` can touch several files; accepted - it is the
  timeline's one shared spine.
