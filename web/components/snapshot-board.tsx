"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  type EdgeTypes,
  MarkerType,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useMemo } from "react";
import { RelationEdge } from "@/components/edges/relation-edge";
import { routeHandles } from "@/components/nodes/element-node";
import { SnapshotNode } from "@/components/nodes/snapshot-node";
import type { ModelDiff } from "@/lib/dsl/diff";
import type { DiffChange } from "@/lib/dsl/diff-display";
import type { Model } from "@/lib/dsl/schema";
import { fromModel } from "@/lib/dsl/serialize";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { computeLayout } from "@/lib/layout/layout";

const nodeTypes: NodeTypes = (() => {
  const map: NodeTypes = {};
  for (const t of ELEMENT_TYPES) map[t] = SnapshotNode;
  return map;
})();
const edgeTypes: EdgeTypes = { relation: RelationEdge };

// A read-only render of one snapshot's model (spec-00008 FR10): the DSL is laid out
// by the same pure layout engine the live board uses, then drawn with read-only
// stickies (SnapshotNode) and the shared RelationEdge. No store wiring, nothing
// draggable/editable — comparing never mutates the live model (us-00022-FR-3).
function SnapshotSurface({
  model,
  diff,
  changes,
}: {
  model: Model;
  diff?: ModelDiff;
  changes?: Map<string, DiffChange>;
}) {
  const { nodes, edges } = useMemo(() => {
    const { nodes, edges, contexts } = fromModel(model);
    // Lay out at the full "design" level (all bands present) — never the snapshot's
    // stored level. This board renders EVERY element, so a level that hides bands
    // would collapse them and pile the hidden-type stickies up (issue-00015).
    const laid = computeLayout(nodes, edges, contexts, "design");
    // When diffing, tag each node with its status (dim/ring) and its change detail
    // (struck old label + chips + hover title).
    const tagged = diff
      ? laid.map((n) => ({
          ...n,
          data: { ...n.data, diffStatus: diff.nodes.get(n.id) ?? "unchanged", diffChange: changes?.get(n.id) },
        }))
      : laid;
    const pos = new Map(laid.map((n) => [n.id, n.position]));
    const routed = edges.map((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      const relation = e.data?.relation;
      const color = relation ? RELATION_STYLE[relation].color : "#94a3b8";
      // In diff mode, reuse RelationEdge's focus dimming: unchanged edges recede
      // ("off"), added/changed edges stand out ("on").
      const focusState = diff
        ? diff.edges.get(e.id) === "unchanged"
          ? "off"
          : "on"
        : undefined;
      return {
        ...e,
        ...(a && b ? routeHandles(a, b) : {}),
        type: "relation",
        animated: focusState === "on",
        markerEnd: { type: MarkerType.ArrowClosed, color },
        data: focusState ? { ...e.data, focusState } : e.data,
      };
    });
    return { nodes: tagged, edges: routed };
  }, [model, diff, changes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      deleteKeyCode={null}
      minZoom={0.2}
      fitView
      fitViewOptions={{ padding: 0.2 }}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

/** One snapshot rendered read-only in its own React Flow provider. With `diff`, the
 *  board is the target of a comparison: nodes/edges are dimmed or ringed by status
 *  (us-00023). */
export function SnapshotBoard({
  model,
  diff,
  changes,
}: {
  model: Model;
  diff?: ModelDiff;
  changes?: Map<string, DiffChange>;
}) {
  return (
    <ReactFlowProvider>
      <SnapshotSurface model={model} diff={diff} changes={changes} />
    </ReactFlowProvider>
  );
}
