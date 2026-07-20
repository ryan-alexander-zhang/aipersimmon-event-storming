"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Connection,
  Controls,
  type IsValidConnection,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import { BoardChrome } from "@/components/board-chrome";
import { RelationEdge } from "@/components/edges/relation-edge";
import { ElementNode, routeHandles } from "@/components/nodes/element-node";
import { PropertyPanel } from "@/components/property-panel";
import { Toolbar } from "@/components/toolbar";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES, type ElementType } from "@/lib/eventstorming/elements";
import { isVisibleAt } from "@/lib/eventstorming/levels";
import { isValidConnection as canConnect } from "@/lib/eventstorming/relations";
import { computeEdgeOffsets } from "@/lib/layout/edge-spread";
import { computeFocus, focusSource } from "@/lib/store/focus";
import { loadModel, saveModel } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";
import type { ESEdge } from "@/lib/store/types";

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  labelBgPadding: [4, 2] as [number, number],
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
};

const NODE_DIM_OPACITY = 0.15;

/** Hydrate from local storage on mount, then debounce-save on every change. */
function useAutosave() {
  useEffect(() => {
    const loaded = loadModel();
    if (loaded && (loaded.nodes.length > 0 || loaded.contexts.length > 0)) {
      useESStore.getState().setModel(loaded);
    }
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = useESStore.subscribe((s) => {
      clearTimeout(timer);
      timer = setTimeout(() => saveModel(s.nodes, s.edges, s.contexts, s.level), 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

function Canvas() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const onNodesChange = useESStore((s) => s.onNodesChange);
  const onEdgesChange = useESStore((s) => s.onEdgesChange);
  const connect = useESStore((s) => s.connect);
  const setSelected = useESStore((s) => s.setSelected);
  const setHovered = useESStore((s) => s.setHovered);
  const selectedId = useESStore((s) => s.selectedId);
  const hoveredId = useESStore((s) => s.hoveredId);
  const level = useESStore((s) => s.level);

  useAutosave();

  const nodeTypes = useMemo<NodeTypes>(() => {
    const map: NodeTypes = {};
    for (const t of ELEMENT_TYPES) map[t] = ElementNode;
    return map;
  }, []);

  const edgeTypes = useMemo(() => ({ relation: RelationEdge }), []);

  // The node under attention (hover wins over selection) and its neighbourhood.
  const focus = useMemo(
    () => computeFocus(focusSource(hoveredId, selectedId), edges),
    [hoveredId, selectedId, edges],
  );

  // Attach handle anchors per edge from current node positions, so the vertical
  // slice chain draws top↔bottom and timeline links left↔right.
  const routedEdges = useMemo(() => {
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    return edges.map((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      return a && b ? { ...e, ...routeHandles(a, b) } : e;
    });
  }, [nodes, edges]);

  // The level is a view filter: hide element types (and edges touching them)
  // that don't belong at the current level. The model keeps everything.
  const visibleNodes = useMemo(() => nodes.filter((n) => isVisibleAt(level, n.type)), [nodes, level]);

  // Dim nodes outside the focused neighbourhood via the node wrapper's opacity.
  const decoratedNodes = useMemo(
    () =>
      visibleNodes.map((n) =>
        !focus.active
          ? n
          : {
              ...n,
              style: { ...n.style, opacity: focus.nodeIds.has(n.id) ? 1 : NODE_DIM_OPACITY },
            },
      ),
    [visibleNodes, focus],
  );
  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id));
    return routedEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [routedEdges, visibleNodes]);

  // Center offset per edge so siblings sharing a corridor bump apart instead of overlapping.
  const offsets = useMemo(() => computeEdgeOffsets(visibleEdges), [visibleEdges]);

  // Colour/weight each edge by relation, colour its arrow to match, spread
  // parallel edges, and tag its focus state so the custom edge dims off-focus
  // edges and labels focused ones.
  const decoratedEdges = useMemo<ESEdge[]>(
    () =>
      visibleEdges.map((e) => {
        const relation = e.data?.relation;
        const focusState = !focus.active ? "none" : focus.edgeIds.has(e.id) ? "on" : "off";
        return {
          ...e,
          type: "relation",
          // Focused edges flow (marching-ants); reduced-motion falls back to
          // the thicker static line via a CSS override in globals.css.
          animated: focusState === "on",
          data: e.data ? { ...e.data, focusState, pathOffset: offsets.get(e.id) } : e.data,
          markerEnd: relation
            ? { type: MarkerType.ArrowClosed, color: RELATION_STYLE[relation].color }
            : e.markerEnd,
        };
      }),
    [visibleEdges, focus, offsets],
  );

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

  // Manual links stay possible for cross-context/ambiguous relations; the rule
  // table validates them. Element positions are never dragged.
  const isValidConnection = useCallback<IsValidConnection>(
    (c) => {
      const s = nodes.find((n) => n.id === c.source);
      const t = nodes.find((n) => n.id === c.target);
      return !!s?.type && !!t?.type && canConnect(s.type, t.type);
    },
    [nodes],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1">
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={false}
            deleteKeyCode={null}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, n) => setSelected(n.id)}
            onNodeMouseEnter={(_, n) => setHovered(n.id)}
            onNodeMouseLeave={() => setHovered(null)}
            onPaneClick={() => {
              setSelected(null);
              setHovered(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background />
            <MiniMap
              nodeColor={(n) => ELEMENT_DEFINITIONS[n.type as ElementType]?.color ?? "#ccc"}
            />
            <Controls />
          </ReactFlow>
          <BoardChrome />
        </div>
        <PropertyPanel />
      </div>
    </div>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
