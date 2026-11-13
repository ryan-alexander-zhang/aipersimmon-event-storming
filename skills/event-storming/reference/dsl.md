# DSL v5.2 - full grammar

`scripts/grammar.json` is the machine-readable copy of the element types, level gating,
edge rules and context-relationship types below - it is what `scripts/validate.py`
enforces, and what the editor's own test suite checks itself against. The tables here
are for reading; if one ever disagrees with the JSON, the JSON is right and the
validator will say so.

## Contents
- File shape
- Element types
- Node properties per type (all special parameters)
- Timeline order
- Temporal events (time is the producer)
- Relations (edge rules)
- Alternative sets (things that happen instead of each other)
- Contexts and context relationships
- Integration style (read from the seams)
- Split models (one file per context)
- Level gating
- Id and label conventions
- Common errors

## File shape

```json
{
  "version": "5.2",
  "meta": { "name": "Order Fulfilment", "level": "design", "createdAt": "2026-08-17T00:00:00Z" },
  "contexts": [{ "id": "ord", "name": "Ordering", "order": 0, "subdomain": { "name": "Ordering", "type": "core" },
                 "purpose": "Turn a customer's intent into a confirmed, payable order.",
                 "language": [{ "term": "Order", "meaning": "A basket the customer has committed to pay.", "avoid": ["cart", "basket"] }] }],
  "contextRelationships": [{ "id": "cr-1", "source": "ord", "target": "pay", "type": "customerSupplier" }],
  "nodes": [{ "id": "ord-e-placed", "type": "domainEvent", "label": "Order Placed", "context": "ord", "order": 0, "properties": {} }],
  "edges": [{ "id": "e-1", "source": "ord-c-place", "target": "ord-e-placed", "relation": "produces" }]
}
```

- `version` must be the literal `"5.2"`. The editor still imports older files: a `5.0` or `5.1` file only changes its version; in a `4.0` file each `classification` moves into `subdomain.type`, the subdomain named after its context.
- `meta.level` is one of `big-picture` | `process` | `design`. It is the view filter and the ceiling of every context's level: raise it as phases complete. See Level gating.
- `meta.createdAt` is an ISO 8601 string.
- `contexts`, `contextRelationships`, `nodes`, `edges` are arrays; all four may be empty.
- Every node needs `properties` - use `{}` when empty.
- No positions. Layout is computed from `order` and the relations.

## Element types

| type | means | note |
| --- | --- | --- |
| `domainEvent` | something that happened, past tense | the spine; carries `order` |
| `command` | an intent, present tense | |
| `actor` | person or role issuing a command | |
| `readModel` | the information an actor needs to decide | |
| `policy` | "when X happened, do Y" | carries `condition`, `execution`, `parameters` |
| `aggregate` | consistency boundary handling a command | design output |
| `constraint` | precondition that must hold to run a command | design input; carries `rule` |
| `externalSystem` | outside system, black box | can issue and handle commands, and emit events |
| `hotspot` | conflict, question or risk on any element | carries `state`, `kind`, `priority`, and once closed `resolution` + `resolvedAt` |
| `opportunity` | idea or value to pursue on any element | positive counterpart of hotspot |

## Node properties per type

`properties` is one object. Each key is optional, but only legal on its own type.

| key | type | values | only on |
| --- | --- | --- | --- |
| `description` | string | free text, one or two sentences | any type |
| `pivotal` | boolean | `true` = one of the few key events | `domainEvent` |
| `temporal` | boolean | `true` = raised by time passing: a deadline reached, a date arrived, a schedule fired. Needs no producer | `domainEvent` |
| `state` | enum | `open` \| `resolved` (absent = open) | `hotspot` |
| `kind` | enum | `conflict` \| `question` \| `risk` | `hotspot` |
| `priority` | enum | `low` \| `medium` \| `high` | `hotspot` |
| `resolution` | string | what closed it: the answer, the decision, the mitigation (or "accepted"). Beside `description`, never over it - the description holds the question and has to survive being answered | `hotspot` |
| `resolvedAt` | string | ISO timestamp of when it was resolved. Reverting `state` to `open` leaves it: it *was* resolved then | `hotspot` |
| `condition` | string | the guard, no "if": `"retry attempts < maxRetries"` | `policy` |
| `execution` | enum | `automatic` \| `manual` | `policy` |
| `parameters` | array | `[{ "name": "maxRetries", "value": "3" }]`, both strings | `policy` |
| `alternativeSet` | string | shared key; members happen instead of each other, at most one of them does | `domainEvent`, `command` |
| `rule` | string | the invariant itself: `"total <= credit limit"` | `constraint` |

Policy full form:

```json
{ "id": "pay-p-retry", "type": "policy", "label": "Retry Payment Policy", "context": "pay",
  "properties": {
    "description": "When a payment fails, charge again.",
    "condition": "retry attempts < maxRetries",
    "execution": "automatic",
    "parameters": [{ "name": "maxRetries", "value": "3" }, { "name": "backoff", "value": "1h" }]
  } }
```

`description` is the prose "when X, do Y". `condition` is the guard only. `parameters` are the named numbers inside the condition or description - name every threshold, timeout, limit and retry count you hear.

## Alternative sets - things that happen instead of each other

A fork is not drawn on this board (the layout is banded and `order`-driven), so it is written down: give each outcome the same `alternativeSet` key and at most one of them happens.

```json
{ "id": "pay-e-captured", "type": "domainEvent", "label": "Payment Captured", "order": 4,
  "properties": { "alternativeSet": "charge-outcome" } }
{ "id": "pay-e-declined", "type": "domainEvent", "label": "Payment Declined", "order": 4,
  "properties": { "alternativeSet": "charge-outcome" } }
```

- Only `domainEvent` and `command` can be in a set - the two types that represent something happening at a moment. Not an aggregate, not a policy, not a read model.
- Membership is the key alone. It does not come from edges or from `order`, so it works at Big Picture where there are no commands, for a fact arriving from outside, and for a deadline elapsing.
- Mixing the two types in one set is legal: `Confirm Booking` (command) and `Hold Expired` (event) are one fork.
- A set needs at least two members; the validator warns about a set of one (usually a typo in the key). Nothing warns about a *missing* set - a moment with several outcomes is often legitimately "all of them" (saga steps), so declaring a fork is your statement, never an inference.
- The key is a slug you choose, same style as node ids: `charge-outcome`, `review-route`.
- Where a policy branches, the set goes on the **commands it invokes** and `condition` says which way it goes; the policy itself carries no marker.

Constraint full form:

```json
{ "id": "ord-cons-stock", "type": "constraint", "label": "Item in stock", "context": "ord",
  "properties": { "description": "Why it exists.", "rule": "requested quantity <= available stock" } }
```

Hotspot full form:

```json
{ "id": "ord-h-tax", "type": "hotspot", "label": "Which tax rules apply abroad?", "context": "ord",
  "properties": { "kind": "question", "priority": "high", "state": "open", "description": "Blocks pricing." } }
```

## Timeline order

- `order` is an integer on `domainEvent` only. Never put `order` on other types.
- It is one global sequence across all contexts, starting at 0. Contexts do not restart it.
- Equal `order` = events at the same point on the timeline. It says nothing about exclusivity: genuinely concurrent events and mutually exclusive outcomes both sit there. An `alternativeSet` is what says "one of these" (see below), and its members may even sit at different `order` values when one branch resolves later.
- Gaps are allowed but keep it dense; renumber when you insert events.
- Every `domainEvent` should have an `order`.

## Temporal events - time is the producer

An event nothing commands and no outside system sends - `Billing Month Ended`,
`Hold Expired`, `Review Window Closed` - is raised by time passing. Mark it:

```json
{ "id": "bil-e-month-ended", "type": "domainEvent", "label": "Billing Month Ended",
  "order": 0, "properties": { "temporal": true } }
```

- A temporal event needs no incoming `produces` or `emits` - the validator and the
  editor's health check both exempt it. Everything else is ordinary: it carries
  `order`, may be `pivotal`, may join an `alternativeSet`, and `triggers` policies.
- Do **not** invent a `Clock` or `Scheduler` external system to produce it. An
  external system is a real outside integration; a calendar is not, and the fake
  node shows up as a context seam that does not exist.
- A timeout the system itself runs is **not** temporal - it is a reaction with the
  numbers on the policy: `Booking Held --triggers--> Hold Expiry Policy` (condition
  `not confirmed within holdWindow`, parameter `holdWindow`) `--invokes--> Expire
  Hold --produces--> Hold Expired`. Use `temporal` only where the clock itself is
  the source.

## Relations

`edges[].relation` must match the source and target types exactly:

| relation | source -> target |
| --- | --- |
| `issues` | actor -> command, externalSystem -> command |
| `produces` | command -> domainEvent |
| `constrainedBy` | command -> constraint |
| `handledBy` | command -> aggregate, command -> externalSystem |
| `emits` | aggregate -> domainEvent, externalSystem -> domainEvent |
| `triggers` | domainEvent -> policy |
| `invokes` | policy -> command |
| `updates` | domainEvent -> readModel |
| `informs` | readModel -> actor |
| `annotates` | hotspot -> any type |
| `highlights` | opportunity -> any type |

Nothing else connects. There is no event -> event, command -> command, or policy -> event edge; chain them: event `triggers` policy `invokes` command `produces` event.

Causal spine:
- Process level: `command --produces--> domainEvent`.
- Design level: refine it to `command --handledBy--> aggregate --emits--> domainEvent`. Keeping the `produces` edge as well is allowed.
- No aggregate for a step (an external system does the work): `command --handledBy--> externalSystem --emits--> domainEvent`.

Edges cross contexts freely - that is how seams show up.

## Contexts and context relationships

- `contexts[].order` sets left-to-right reading order of the map, starting at 0.
- `subdomain` is the business capability the context realises: `{ "name": "...", "type": "core" | "supporting" | "generic" }`. `name` is required and defaults to the context's name; `type` is optional. One context realises one subdomain, and no two contexts may name the same one (compared case-insensitively) - an ERROR at any level. At `design` every context must have a `subdomain` with a `type` - an ERROR; below design both are optional, because the boundaries are not drawn yet.
- `purpose` is one sentence: the business problem the context solves. At `design` every context must have one - an ERROR. When present it must be a non-empty string.
- `language` is optional: the terms that mean something specific inside this context, `[{ "term": "...", "meaning": "...", "avoid": ["..."] }]`, `term` and `meaning` non-empty. A term may appear only once per context (compared case-insensitively) - an ERROR. The same term in two contexts with different meanings is allowed: it is the reason the boundary exists (`reference/context-map.md`, B1).
- `avoid` is optional on a term: the words this context does not use for it - rejected synonyms, the names people reach for by mistake. Only words someone can search code and docs for; an explanation of what the term does not mean goes in `meaning`. A word listed twice for one term, or an `avoid` word that is itself a `term` of the same context, is an ERROR (the context would both use and forbid it).
- `level` is optional on a context: how far that context has been taken (`big-picture` | `process` | `design`). Absent, it is at `meta.level`; above `meta.level`, it is capped there (not an error). See Level gating.
- `bigBallOfMud` is an optional boolean on a context: Evans's designation for a model that is a recognised mess - draw the boundary, mark it, do not let its model propagate. It marks the context itself, never a relationship; downstreams usually defend with `acl`. Orthogonal to `subdomain`: a muddy context still realises one subdomain, and the other capabilities it covers are recorded as hotspots.
- `nodes[].context` is optional; a node without it is Ungrouped. Any `context` you use should be declared in `contexts`.
- `contextRelationships[].type` is one of `partnership`, `sharedKernel`, `customerSupplier`, `conformist`, `acl`, `openHostService`, `publishedLanguage`, `separateWays`. `source` = upstream, `target` = downstream. One pair may carry several. See `reference/context-map.md` for when to use which.

## Integration style - read from the seams

A seam is an edge whose ends lie in two contexts, neither an actor, that is not `annotates` or `highlights`. The style of a Context Relationship is never written on it; the validator derives it from its pair's seams and prints it as `INFO integration: ...`:

| Relation across contexts | Style | Upstream is the context of the |
| --- | --- | --- |
| `triggers`, `updates`, `emits` | events | source (the other side reacts to it) |
| `invokes`, `handledBy`, `produces`, `issues`, `constrainedBy` | api | target (the other side calls it, or reads its state synchronously) |

A directional relationship (`source` = upstream) whose pair has a seam making the declared upstream depend on the declared downstream gets `WARN reversed dependency`. A pair passes when any of its relationships points the derived way; `partnership`, `sharedKernel` and `separateWays` are never checked. A pair whose seams depend both ways gets `WARN mutual dependency` instead, unless it declares `partnership` or `sharedKernel` - DDD's names for mutual reliance, which the teams must accept openly. A relationship in each direction does not silence it: that states the cycle twice. Straighten one direction (one side calls, the other replies on that channel), declare the partnership, or merge the two (B5 in `reference/context-map.md`).

## Split models - one file per context

A model may live in a folder: `domain.json` plus one file per context. A context that carries `file` (a path relative to `domain.json`) keeps its elements in that file; a context without it keeps them inline. No `file` anywhere is an ordinary single-file model.

```text
<slug>/
  domain.json        # version, meta, contexts (+ file), contextRelationships,
                     # Ungrouped nodes, cross-context edges
  contexts/ord.json  # { "context": "ord", "nodes": [...], "edges": [...] }
```

- **Membership is the file.** A node in a context file has no `context` key - writing one is an ERROR. A node in `domain.json` may only name a context that has no `file`.
- **An edge lives where both its ends live.** Both ends in one linked context: that context's file. Anything else - crossing two contexts, or touching an Ungrouped node - goes in `domain.json`. A context file never references another file.
- **Ids are unique across all files**; `order` stays one global sequence across them.
- **`file`** is relative, stays inside the folder, ends `.json`, is not `domain.json`, and no two contexts share one. Default `contexts/<context id>.json`.
- Validate the folder with `validate.py <slug>/domain.json`; errors name the file they are in.

Split when the user agrees after the Context Map; Big Picture stays one file, because there are no contexts to split by yet. To split: give every context a `file`, move its nodes (dropping `context`) and its internal edges into that file, leave everything else in `domain.json`.

## Level gating

Each node is judged at its **effective level**: its context's `level`, capped by `meta.level`; an Ungrouped node is at `meta.level`. The effective level decides which node types it may be:

| level | allowed types |
| --- | --- |
| `big-picture` | actor, externalSystem, domainEvent, hotspot, opportunity |
| `process` | + command, policy, readModel |
| `design` | + constraint, aggregate |

Levels are cumulative. Raising the level never removes anything.

Everything else that depends on level also uses the effective level, element by element: at `design` a context needs a typed `subdomain` and a `purpose`, a policy needs `execution` (an ERROR at design, a WARN below), and aggregates are checked for guards; at `big-picture` events are never orphans. So a design model can hold a context still at `big-picture` - it is not dragged to the design requirements, and its events, actors and hotspots stay legal. A split model behaves exactly like the same model in one file.

## Id and label conventions

- Ids are stable, lowercase, hyphenated, unique across nodes; edges have their own id space.
- Node pattern `<ctx>-<tag>-<slug>`: `e` event, `c` command, `p` policy, `ag` aggregate, `cons` constraint, `rm` read model, `ex` external system, `h` hotspot, `op` opportunity, actors plain (`ord-customer`).
- Edge pattern `e-<ctx>-<nn>`, context relationship pattern `cr-<nn>`.
- Labels: events past tense, naming the business fact (`Order Placed`, not `Order Created`; see E1-E5 in `reference/big-picture.md`), commands imperative (`Place Order`), policies end in `Policy`, read models end in `View`, hotspots are the open question itself.

## Common errors

- `order` on a command or read model - only events carry it.
- `temporal` on a command or policy - only events are raised by time.
- A `Clock`/`Scheduler` external system emitting deadline events - mark the events `temporal` instead.
- `condition` on a constraint, or `rule` on a policy - swapped.
- `parameters` values as numbers - both `name` and `value` are strings.
- A relation the type pair does not allow (`policy -> domainEvent`, `command -> command`).
- A node type not allowed at its effective level - for example a command in a context still at `big-picture`.
- A design-level policy without `execution`.
- A `separateWays` pair that shares a seam or carries another relationship - the model says both that they do not integrate and that they do (decision-00020). Use the relationship the seams show, or remove the seam.
- In a split model: a `context` key on a node in a context file, or an edge left in `domain.json` whose both ends are in one context file.
- `context` id that is not declared in `contexts`.
- A design-level context without `purpose`, a term listed twice in one context's `language`, or an `avoid` word that is a term of the same context.
- Two events with the same `order` that are not actually concurrent.
