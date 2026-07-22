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
  useViewport,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardChrome } from "@/components/board-chrome";
import { RelationEdge } from "@/components/edges/relation-edge";
import { HealthPanel } from "@/components/health-panel";
import { Walkthrough } from "@/components/walkthrough";
import { ElementNode, routeHandles } from "@/components/nodes/element-node";
import { PropertyPanel } from "@/components/property-panel";
import { Toolbar } from "@/components/toolbar";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES, type ElementType } from "@/lib/eventstorming/elements";
import { typesForZoom } from "@/lib/eventstorming/levels";
import { isValidConnection as canConnect } from "@/lib/eventstorming/relations";
import { computeEdgeOffsets } from "@/lib/layout/edge-spread";
import { COL_W, NODE_W } from "@/lib/layout/layout";
import { computeFocus, computeNeighborhood, focusSource } from "@/lib/store/focus";
import { loadModel, saveModel } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";
import { dropOrder, dropTarget, slotOrders } from "@/lib/store/timeline";
import type { ESEdge, ESNode } from "@/lib/store/types";

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  labelBgPadding: [4, 2] as [number, number],
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
};

const NODE_DIM_OPACITY = 0.15;

// Timeline drag (us-00010 / design-00004 §5–6). Dragging a Domain Event edits
// its `order`, never its position: the drop x is hit-tested against a snapshot
// of the context's columns taken at drag start, then translated to an order.
const ONTO_BAND = COL_W * 0.25; // ± this of a column anchor = a concurrency drop
const STICKY_H = 64; // indicator vertical padding around the Domain Events row

type DropView =
  | { kind: "gap"; x: number; top: number; height: number }
  | { kind: "onto"; x: number; top: number; height: number };

interface DragSnapshot {
  eventId: string;
  slots: { order: number; x: number }[]; // pre-drag columns, sorted left→right
  orders: number[]; // slot orders, for gap insertion
  band: { top: number; height: number };
}

// One representative x per distinct global order, from the pre-drag layout
// (decision-00005: one timeline, not per-context).
function timelineSlots(nodes: ESNode[]) {
  const x = new Map<number, number>();
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
    const o = n.data.order ?? 0;
    if (!x.has(o)) x.set(o, n.position.x);
  }
  return [...x.entries()].map(([order, xx]) => ({ order, x: xx })).sort((a, b) => a.x - b.x);
}

function bandExtent(nodes: ESNode[]) {
  const ys = nodes.filter((n) => n.type === "domainEvent").map((n) => n.position.y);
  const top = ys.length ? Math.min(...ys) : 0;
  const bottom = ys.length ? Math.max(...ys) : 0;
  return { top: top - 6, height: bottom - top + STICKY_H };
}

function buildSnapshot(nodes: ESNode[], eventId: string): DragSnapshot {
  return {
    eventId,
    slots: timelineSlots(nodes),
    orders: slotOrders(nodes),
    band: bandExtent(nodes),
  };
}

function gapX(slots: { order: number; x: number }[], index: number) {
  if (index <= 0) return slots[0].x - (COL_W - NODE_W) / 2;
  if (index >= slots.length) return slots[slots.length - 1].x + NODE_W + (COL_W - NODE_W) / 2;
  return (slots[index - 1].x + slots[index].x) / 2 + NODE_W / 2;
}

function dropView(snap: DragSnapshot, x: number): DropView {
  const t = dropTarget(snap.slots, x, ONTO_BAND);
  const base = { top: snap.band.top, height: snap.band.height };
  if (t.kind === "onto") return { kind: "onto", x: snap.slots.find((s) => s.order === t.order)!.x, ...base };
  return { kind: "gap", x: gapX(snap.slots, t.index), ...base };
}

/** The pending-drop affordance (design-00004 §7): a vertical line for a gap
 *  insertion, a column outline for a concurrency drop. Tracks the viewport. */
function TimelineDropIndicator({ drop }: { drop: DropView }) {
  const { x: vx, y: vy, zoom } = useViewport();
  const left = drop.x * zoom + vx;
  const top = drop.top * zoom + vy;
  const height = drop.height * zoom;
  if (drop.kind === "gap") {
    return (
      <div
        className="pointer-events-none absolute z-20 -ml-px w-0.5 rounded bg-blue-500"
        style={{ left, top, height }}
      />
    );
  }
  return (
    <div
      className="pointer-events-none absolute z-20 rounded-md border-2 border-blue-500 bg-blue-400/10"
      style={{ left, top, width: NODE_W * zoom, height }}
    />
  );
}

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
  const healthOpen = useESStore((s) => s.healthOpen);
  const walkActive = useESStore((s) => s.walk.active);
  const setEventOrder = useESStore((s) => s.setEventOrder);
  const zoom = useStore((s) => s.transform[2]);
  const { fitView } = useReactFlow();

  useAutosave();

  // Timeline drag session (us-00010). `dragRef` freezes the pre-drag columns so
  // hit-testing is stable; `cancelRef` records an Escape mid-drag; `drop` drives
  // the pending-drop indicator.
  const dragRef = useRef<DragSnapshot | null>(null);
  const cancelRef = useRef(false);
  const [drop, setDrop] = useState<DropView | null>(null);

  const onNodeDragStart = useCallback(
    (_: unknown, node: ESNode) => {
      if (node.type !== "domainEvent") return;
      cancelRef.current = false;
      dragRef.current = buildSnapshot(nodes, node.id);
    },
    [nodes],
  );

  const onNodeDrag = useCallback((_: unknown, node: ESNode) => {
    if (dragRef.current) setDrop(dropView(dragRef.current, node.position.x));
  }, []);

  const onNodeDragStop = useCallback(
    (_: unknown, node: ESNode) => {
      const snap = dragRef.current;
      dragRef.current = null;
      setDrop(null);
      if (!snap) return;
      const current = nodes.find((n) => n.id === snap.eventId)?.data.order ?? 0;
      // Any stop relayouts (setEventOrder → computeLayout), so a cancel/no-op
      // still snaps the freely-dragged node back to its computed column.
      const ord = cancelRef.current
        ? current
        : dropOrder(snap.slots, snap.orders, node.position.x, ONTO_BAND);
      setEventOrder(snap.eventId, ord);
    },
    [nodes, setEventOrder],
  );

  // Escape mid-drag cancels the reorder (committed on mouse release). Arrow keys
  // move the selected Domain Event one column when the canvas (not a field) has
  // focus — the keyboard equivalent of dragging (us-00010-FR-5/FR-7).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragRef.current) {
        cancelRef.current = true;
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const s = useESStore.getState();
      if (s.walk.active) return; // walkthrough is read-only (spec-00005-XFR-1)
      const n = s.nodes.find((x) => x.id === s.selectedId);
      if (n?.type !== "domainEvent") return;
      e.preventDefault();
      s.nudgeEvent(n.id, e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    // Domain Events are draggable to adjust the timeline (us-00010); every other
    // type stays locked. Dragging edits `order`, not position (design-00004 §1).
    return visibleNodes.map((n) => ({
      ...n,
      draggable: n.type === "domainEvent",
      ...(bright ? { style: { ...n.style, opacity: bright.has(n.id) ? 1 : NODE_DIM_OPACITY } } : {}),
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
  // table validates them. Positions are never hand-set — a Domain Event drag
  // edits its timeline order (us-00010), everything else is computed.
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
            nodesDraggable
            deleteKeyCode={null}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            minZoom={0.2}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
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
          {drop && <TimelineDropIndicator drop={drop} />}
          {healthOpen && <HealthPanel />}
          {walkActive && <Walkthrough />}
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
