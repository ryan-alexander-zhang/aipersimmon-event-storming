// Pure model-level diff for the snapshot Compare view (spec-00008 / us-00023).
// Matches elements by stable id (snapshots preserve ids), classifying each target
// element as added / changed / unchanged and collecting base-only elements as
// removed. No rendering here (decision-00009 / design-00009).

import type { Model, ModelEdge, ModelNode } from "./schema";

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

/** A single changed field of a node, value-only (no display strings). */
export interface FieldChange {
  field: "label" | "order" | "context" | "pivotal" | "state" | "kind" | "priority" | "description";
  before: unknown;
  after: unknown;
}

export interface ChangedNode {
  before: ModelNode;
  after: ModelNode;
  fields: FieldChange[];
}

export interface ModelDiff {
  /** Target node id → status (added / changed / unchanged). */
  nodes: Map<string, DiffStatus>;
  /** Target node id → before/after + which fields changed (for `changed` nodes). */
  changed: Map<string, ChangedNode>;
  /** Nodes present in the base but absent from the target. */
  removedNodes: ModelNode[];
  /** Target edge id → status. */
  edges: Map<string, DiffStatus>;
  removedEdges: ModelEdge[];
  summary: { added: number; removed: number; changed: number };
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// The differing subset of the comparable fields, in a stable display order.
function changedFields(before: ModelNode, after: ModelNode): FieldChange[] {
  const fields: FieldChange[] = [];
  const push = (field: FieldChange["field"], b: unknown, a: unknown) => {
    if (!eq(b, a)) fields.push({ field, before: b, after: a });
  };
  push("label", before.label, after.label);
  push("order", before.order, after.order);
  push("context", before.context, after.context);
  push("pivotal", before.properties.pivotal, after.properties.pivotal);
  push("state", before.properties.state, after.properties.state);
  push("kind", before.properties.kind, after.properties.kind);
  push("priority", before.properties.priority, after.properties.priority);
  push("description", before.properties.description, after.properties.description);
  return fields;
}

// Comparable payload of a node — everything but its id. `properties` is normalized
// by the schema (defaults to {}), so a stable stringify is a reliable equality test.
function nodeKey(n: ModelNode): string {
  return JSON.stringify({
    type: n.type,
    label: n.label,
    context: n.context ?? null,
    order: n.order ?? null,
    properties: n.properties,
  });
}

/** Diff base → target, matched by id. */
export function diffModels(base: Model, target: Model): ModelDiff {
  const baseNodes = new Map(base.nodes.map((n) => [n.id, n]));
  const targetNodeIds = new Set(target.nodes.map((n) => n.id));
  const nodes = new Map<string, DiffStatus>();
  const changedNodes = new Map<string, ChangedNode>();
  let added = 0;
  let changed = 0;

  for (const n of target.nodes) {
    const b = baseNodes.get(n.id);
    if (!b) {
      nodes.set(n.id, "added");
      added++;
    } else if (nodeKey(b) !== nodeKey(n)) {
      nodes.set(n.id, "changed");
      changedNodes.set(n.id, { before: b, after: n, fields: changedFields(b, n) });
      changed++;
    } else {
      nodes.set(n.id, "unchanged");
    }
  }
  const removedNodes = base.nodes.filter((n) => !targetNodeIds.has(n.id));

  const baseEdges = new Map(base.edges.map((e) => [e.id, e]));
  const targetEdgeIds = new Set(target.edges.map((e) => e.id));
  const edges = new Map<string, DiffStatus>();

  for (const e of target.edges) {
    const b = baseEdges.get(e.id);
    if (!b) {
      edges.set(e.id, "added");
      added++;
    } else if (b.relation !== e.relation || b.source !== e.source || b.target !== e.target) {
      edges.set(e.id, "changed");
      changed++;
    } else {
      edges.set(e.id, "unchanged");
    }
  }
  const removedEdges = base.edges.filter((e) => !targetEdgeIds.has(e.id));

  return {
    nodes,
    changed: changedNodes,
    removedNodes,
    edges,
    removedEdges,
    summary: { added, removed: removedNodes.length + removedEdges.length, changed },
  };
}
