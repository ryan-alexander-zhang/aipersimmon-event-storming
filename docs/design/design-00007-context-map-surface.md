---
id: design-00007-context-map-surface
type: design
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# Design: strategic layer — subdomain classification + Context Map surface

> Technical design for [spec-00004](../spec/spec-00004-strategic-subdomains-context-map.md),
> implementing [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR4/FR5.
> Terms follow [CONTEXT.md](../../CONTEXT.md). The Context-Map view reuses the
> Discovery-Mode surface pattern (isolated React Flow provider, swapped into the
> board slot).

## 1. Subdomain classification (FR4)

- **DSL** (`schema.ts`): add `classification: z.enum(["core","supporting","generic"]).optional()`
  to `contextSchema`. Additive/optional → rides through `toModel`/`fromModel`
  inside the `contexts` array with **no signature change**.
- **Store** (`store.ts`): `setContextClassification(id, c | undefined)` mirroring
  `renameContext` (map contexts, patch one field).
- **UI** (`board-chrome.tsx`): a small classification control on each context legend
  chip — a 3-way selector (core / supporting / generic / none) rendering a labelled
  badge. Colour comes from a new `SUBDOMAIN_STYLE` map in `context-color.ts` (badge
  colour only; the identity tint `contextTint(id)` is unchanged).

## 2. Context relationships + Context Map (FR5)

### 2a. Relationship types
New module `lib/eventstorming/context-relations.ts` (sibling to `relations.ts`),
with the canonical ddd-crew set (decision-00007):

```
CONTEXT_RELATION_TYPES = ["partnership","sharedKernel","customerSupplier","conformist",
                          "acl","openHostService","publishedLanguage","separateWays"]
```

`CONTEXT_RELATION_STYLE` (label + colour) parallels `RELATION_STYLE`
(`edge-style.ts`). Every relationship is directed **source = upstream → target =
downstream**; symmetric patterns (Partnership, Shared Kernel) simply ignore the
arrow's meaning.

### 2b. DSL / migration
- `schema.ts`: `contextRelationshipSchema = { id, source (contextId), target
  (contextId), type }`; add `contextRelationships: z.array(...).default([])` to
  `modelSchema`. **Bump `DSL_VERSION` 3.0 → 4.0.**
- `migrate.ts`: `migrateV3toV4(v3) = { ...v3, version: "4.0" }` (classification and
  contextRelationships are optional/defaulted, so the migration is a pure version
  bump — old files gain `contextRelationships: []` via the schema default and load
  unclassified).
- `serialize.ts` + callers: thread `contextRelationships` through `toModel`,
  `fromModel`, `exportJSON` and their callers (`persistence.ts` save/load,
  `toolbar.tsx` export/import, `editor.tsx` autosave). Classification needs none of
  this (it rides inside `contexts`).

### 2c. Store
- State `contextRelationships: ContextRelationship[]` (persisted, like `contexts`).
- Actions: `addContextRelationship(source, target)` (default type
  customerSupplier; returns id), `setContextRelationshipType(id, type)`,
  `removeContextRelationship(id)`. `removeContext` also prunes relationships that
  reference the removed context (FR5 / us-00020-AC-5.1).
- A transient view flag `contextMapOpen: boolean` + `toggleContextMap()`, mirroring
  `discovery.active`; reset in `setModel`/`clear`. (Relationships are model data and
  persist; only the *open/closed* view flag is transient.)

### 2d. Context Map surface
- `components/context-map-canvas.tsx` (copy of `discovery-canvas.tsx` structure):
  its own `<ReactFlowProvider>`; contexts → nodes via a new `ContextNode`
  (`components/nodes/context-node.tsx`, showing name + tint + classification badge);
  relationships → typed directed edges via a `ContextRelationEdge`
  (`components/edges/context-relation-edge.tsx`, copy of `relation-edge.tsx` keyed
  by `CONTEXT_RELATION_STYLE`).
  - Node positions are laid out with a simple deterministic arrangement (e.g. a row
    or grid by context order) — **not** the timeline layout engine; the map is its
    own graph. Free-drag of context nodes is view-only scratch (not persisted),
    consistent with decision-00002 (no persisted hand positions in the model).
  - `onConnect` → `addContextRelationship`; selecting an edge shows a type picker
    (small inline control) → `setContextRelationshipType`; delete key / button →
    `removeContextRelationship`.
- `editor.tsx`: extend the view swap — `contextMapOpen ? <ContextMapCanvas/> :
  discoveryActive ? <DiscoveryCanvas/> : <ReactFlow .../>`; gate `BoardChrome`,
  panels, etc. on the board view only.
- `toolbar.tsx`: a "Context Map" toggle in the right-hand group (available at any
  Level; not gated like Discovery).

## 3. Boundaries / non-goals

- Relationship set fixed to the canonical 8 in decision-00007 (only Big Ball of Mud
  is out of scope).
- Context-node positions in the map are transient (not in the DSL), same invariant
  as the timeline board.
- No auto-derivation of relationships from element edges; relationships are drawn
  by the modeller.

## Links

- Spec: spec-00004 · Decision: decision-00007 (relationship vocabulary) · Plan:
  plan-00014-strategic-layer
