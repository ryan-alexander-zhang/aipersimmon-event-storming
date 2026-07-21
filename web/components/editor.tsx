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
  useReactFlow,
  useStore,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import { BoardChrome } from "@/components/board-chrome";
import { RelationEdge } from "@/components/edges/relation-edge";
import { ElementNode, routeHandles } from "@/components/nodes/element-node";
import { PropertyPanel } from "@/components/property-panel";
import { Toolbar } from "@/components/toolbar";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES, type ElementType } from "@/lib/eventstorming/elements";
import { typesForZoom } from "@/lib/eventstorming/levels";
import { isValidConnection as canConnect } from "@/lib/eventstorming/relations";
import { computeEdgeOffsets } from "@/lib/layout/edge-spread";
import { computeFocus, computeNeighborhood, focusSource } from "@/lib/store/focus";
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
  const setHoveredEdge = useESStore((s) => s.setHoveredEdge);
  const hoveredEdgeId = useESStore((s) => s.hoveredEdgeId);
  const selectedId = useESStore((s) => s.selectedId);
  const hoveredId = useESStore((s) => s.hoveredId);
  const level = useESStore((s) => s.level);
  const isolate = useESStore((s) => s.isolate);
  const zoom = useStore((s) => s.transform[2]);
  const { fitView } = useReactFlow();

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

  // Visible element types = the Level filter, further narrowed by semantic zoom
  // (zoomed out → backbone; both never show more than the Level).
  const visibleTypes = useMemo(() => new Set(typesForZoom(zoom, level)), [zoom, level]);

  // Isolate ("focus mode"): when on with a selected anchor, keep only that node's
  // N-hop neighbourhood; otherwise null (show everything the types allow).
  const isoNodeIds = useMemo(
    () =>
      isolate.active && selectedId
        ? computeNeighborhood(selectedId, edges, {
            depth: isolate.depth,
            direction: isolate.direction,
          }).nodeIds
        : null,
    [isolate.active, isolate.depth, isolate.direction, selectedId, edges],
  );

  const visibleNodes = useMemo(
    () => nodes.filter((n) => visibleTypes.has(n.type) && (!isoNodeIds || isoNodeIds.has(n.id))),
    [nodes, visibleTypes, isoNodeIds],
  );

  // Dimming (Tier A) applies only when NOT isolating — isolate already removed
  // the irrelevant nodes, so everything left stays full opacity.
  const dimActive = focus.active && !isoNodeIds;

  // Hovering an edge dims every node except that edge's two endpoints, so a
  // single connection reads as just "source → target". Otherwise the focus
  // neighbourhood is the bright set.
  const hoveredEndpoints = useMemo(() => {
    if (!hoveredEdgeId) return null;
    const e = edges.find((x) => x.id === hoveredEdgeId);
    return e ? new Set([e.source, e.target]) : null;
  }, [hoveredEdgeId, edges]);

  const decoratedNodes = useMemo(() => {
    const bright = hoveredEndpoints ?? (dimActive ? focus.nodeIds : null);
    if (!bright) return visibleNodes;
    return visibleNodes.map((n) => ({
      ...n,
      style: { ...n.style, opacity: bright.has(n.id) ? 1 : NODE_DIM_OPACITY },
    }));
  }, [visibleNodes, hoveredEndpoints, dimActive, focus]);
  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id));
    return routedEdges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [routedEdges, visibleNodes]);

  // Center offset per edge so edges sharing a column/row corridor bow apart
  // instead of overlapping on one centreline (needs node positions + measured
  // sizes so the lane centreline is computed in the space edges render in).
  const nodePos = useMemo(
    () =>
      new Map(
        nodes.map((n) => [
          n.id,
          { x: n.position.x, y: n.position.y, w: n.measured?.width, h: n.measured?.height },
        ]),
      ),
    [nodes],
  );
  const offsets = useMemo(() => computeEdgeOffsets(visibleEdges, nodePos), [visibleEdges, nodePos]);

  // Colour/weight each edge by relation, colour its arrow to match, spread
  // parallel edges, and tag its focus state so the custom edge dims off-focus
  // edges and labels focused ones.
  const decoratedEdges = useMemo<ESEdge[]>(
    () =>
      visibleEdges.map((e) => {
        const relation = e.data?.relation;
        const focusState = !focus.active
          ? "none"
          : focus.edgeIds.has(e.id)
            ? "on"
            : dimActive
              ? "off"
              : "none";
        // Edge-hover isolation overrides focus: the hovered edge is emphasised,
        // every other edge dims — so a single connection can be traced.
        const hover = hoveredEdgeId
          ? e.id === hoveredEdgeId
            ? "on"
            : "dim"
          : undefined;
        const emphasised = hover === "on";
        const color = relation ? RELATION_STYLE[relation].color : undefined;
        return {
          ...e,
          type: "relation",
          // Focused (or hovered) edges flow; reduced-motion falls back to a
          // static line via a CSS override in globals.css.
          animated: hover ? emphasised : focusState === "on",
          zIndex: emphasised ? 1000 : undefined,
          data: e.data ? { ...e.data, focusState, hover, pathOffset: offsets.get(e.id) } : e.data,
          markerEnd: color
            ? { type: MarkerType.ArrowClosed, color }
            : e.markerEnd,
        };
      }),
    [visibleEdges, focus, offsets, dimActive, hoveredEdgeId],
  );

  // Refit the view when isolate frames a subset (or clears back to the board).
  const isoKey =
    isoNodeIds && selectedId ? `${selectedId}|${isolate.direction}|${isolate.depth}` : "off";
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 0);
    return () => clearTimeout(t);
  }, [isoKey, fitView]);

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
            minZoom={0.2}
            onNodeClick={(_, n) => setSelected(n.id)}
            onNodeMouseEnter={(_, n) => setHovered(n.id)}
            onNodeMouseLeave={() => setHovered(null)}
            onEdgeMouseEnter={(_, e) => setHoveredEdge(e.id)}
            onEdgeMouseLeave={() => setHoveredEdge(null)}
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
