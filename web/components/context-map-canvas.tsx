"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Connection,
  Controls,
  type EdgeTypes,
  MarkerType,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import { ContextRelationEdge } from "@/components/edges/context-relation-edge";
import { ContextNode, type ContextFlowNode } from "@/components/nodes/context-node";
import { contextTint } from "@/lib/eventstorming/context-color";
import { CONTEXT_RELATION_STYLE } from "@/lib/eventstorming/context-relations";
import { contextEdgeHandles } from "@/lib/layout/context-map";
import { useESStore } from "@/lib/store/store";

const nodeTypes: NodeTypes = { context: ContextNode };
const edgeTypes: EdgeTypes = { contextRelation: ContextRelationEdge };

// Generous spacing so adjacent nodes don't touch and the on-edge relationship
// label (type picker + delete) has clear room between them (issue-00012).
const COL_W = 440;
const ROW_H = 220;
const PER_ROW = 3;

// The Context Map (spec-00004 FR5): Bounded Contexts as nodes, relationships as
// typed directed edges. A distinct view over the model — it never touches the
// timeline board. Node positions are a deterministic grid + transient free drag
// (never persisted), holding the decision-00002 invariant (no hand positions in
// the model).
function ContextMapSurface() {
  const contexts = useESStore((s) => s.contexts);
  const relationships = useESStore((s) => s.contextRelationships);
  const addContextRelationship = useESStore((s) => s.addContextRelationship);

  const seeded = useMemo<ContextFlowNode[]>(
    () =>
      contexts
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c, i) => ({
          id: c.id,
          type: "context",
          position: { x: (i % PER_ROW) * COL_W, y: Math.floor(i / PER_ROW) * ROW_H },
          data: { name: c.name, tint: contextTint(c.id), classification: c.classification },
        })),
    [contexts],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ContextFlowNode>([]);
  // Re-seed when the set of contexts (or their names/classification) changes;
  // editing relationships does not touch this, so drag positions survive.
  useEffect(() => setNodes(seeded), [seeded, setNodes]);

  // Route each edge to the handles facing the other node (issue-00012), from the
  // live node positions so it re-routes as a context is dragged.
  const posById = useMemo(() => new Map(nodes.map((n) => [n.id, n.position])), [nodes]);
  const edges = useMemo(
    () =>
      relationships.map((r) => {
        const a = posById.get(r.source);
        const b = posById.get(r.target);
        const handles = a && b ? contextEdgeHandles(a, b) : undefined;
        return {
          id: r.id,
          source: r.source,
          target: r.target,
          ...(handles ?? {}),
          type: "contextRelation",
          data: { type: r.type },
          markerEnd: { type: MarkerType.ArrowClosed, color: CONTEXT_RELATION_STYLE[r.type].color },
        };
      }),
    [relationships, posById],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && c.source !== c.target) addContextRelationship(c.source, c.target);
    },
    [addContextRelationship],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      deleteKeyCode={null}
      minZoom={0.2}
      fitView
      fitViewOptions={{ padding: 0.3 }}
    >
      <Background />
      <Controls showInteractive={false} />
      {contexts.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <p className="rounded-md bg-white/80 px-4 py-2 text-sm text-zinc-500 shadow-sm">
            Add Bounded Contexts on the board, then drag between them here to map their
            relationships.
          </p>
        </div>
      )}
    </ReactFlow>
  );
}

/** Context Map view, isolated in its own React Flow provider. */
export function ContextMapCanvas() {
  return (
    <ReactFlowProvider>
      <ContextMapSurface />
    </ReactFlowProvider>
  );
}
