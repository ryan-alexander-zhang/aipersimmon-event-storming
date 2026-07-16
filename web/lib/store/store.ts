// The canvas state store. Holds React Flow nodes/edges + selection, and the
// actions the UI drives. A shared initializer backs both the React hook
// (useESStore) and a vanilla factory (createESStore) used for isolated tests.

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { createStore, type StateCreator } from "zustand/vanilla";
import { ELEMENT_DEFINITIONS, type ElementType } from "@/lib/eventstorming/elements";
import { resolveRelation } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode, ESNodeData } from "./types";

export interface ESState {
  nodes: ESNode[];
  edges: ESEdge[];
  selectedId: string | null;

  onNodesChange: (changes: NodeChange<ESNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ESEdge>[]) => void;

  /** Add a node of `type` at `position`; returns its id. */
  addNode: (type: ElementType, position: XYPosition, data?: Partial<ESNodeData>) => string;
  updateNodeData: (id: string, patch: Partial<ESNodeData>) => void;
  /** Remove a node and every edge attached to it. */
  removeNode: (id: string) => void;
  /** Attach a hotspot to `targetId`; returns the hotspot node id. */
  addHotspot: (targetId: string, position: XYPosition, text: string) => string;
  /** Create a semantic edge if the connection is valid; returns success. */
  connect: (connection: Connection) => boolean;

  setSelected: (id: string | null) => void;
  setModel: (model: { nodes: ESNode[]; edges: ESEdge[] }) => void;
  clear: () => void;
}

const initializer: StateCreator<ESState> = (set, get) => ({
  nodes: [],
  edges: [],
  selectedId: null,

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

  addNode: (type, position, data) => {
    const id = nanoid();
    const node: ESNode = {
      id,
      type,
      position,
      data: { label: ELEMENT_DEFINITIONS[type].label, ...data },
    };
    set({ nodes: [...get().nodes, node] });
    return id;
  },

  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    }),

  removeNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    }),

  addHotspot: (targetId, position, text) => {
    const id = get().addNode("hotspot", position, { label: text });
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
    const edge: ESEdge = {
      id: nanoid(),
      source,
      target,
      data: { relation },
      label: relation,
    };
    set({ edges: addEdge(edge, get().edges) });
    return true;
  },

  setSelected: (id) => set({ selectedId: id }),
  setModel: ({ nodes, edges }) => set({ nodes, edges, selectedId: null }),
  clear: () => set({ nodes: [], edges: [], selectedId: null }),
});

export const useESStore = create<ESState>()(initializer);

/** Isolated store instance (for tests). */
export const createESStore = () => createStore<ESState>()(initializer);
