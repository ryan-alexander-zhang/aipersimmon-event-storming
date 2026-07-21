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
import type { ESEdge, ESNode, ESNodeData } from "./types";

/** Isolate ("focus mode") view state: hide everything outside the selected
 *  node's `depth`-hop neighbourhood in `direction`. Anchored on selectedId. */
export interface IsolateState {
  active: boolean;
  direction: IsolateDirection;
  depth: number;
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

  setLevel: (level: Level) => void;
  toggleIsolate: () => void;
  setIsolateDirection: (direction: IsolateDirection) => void;
  setIsolateDepth: (depth: number) => void;

  onNodesChange: (changes: NodeChange<ESNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ESEdge>[]) => void;

  /** Add a bounded context; returns its id. */
  addContext: (name: string) => string;
  renameContext: (id: string, name: string) => void;
  /** Remove a context along with its member nodes and their edges. */
  removeContext: (id: string) => void;
  /** Add a node of `type` in `context` (omit/empty → Ungrouped); Domain Events get
   *  the next timeline order within that context. */
  addNode: (type: ElementType, context?: string, data?: Partial<ESNodeData>) => string;
  updateNodeData: (id: string, patch: Partial<ESNodeData>) => void;
  removeNode: (id: string) => void;
  /** Attach a hotspot to `targetId` (inherits its context); returns the hotspot id. */
  addHotspot: (targetId: string, text: string) => string;
  /** Create a semantic edge if the connection is valid; returns success. */
  connect: (connection: Connection) => boolean;
  /** Set a Domain Event's timeline order. */
  reorderEvent: (eventId: string, order: number) => void;
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

// Recompute positions from the model whenever structure changes.
function laidOut(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): ESNode[] {
  return computeLayout(nodes, edges, contexts);
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

  setLevel: (level) => set({ level }),
  toggleIsolate: () => set({ isolate: { ...get().isolate, active: !get().isolate.active } }),
  setIsolateDirection: (direction) => set({ isolate: { ...get().isolate, direction } }),
  setIsolateDepth: (depth) => set({ isolate: { ...get().isolate, depth: Math.max(1, depth) } }),

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
    set({ nodes: laidOut(nodes, edges, contexts), edges, contexts, selectedId: null });
  },

  addNode: (type, context, data) => {
    const id = nanoid();
    const ctx = context || undefined; // "" and undefined both mean Ungrouped
    const nodeData: ESNodeData = { label: ELEMENT_DEFINITIONS[type].label, context: ctx, ...data };
    if (type === "domainEvent" && nodeData.order === undefined) {
      nodeData.order =
        get()
          .nodes.filter((n) => n.type === "domainEvent" && n.data.context === ctx)
          .reduce((m, n) => Math.max(m, n.data.order ?? 0), -1) + 1;
    }
    const node: ESNode = { id, type, position: { x: 0, y: 0 }, data: nodeData };
    const nodes = [...get().nodes, node];
    set({ nodes: laidOut(nodes, get().edges, get().contexts) });
    return id;
  },

  updateNodeData: (id, patch) => {
    const nodes = get().nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
    );
    set({ nodes: laidOut(nodes, get().edges, get().contexts) });
  },

  removeNode: (id) => {
    const nodes = get().nodes.filter((n) => n.id !== id);
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id);
    set({
      nodes: laidOut(nodes, edges, get().contexts),
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
    set({ nodes: laidOut(nodes, edges, get().contexts), edges });
    return true;
  },

  reorderEvent: (eventId, order) => get().updateNodeData(eventId, { order }),
  // Empty selection → Ungrouped (no context), keeping one canonical "no context".
  reassignContext: (nodeId, context) =>
    get().updateNodeData(nodeId, { context: context || undefined }),

  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),
  setModel: ({ nodes, edges, contexts, level }) =>
    set({
      nodes: laidOut(nodes, edges, contexts),
      edges,
      contexts,
      level: level ?? get().level,
      selectedId: null,
      hoveredId: null,
      hoveredEdgeId: null,
      isolate: { ...get().isolate, active: false },
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
    }),
});

export const useESStore = create<ESState>()(initializer);

/** Isolated store instance (for tests). */
export const createESStore = () => createStore<ESState>()(initializer);
