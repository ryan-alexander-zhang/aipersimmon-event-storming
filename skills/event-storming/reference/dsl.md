# DSL v4.0 - full grammar

## Contents
- File shape
- Element types
- Node properties per type (all special parameters)
- Timeline order
- Relations (edge rules)
- Contexts and context relationships
- Level gating
- Id and label conventions
- Common errors

## File shape

```json
{
  "version": "4.0",
  "meta": { "name": "Order Fulfilment", "level": "design", "createdAt": "2026-08-17T00:00:00Z" },
  "contexts": [{ "id": "ord", "name": "Ordering", "order": 0, "classification": "core" }],
  "contextRelationships": [{ "id": "cr-1", "source": "ord", "target": "pay", "type": "customerSupplier" }],
  "nodes": [{ "id": "ord-e-placed", "type": "domainEvent", "label": "Order Placed", "context": "ord", "order": 0, "properties": {} }],
  "edges": [{ "id": "e-1", "source": "ord-c-place", "target": "ord-e-placed", "relation": "produces" }]
}
```

- `version` must be the literal `"4.0"`.
- `meta.level` is one of `big-picture` | `process` | `design`. It is the view filter: raise it as phases complete.
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
| `externalSystem` | outside system, black box | can handle commands and emit events |
| `hotspot` | conflict, question or risk on any element | carries `state`, `kind`, `priority`, and once closed `resolution` + `resolvedAt` |
| `opportunity` | idea or value to pursue on any element | positive counterpart of hotspot |

## Node properties per type

`properties` is one object. Each key is optional, but only legal on its own type.

| key | type | values | only on |
| --- | --- | --- | --- |
| `description` | string | free text, one or two sentences | any type |
| `pivotal` | boolean | `true` = one of the few key events | `domainEvent` |
| `state` | enum | `open` \| `resolved` (absent = open) | `hotspot` |
| `kind` | enum | `conflict` \| `question` \| `risk` | `hotspot` |
| `priority` | enum | `low` \| `medium` \| `high` | `hotspot` |
| `resolution` | string | what closed it: the answer, the decision, the mitigation (or "accepted"). Beside `description`, never over it - the description holds the question and has to survive being answered | `hotspot` |
| `resolvedAt` | string | ISO timestamp of when it was resolved. Reverting `state` to `open` leaves it: it *was* resolved then | `hotspot` |
| `condition` | string | the guard, no "if": `"retry attempts < maxRetries"` | `policy` |
| `execution` | enum | `automatic` \| `manual` | `policy` |
| `parameters` | array | `[{ "name": "maxRetries", "value": "3" }]`, both strings | `policy` |
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
- Equal `order` = concurrent events (parallel outcomes, e.g. `Payment Captured` / `Payment Failed`).
- Gaps are allowed but keep it dense; renumber when you insert events.
- Every `domainEvent` should have an `order`.

## Relations

`edges[].relation` must match the source and target types exactly:

| relation | source -> target |
| --- | --- |
| `issues` | actor -> command |
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
- `classification` is `core` | `supporting` | `generic`, optional.
- `nodes[].context` is optional; a node without it is Ungrouped. Any `context` you use should be declared in `contexts`.
- `contextRelationships[].type` is one of `partnership`, `sharedKernel`, `customerSupplier`, `conformist`, `acl`, `openHostService`, `publishedLanguage`, `separateWays`. `source` = upstream, `target` = downstream. One pair may carry several. See `reference/context-map.md` for when to use which.

## Level gating

`meta.level` decides which node types are allowed to be on the board:

| level | allowed types |
| --- | --- |
| `big-picture` | actor, externalSystem, domainEvent, hotspot, opportunity |
| `process` | + command, policy, readModel |
| `design` | + constraint, aggregate |

Levels are cumulative. Raising the level never removes anything.

## Id and label conventions

- Ids are stable, lowercase, hyphenated, unique across nodes; edges have their own id space.
- Node pattern `<ctx>-<tag>-<slug>`: `e` event, `c` command, `p` policy, `ag` aggregate, `cons` constraint, `rm` read model, `ex` external system, `h` hotspot, `op` opportunity, actors plain (`ord-customer`).
- Edge pattern `e-<ctx>-<nn>`, context relationship pattern `cr-<nn>`.
- Labels: events past tense (`Order Placed`), commands imperative (`Place Order`), policies end in `Policy`, read models end in `View`, hotspots are the open question itself.

## Common errors

- `order` on a command or read model - only events carry it.
- `condition` on a constraint, or `rule` on a policy - swapped.
- `parameters` values as numbers - both `name` and `value` are strings.
- A relation the type pair does not allow (`policy -> domainEvent`, `command -> command`).
- A node type not allowed at `meta.level`.
- `context` id that is not declared in `contexts`.
- Two events with the same `order` that are not actually concurrent.
