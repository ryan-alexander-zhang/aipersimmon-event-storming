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
import { contextEdgeHandles, contextMapPositions } from "@/lib/layout/context-map";
import { computeEdgeOffsets } from "@/lib/layout/edge-spread";
import { useESStore } from "@/lib/store/store";

const nodeTypes: NodeTypes = { context: ContextNode };
const edgeTypes: EdgeTypes = { contextRelation: ContextRelationEdge };

const NODE_DIM_OPACITY = 0.15;

// The Context Map (spec-00004 FR5): Bounded Contexts as nodes, relationships as
// typed directed edges. A distinct view over the model — it never touches the
// timeline board. Node positions are a deterministic grid + transient free drag
// (never persisted), holding the decision-00002 invariant (no hand positions in
// the model).
function ContextMapSurface() {
  const contexts = useESStore((s) => s.contexts);
  const relationships = useESStore((s) => s.contextRelationships);
  const addContextRelationship = useESStore((s) => s.addContextRelationship);
  const hoveredEdgeId = useESStore((s) => s.hoveredEdgeId);
  const setHoveredEdge = useESStore((s) => s.setHoveredEdge);

  const seeded = useMemo<ContextFlowNode[]>(() => {
    const pos = contextMapPositions(contexts);
    return contexts.map((c) => ({
      id: c.id,
      type: "context",
      position: pos.get(c.id)!,
      data: { name: c.name, tint: contextTint(c.id), classification: c.classification },
    }));
  }, [contexts]);

  // The hovered id only isolates while it still names a live relationship —
  // deleting the hovered one (via its own X) must not leave every edge dimmed.
  const hoveredRelationship = useMemo(
    () => relationships.find((r) => r.id === hoveredEdgeId),
    [relationships, hoveredEdgeId],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<ContextFlowNode>([]);
  // Re-seed when the set of contexts (or their names/classification) changes;
  // editing relationships does not touch this, so drag positions survive.
  useEffect(() => setNodes(seeded), [seeded, setNodes]);

  // Route each edge to the handles facing the other node (issue-00012), from the
  // live node positions so it re-routes as a context is dragged. Measured sizes
  // come along so the corridor centreline is computed in the space edges render in.
  const posById = useMemo(
    () =>
      new Map(
        nodes.map((n) => [
          n.id,
          { x: n.position.x, y: n.position.y, w: n.measured?.width, h: n.measured?.height },
        ]),
      ),
    [nodes],
  );
  // Relationships sharing a corridor bow apart instead of stacking on one
  // centreline — the board's spread, reused (issue-00003).
  const offsets = useMemo(() => computeEdgeOffsets(relationships, posById), [
    relationships,
    posById,
  ]);
  const edges = useMemo(
    () =>
      relationships.map((r) => {
        const a = posById.get(r.source);
        const b = posById.get(r.target);
        const handles = a && b ? contextEdgeHandles(a, b) : undefined;
        // Edge-hover isolation, as on the board: the hovered relationship is
        // emphasised and flows, every other one dims (design-00003 Tier C). No
        // zIndex lift on hover — here the always-visible label is the hover
        // target, and re-parenting the edge remounts its label, which flickers
        // hover on/off.
        const hover = hoveredRelationship
          ? r.id === hoveredRelationship.id
            ? "on"
            : "dim"
          : undefined;
        return {
          id: r.id,
          source: r.source,
          target: r.target,
          ...(handles ?? {}),
          type: "contextRelation",
          animated: hover === "on",
          data: { type: r.type, hover, pathOffset: offsets.get(r.id) },
          markerEnd: { type: MarkerType.ArrowClosed, color: CONTEXT_RELATION_STYLE[r.type].color },
        };
      }),
    [relationships, posById, offsets, hoveredRelationship],
  );

  // Hovering a relationship dims every context except its two endpoints, so one
  // relationship reads as just "source → target".
  const decoratedNodes = useMemo(() => {
    if (!hoveredRelationship) return nodes;
    const bright = new Set([hoveredRelationship.source, hoveredRelationship.target]);
    return nodes.map((n) => ({
      ...n,
      style: { ...n.style, opacity: bright.has(n.id) ? 1 : NODE_DIM_OPACITY },
    }));
  }, [nodes, hoveredRelationship]);

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && c.source !== c.target) addContextRelationship(c.source, c.target);
    },
    [addContextRelationship],
  );

  return (
    <ReactFlow
      nodes={decoratedNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onConnect={onConnect}
      onEdgeMouseEnter={(_, e) => setHoveredEdge(e.id)}
      onEdgeMouseLeave={() => setHoveredEdge(null)}
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
