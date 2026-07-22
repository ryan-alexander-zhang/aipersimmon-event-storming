// The canvas state store (DSL v2). Holds React Flow nodes/edges, bounded
// contexts, and selection. Positions are never authored — after every
// structural change the store recomputes them with the layout engine.

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { createStore, type StateCreator } from "zustand/vanilla";
import type { Context } from "@/lib/dsl/schema";
import { ELEMENT_DEFINITIONS, type ElementType } from "@/lib/eventstorming/elements";
import type { Level } from "@/lib/eventstorming/levels";
import { resolveRelation } from "@/lib/eventstorming/relations";
import { computeLayout } from "@/lib/layout/layout";
import type { IsolateDirection } from "./focus";
import { eventSlotIndex, gapOrder, normalizeOrders, slotOrders, timelineOrder } from "./timeline";
import type { ESEdge, ESNode, ESNodeData } from "./types";

/** Isolate ("focus mode") view state: hide everything outside the selected
 *  node's `depth`-hop neighbourhood in `direction`. Anchored on selectedId. */
export interface IsolateState {
  active: boolean;
  direction: IsolateDirection;
  depth: number;
}

/** A Domain Event on the transient discovery wall: a free x/y position and a
 *  label, with no timeline order and no context (decision-00004). Never written
 *  into the structured model or the DSL; persisted under a separate key. */
export interface DiscoveryItem {
  id: string;
  label: string;
  x: number;
  y: number;
}

/** Discovery Mode ("input funnel") state: a Big-Picture-only wall of unordered
 *  events that Converge hands to the structured board. `active` is view-only;
 *  `items` are scratch data mirrored to local storage, never to the DSL. */
export interface DiscoveryState {
  active: boolean;
  items: DiscoveryItem[];
}

export interface ESState {
  nodes: ESNode[];
  edges: ESEdge[];
  contexts: Context[];
  level: Level;
  selectedId: string | null;
  /** Transient hover target; drives the focus highlight, never persisted. */
  hoveredId: string | null;
  /** Transient hovered edge; drives edge-hover isolation, never persisted. */
  hoveredEdgeId: string | null;
  /** Isolate/focus mode; view-only, never persisted. */
  isolate: IsolateState;
  /** Model-health panel visibility (spec-00007); view-only, never persisted. */
  healthOpen: boolean;
  /** Narrative walkthrough cursor (spec-00005); view-only, never persisted. */
  walk: { active: boolean; index: number };
  /** Discovery Mode wall (spec-00002); transient, persisted outside the DSL. */
  discovery: DiscoveryState;

  setLevel: (level: Level) => void;
  toggleIsolate: () => void;
  setIsolateDirection: (direction: IsolateDirection) => void;
  setIsolateDepth: (depth: number) => void;
  toggleHealth: () => void;
  /** Start the walkthrough at the first Domain Event in timeline order. */
  startWalkthrough: () => void;
  /** Move the walkthrough cursor one step (clamped), selecting that event. */
  walkStep: (dir: -1 | 1) => void;
  stopWalkthrough: () => void;

  /** Enter Discovery Mode; no-op unless at Big Picture (decision-00004). */
  enterDiscovery: () => void;
  /** Leave Discovery Mode; the wall's items are kept for re-entry. */
  exitDiscovery: () => void;
  /** Drop an unordered event on the wall at a free position; returns its id. */
  addDiscoveryItem: (x: number, y: number, label?: string) => string;
  /** Move a wall event to a new free position (drag). */
  moveDiscoveryItem: (id: string, x: number, y: number) => void;
  /** Rename a wall event. */
  updateDiscoveryItem: (id: string, label: string) => void;
  /** Remove a wall event. */
  removeDiscoveryItem: (id: string) => void;
  /** Converge the wall: create one Ungrouped Domain Event per item, ordered by
   *  left→right (x) position on the global timeline, then clear the wall and
   *  leave Discovery Mode (us-00017). Empty wall → just leave the mode. */
  converge: () => void;

  onNodesChange: (changes: NodeChange<ESNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ESEdge>[]) => void;

  /** Add a bounded context; returns its id. */
  addContext: (name: string) => string;
  renameContext: (id: string, name: string) => void;
  /** Remove a context along with its member nodes and their edges. */
  removeContext: (id: string) => void;
  /** Add a node of `type` in `context` (omit/empty → Ungrouped); Domain Events get
   *  the next order on the global timeline (decision-00005). */
  addNode: (type: ElementType, context?: string, data?: Partial<ESNodeData>) => string;
  updateNodeData: (id: string, patch: Partial<ESNodeData>) => void;
  removeNode: (id: string) => void;
  /** Attach a hotspot to `targetId` (inherits its context); returns the hotspot id. */
  addHotspot: (targetId: string, text: string) => string;
  /** Attach an opportunity to `targetId` (inherits its context); returns its id. */
  addOpportunity: (targetId: string, text: string) => string;
  /** Create a semantic edge if the connection is valid; returns success. */
  connect: (connection: Connection) => boolean;
  /** Set a Domain Event's global timeline order, then normalize the timeline to a
   *  contiguous slot sequence (preserving concurrency). Fractional orders are
   *  allowed — the UI uses them to insert between slots. */
  setEventOrder: (eventId: string, order: number) => void;
  /** Move a Domain Event one timeline column toward the start (-1) or end (1). */
  nudgeEvent: (eventId: string, dir: -1 | 1) => void;
  /** Send a Domain Event to the start (-1) or end (1) of the global timeline. */
  moveEventToEnd: (eventId: string, dir: -1 | 1) => void;
  /** Move a node into another bounded context. */
  reassignContext: (nodeId: string, context: string) => void;

  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  setModel: (model: {
    nodes: ESNode[];
    edges: ESEdge[];
    contexts: Context[];
    level?: Level;
  }) => void;
  clear: () => void;
}

// Recompute positions from the model whenever structure — or the Level — changes.
// The Level collapses its hidden bands, so switching Level reflows the board
// (issue-00009).
function laidOut(nodes: ESNode[], edges: ESEdge[], contexts: Context[], level: Level): ESNode[] {
  return computeLayout(nodes, edges, contexts, level);
}

const initializer: StateCreator<ESState> = (set, get) => ({
  nodes: [],
  edges: [],
  contexts: [],
  level: "design",
  selectedId: null,
  hoveredId: null,
  hoveredEdgeId: null,
  isolate: { active: false, direction: "down", depth: 2 },
  healthOpen: false,
  walk: { active: false, index: 0 },
  discovery: { active: false, items: [] },

  setLevel: (level) =>
    set({
      level,
      nodes: laidOut(get().nodes, get().edges, get().contexts, level),
      // Discovery is Big-Picture only; leaving that level exits the mode but
      // keeps the wall's items for re-entry (spec-00002 §5).
      discovery:
        level === "big-picture" ? get().discovery : { ...get().discovery, active: false },
    }),
  toggleIsolate: () => set({ isolate: { ...get().isolate, active: !get().isolate.active } }),
  setIsolateDirection: (direction) => set({ isolate: { ...get().isolate, direction } }),
  setIsolateDepth: (depth) => set({ isolate: { ...get().isolate, depth: Math.max(1, depth) } }),
  toggleHealth: () => set({ healthOpen: !get().healthOpen }),

  startWalkthrough: () => {
    const order = timelineOrder(get().nodes);
    set({ walk: { active: true, index: 0 }, selectedId: order[0] ?? null });
  },
  walkStep: (dir) => {
    const order = timelineOrder(get().nodes);
    if (order.length === 0) return;
    const index = Math.min(order.length - 1, Math.max(0, get().walk.index + dir));
    set({ walk: { active: true, index }, selectedId: order[index] });
  },
  stopWalkthrough: () => set({ walk: { ...get().walk, active: false } }),

  enterDiscovery: () => {
    if (get().level !== "big-picture") return;
    set({ discovery: { ...get().discovery, active: true } });
  },
  exitDiscovery: () => set({ discovery: { ...get().discovery, active: false } }),
  addDiscoveryItem: (x, y, label) => {
    const id = nanoid();
    const item: DiscoveryItem = { id, label: label ?? ELEMENT_DEFINITIONS.domainEvent.label, x, y };
    set({ discovery: { ...get().discovery, items: [...get().discovery.items, item] } });
    return id;
  },
  moveDiscoveryItem: (id, x, y) =>
    set({
      discovery: {
        ...get().discovery,
        items: get().discovery.items.map((it) => (it.id === id ? { ...it, x, y } : it)),
      },
    }),
  updateDiscoveryItem: (id, label) =>
    set({
      discovery: {
        ...get().discovery,
        items: get().discovery.items.map((it) => (it.id === id ? { ...it, label } : it)),
      },
    }),
  removeDiscoveryItem: (id) =>
    set({
      discovery: {
        ...get().discovery,
        items: get().discovery.items.filter((it) => it.id !== id),
      },
    }),
  converge: () => {
    // Left→right (x) becomes the timeline order; addNode assigns the next global
    // order per call, so the wall lands as a contiguous block after any existing
    // events, Ungrouped (us-00017). Ties broken by id for determinism.
    const ordered = [...get().discovery.items].sort((a, b) => a.x - b.x || (a.id < b.id ? -1 : 1));
    for (const it of ordered) get().addNode("domainEvent", undefined, { label: it.label });
    set({ discovery: { active: false, items: [] } });
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

  addContext: (name) => {
    const id = nanoid();
    const order = get().contexts.reduce((m, c) => Math.max(m, c.order), -1) + 1;
    set({ contexts: [...get().contexts, { id, name, order }] });
    return id;
  },

  renameContext: (id, name) =>
    set({ contexts: get().contexts.map((c) => (c.id === id ? { ...c, name } : c)) }),

  removeContext: (id) => {
    const nodes = get().nodes.filter((n) => n.data.context !== id);
    const keep = new Set(nodes.map((n) => n.id));
    const edges = get().edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    const contexts = get().contexts.filter((c) => c.id !== id);
    set({ nodes: laidOut(nodes, edges, contexts, get().level), edges, contexts, selectedId: null });
  },

  addNode: (type, context, data) => {
    const id = nanoid();
    const ctx = context || undefined; // "" and undefined both mean Ungrouped
    const nodeData: ESNodeData = { label: ELEMENT_DEFINITIONS[type].label, context: ctx, ...data };
    if (type === "domainEvent" && nodeData.order === undefined) {
      // Next slot on the single global timeline (decision-00005), across contexts.
      nodeData.order =
        get()
          .nodes.filter((n) => n.type === "domainEvent")
          .reduce((m, n) => Math.max(m, n.data.order ?? 0), -1) + 1;
    }
    const node: ESNode = { id, type, position: { x: 0, y: 0 }, data: nodeData };
    const nodes = [...get().nodes, node];
    set({ nodes: laidOut(nodes, get().edges, get().contexts, get().level) });
    return id;
  },

  updateNodeData: (id, patch) => {
    const nodes = get().nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
    );
    set({ nodes: laidOut(nodes, get().edges, get().contexts, get().level) });
  },

  removeNode: (id) => {
    const nodes = get().nodes.filter((n) => n.id !== id);
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id);
    set({
      nodes: laidOut(nodes, edges, get().contexts, get().level),
      edges,
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  addHotspot: (targetId, text) => {
    const target = get().nodes.find((n) => n.id === targetId);
    const id = get().addNode("hotspot", target?.data.context, { label: text });
    get().connect({ source: id, target: targetId, sourceHandle: null, targetHandle: null });
    return id;
  },

  addOpportunity: (targetId, text) => {
    const target = get().nodes.find((n) => n.id === targetId);
    const id = get().addNode("opportunity", target?.data.context, { label: text });
    get().connect({ source: id, target: targetId, sourceHandle: null, targetHandle: null });
    return id;
  },

  connect: (connection) => {
    const { source, target } = connection;
    if (!source || !target || source === target) return false;
    const nodes = get().nodes;
    const s = nodes.find((n) => n.id === source);
    const t = nodes.find((n) => n.id === target);
    if (!s?.type || !t?.type) return false;
    const relation = resolveRelation(s.type, t.type);
    if (!relation) return false;
    const edge: ESEdge = { id: nanoid(), source, target, data: { relation }, label: relation };
    const edges = addEdge(edge, get().edges);
    set({ nodes: laidOut(nodes, edges, get().contexts, get().level), edges });
    return true;
  },

  setEventOrder: (eventId, order) => {
    const ev = get().nodes.find((n) => n.id === eventId);
    if (ev?.type !== "domainEvent") return;
    const written = get().nodes.map((n) =>
      n.id === eventId ? { ...n, data: { ...n.data, order } } : n,
    );
    const normalized = normalizeOrders(written);
    set({ nodes: laidOut(normalized, get().edges, get().contexts, get().level) });
  },

  nudgeEvent: (eventId, dir) => {
    const ev = get().nodes.find((n) => n.id === eventId);
    if (ev?.type !== "domainEvent") return;
    const orders = slotOrders(get().nodes);
    const i = eventSlotIndex(get().nodes, eventId);
    if (i < 0) return;
    // toward start: insert before the previous slot; toward end: after the next.
    get().setEventOrder(eventId, gapOrder(orders, dir < 0 ? i - 1 : i + 2));
  },

  moveEventToEnd: (eventId, dir) => {
    const ev = get().nodes.find((n) => n.id === eventId);
    if (ev?.type !== "domainEvent") return;
    const orders = slotOrders(get().nodes);
    get().setEventOrder(eventId, gapOrder(orders, dir < 0 ? 0 : orders.length));
  },

  // Empty selection → Ungrouped (no context), keeping one canonical "no context".
  reassignContext: (nodeId, context) =>
    get().updateNodeData(nodeId, { context: context || undefined }),

  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),
  setModel: ({ nodes, edges, contexts, level }) =>
    set({
      nodes: laidOut(nodes, edges, contexts, level ?? get().level),
      edges,
      contexts,
      level: level ?? get().level,
      selectedId: null,
      hoveredId: null,
      hoveredEdgeId: null,
      isolate: { ...get().isolate, active: false },
      walk: { active: false, index: 0 },
      discovery: { active: false, items: [] },
    }),
  clear: () =>
    set({
      nodes: [],
      edges: [],
      contexts: [],
      selectedId: null,
      hoveredId: null,
      hoveredEdgeId: null,
      isolate: { ...get().isolate, active: false },
      walk: { active: false, index: 0 },
      discovery: { active: false, items: [] },
    }),
});

export const useESStore = create<ESState>()(initializer);

/** Isolated store instance (for tests). */
export const createESStore = () => createStore<ESState>()(initializer);
