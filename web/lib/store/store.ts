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
import type { Context, ContextRelationship, Model } from "@/lib/dsl/schema";
import { fromModel, toModel } from "@/lib/dsl/serialize";
import {
  type ContextRelationType,
  DEFAULT_CONTEXT_RELATION,
} from "@/lib/eventstorming/context-relations";
import { ELEMENT_DEFINITIONS, type ElementType } from "@/lib/eventstorming/elements";
import type { Level } from "@/lib/eventstorming/levels";
import { resolveRelation } from "@/lib/eventstorming/relations";
import { computeLayout } from "@/lib/layout/layout";
import { EMPTY_FILTER, type FilterState } from "./filter";
import type { IsolateDirection } from "./focus";
import type { ProjectRecord, ProjectSource } from "./projects";
import { eventSlotIndex, gapOrder, normalizeOrders, slotOrders, timelineOrder } from "./timeline";
import type { ESEdge, ESNode, ESNodeData } from "./types";

/** What an isolate view is framed on: the element selected when Isolate was
 *  switched on, or a whole Bounded Context. */
export interface IsolateAnchor {
  kind: "element" | "context";
  id: string;
}

/** Isolate ("focus mode") view state: hide everything outside the anchor's slice —
 *  an element's `depth`-hop neighbourhood in `direction`, or a context's members
 *  and what they are directly related to. The anchor is **pinned** when Isolate is
 *  switched on, so selecting another element inside the view reads it without
 *  re-framing the view. `direction`/`depth` apply to an element anchor only. */
export interface IsolateState {
  active: boolean;
  direction: IsolateDirection;
  depth: number;
  anchor: IsolateAnchor | null;
}

/** How far the walkthrough's Reading Scope can be widened, in hops around the
 *  Current Step (us-00029-FR-4). One hop is the event's own slice; past that the
 *  reading reaches into the neighbouring events' slices, which is context rather
 *  than a wider slice, so the range is deliberately short. */
export const WALK_SCOPE_MAX = 3;

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

/** A named snapshot of the model (spec-00008 FR10): a full DSL Model captured at a
 *  point in time. Persisted outside the model DSL under its own key
 *  (decision-00008); never part of the current model's export. */
export interface Snapshot {
  id: string;
  name: string;
  createdAt: string;
  model: Model;
}

/** The open Project's identity (spec-00012). Its content is the store's own
 *  nodes/edges/discovery/snapshots; only what identifies and tracks the Project
 *  lives here. */
export interface ActiveProject {
  id: string;
  name: string;
  createdAt: string;
  lastOpenedAt: string;
  source?: ProjectSource;
  dirty: boolean;
  /** Bumped whenever the Model is loaded from the source file. Autosave watches it
   *  to tell a load apart from an edit — without it, importing a file would count
   *  as a change *against* that same file. */
  syncToken: number;
}

/** Side-by-side compare (spec-00008 FR10): which two snapshots and whether the
 *  read-only compare view is open. View-only, never persisted. */
export interface CompareState {
  active: boolean;
  leftId: string | null;
  rightId: string | null;
}

export interface ESState {
  nodes: ESNode[];
  edges: ESEdge[];
  contexts: Context[];
  /** Typed directed relationships between Bounded Contexts (spec-00004 FR5). */
  contextRelationships: ContextRelationship[];
  level: Level;
  selectedId: string | null;
  /** Transient hover target; drives the focus highlight, never persisted. */
  hoveredId: string | null;
  /** Bounded Context Focus (spec-00010): the focused context's slice stays vivid
   *  and the rest dims. View-only, never persisted. */
  focusedContext: string | null;
  /** Transient hovered edge; drives edge-hover isolation, never persisted. */
  hoveredEdgeId: string | null;
  /** Clicked (selected) edge; a sticky highlight and the Delete-key target
   *  (us-00025-FR-3/FR-4). View-only, never persisted. */
  selectedEdgeId: string | null;
  /** Isolate/focus mode; view-only, never persisted. */
  isolate: IsolateState;
  /** Model-health panel visibility (spec-00007); view-only, never persisted. */
  healthOpen: boolean;
  /** Narrative walkthrough cursor and its Reading Scope — how many hops around the
   *  Current Step stay visible (us-00029). View-only, never persisted. */
  walk: { active: boolean; index: number; scope: number };
  /** Discovery Mode wall (spec-00002); transient, persisted outside the DSL. */
  discovery: DiscoveryState;
  /** Search + filter view state (spec-00006); view-only, never persisted. */
  filter: FilterState;
  /** Context Map view visibility (spec-00004 FR5); view-only, never persisted. */
  contextMapOpen: boolean;
  /** Named model snapshots (spec-00008 FR10); persisted on the active Project,
   *  outside the model DSL (decision-00008, narrowed by decision-00011). */
  snapshots: Snapshot[];
  /** Versions panel visibility (spec-00008); view-only, never persisted. */
  versionsOpen: boolean;
  /** Side-by-side compare view (spec-00008 FR10); view-only, never persisted. */
  compare: CompareState;
  /** The open Project (spec-00012). Null means no board: the Modeler has to create
   *  or open one first (us-00030-FR-5). */
  activeProject: ActiveProject | null;
  /** Why the last autosave did not land, or null. Surfaced rather than swallowed
   *  (us-00032-FR-5); view-only. */
  saveError: string | null;
  /** Recent visibility. Forced open whenever no Project is active — with no board
   *  there is nothing else to show (us-00030-FR-5). View-only. */
  projectsOpen: boolean;

  setLevel: (level: Level) => void;
  toggleIsolate: () => void;
  isolateContext: (contextId: string) => void;
  setIsolateDirection: (direction: IsolateDirection) => void;
  setIsolateDepth: (depth: number) => void;
  toggleHealth: () => void;
  /** Start the walkthrough at the first Domain Event in timeline order. */
  startWalkthrough: () => void;
  /** Move the walkthrough cursor one step (clamped), selecting that event. */
  walkStep: (dir: -1 | 1) => void;
  /** Set the Reading Scope, clamped to 1..WALK_SCOPE_MAX hops (us-00029-FR-4). */
  setWalkScope: (scope: number) => void;
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

  /** Set the free-text search query (spec-00006). */
  setFilterQuery: (query: string) => void;
  /** Toggle an element type in the type filter (empty set = all types). */
  toggleFilterType: (type: ElementType) => void;
  /** Toggle a Bounded Context in the context filter (`null` = Ungrouped). */
  toggleFilterContext: (context: string | null) => void;
  /** Reset search + filters to show everything. */
  clearFilter: () => void;

  onNodesChange: (changes: NodeChange<ESNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<ESEdge>[]) => void;

  /** Add a bounded context; returns its id. */
  addContext: (name: string) => string;
  renameContext: (id: string, name: string) => void;
  /** Set (or clear, with undefined) a Bounded Context's subdomain classification. */
  setContextClassification: (
    id: string,
    classification: "core" | "supporting" | "generic" | undefined,
  ) => void;
  /** Add a directed relationship source→target (default Customer/Supplier); returns its id. */
  addContextRelationship: (source: string, target: string) => string;
  /** Change a context relationship's type. */
  setContextRelationshipType: (id: string, type: ContextRelationType) => void;
  /** Remove a context relationship. */
  removeContextRelationship: (id: string) => void;
  /** Toggle the Context Map view. */
  toggleContextMap: () => void;
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
  /** Remove a relation edge, leaving its endpoint elements in place (us-00025-FR-1). */
  removeEdge: (id: string) => void;
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

  /** Capture the current model as a named snapshot; returns its id. Reads state
   *  only — the live model is not mutated. */
  captureSnapshot: (name: string) => string;
  /** Rename a snapshot. */
  renameSnapshot: (id: string, name: string) => void;
  /** Delete a snapshot; also clears it from the compare selection. */
  deleteSnapshot: (id: string) => void;
  /** Replace the live model with a copy of a snapshot's model (confirm in the UI). */
  restoreSnapshot: (id: string) => void;
  /** Toggle the Versions panel. */
  toggleVersions: () => void;
  /** Choose the snapshot shown on one side of the compare view. */
  setCompareSide: (side: "left" | "right", id: string) => void;
  /** Open the compare view (no-op unless both sides are chosen). */
  openCompare: () => void;
  /** Close the compare view. */
  closeCompare: () => void;

  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  /** Select (highlight) an edge, or clear with null (us-00025-FR-3). */
  setSelectedEdge: (id: string | null) => void;
  /** Focus a Bounded Context (single-select); passing the current id or null
   *  clears focus. */
  setFocusedContext: (id: string | null) => void;
  setModel: (model: {
    nodes: ESNode[];
    edges: ESEdge[];
    contexts: Context[];
    contextRelationships?: ContextRelationship[];
    level?: Level;
  }) => void;
  clear: () => void;

  /** Make a Project active: its Model, discovery wall, and Snapshots replace
   *  whatever the previous Project had (us-00032-FR-2). */
  openProject: (record: ProjectRecord) => void;
  closeProject: () => void;
  /** The Model changed since it was last loaded from the Project's source file
   *  (us-00031-FR-4). Set by autosave, not by each mutating action. */
  markDirty: () => void;
  /** Record that the Model now matches the source file — on import and refresh. */
  markSynced: (source?: ProjectSource) => void;
  setSaveError: (message: string | null) => void;
  openProjects: () => void;
  closeProjects: () => void;
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
  contextRelationships: [],
  level: "design",
  selectedId: null,
  hoveredId: null,
  focusedContext: null,
  hoveredEdgeId: null,
  selectedEdgeId: null,
  isolate: { active: false, direction: "down", depth: 2, anchor: null },
  healthOpen: false,
  walk: { active: false, index: 0, scope: 1 },
  discovery: { active: false, items: [] },
  filter: EMPTY_FILTER,
  contextMapOpen: false,
  snapshots: [],
  versionsOpen: false,
  compare: { active: false, leftId: null, rightId: null },
  activeProject: null,
  saveError: null,
  projectsOpen: false,

  setLevel: (level) =>
    set({
      level,
      nodes: laidOut(get().nodes, get().edges, get().contexts, level),
      // Discovery is Big-Picture only; leaving that level exits the mode but
      // keeps the wall's items for re-entry (spec-00002 §5).
      discovery:
        level === "big-picture" ? get().discovery : { ...get().discovery, active: false },
    }),
  toggleIsolate: () => {
    const on = !get().isolate.active;
    // Switching on pins the current selection as the anchor; switching off releases it.
    const selectedId = get().selectedId;
    const anchor: IsolateAnchor | null =
      on && selectedId ? { kind: "element", id: selectedId } : null;
    set({ isolate: { ...get().isolate, active: on, anchor } });
  },
  // Isolating a whole Bounded Context: the same view, anchored on the context
  // instead of an element (its `⋯` menu is the entry point).
  isolateContext: (contextId) =>
    set({ isolate: { ...get().isolate, active: true, anchor: { kind: "context", id: contextId } } }),
  setIsolateDirection: (direction) => set({ isolate: { ...get().isolate, direction } }),
  setIsolateDepth: (depth) => set({ isolate: { ...get().isolate, depth: Math.max(1, depth) } }),
  // Health and Versions dock into the same column, so opening one closes the other.
  toggleHealth: () => set({ healthOpen: !get().healthOpen, versionsOpen: false }),

  // A walkthrough carries its own Reading Scope (us-00029), so it never shares a
  // board with Isolate — two independent pointers into one board is what made a step
  // land on an event the isolated board had hidden (issue-00031). Starting one leaves
  // Isolate; the editor and the panel keep it unavailable until the walk ends.
  startWalkthrough: () => {
    const order = timelineOrder(get().nodes);
    set({
      walk: { ...get().walk, active: true, index: 0 },
      selectedId: order[0] ?? null,
      isolate: { ...get().isolate, active: false, anchor: null },
    });
  },
  walkStep: (dir) => {
    const order = timelineOrder(get().nodes);
    if (order.length === 0) return;
    const index = Math.min(order.length - 1, Math.max(0, get().walk.index + dir));
    set({ walk: { ...get().walk, index }, selectedId: order[index] });
  },
  setWalkScope: (scope) =>
    set({ walk: { ...get().walk, scope: Math.min(WALK_SCOPE_MAX, Math.max(1, scope)) } }),
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

  setFilterQuery: (query) => set({ filter: { ...get().filter, query } }),
  toggleFilterType: (type) => {
    const types = new Set(get().filter.types);
    if (types.has(type)) types.delete(type);
    else types.add(type);
    set({ filter: { ...get().filter, types } });
  },
  toggleFilterContext: (context) => {
    const contexts = new Set(get().filter.contexts);
    if (contexts.has(context)) contexts.delete(context);
    else contexts.add(context);
    set({ filter: { ...get().filter, contexts } });
  },
  clearFilter: () => set({ filter: { query: "", types: new Set(), contexts: new Set() } }),

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

  setContextClassification: (id, classification) =>
    set({ contexts: get().contexts.map((c) => (c.id === id ? { ...c, classification } : c)) }),

  addContextRelationship: (source, target) => {
    const id = nanoid();
    set({
      contextRelationships: [
        ...get().contextRelationships,
        { id, source, target, type: DEFAULT_CONTEXT_RELATION },
      ],
    });
    return id;
  },
  setContextRelationshipType: (id, type) =>
    set({
      contextRelationships: get().contextRelationships.map((r) =>
        r.id === id ? { ...r, type } : r,
      ),
    }),
  removeContextRelationship: (id) =>
    set({ contextRelationships: get().contextRelationships.filter((r) => r.id !== id) }),
  // `hoveredEdgeId` is shared by both surfaces' edge-hover isolation, so clear it
  // on the swap — a hovered relationship id must not leak into the board's.
  toggleContextMap: () => set({ contextMapOpen: !get().contextMapOpen, hoveredEdgeId: null }),

  removeContext: (id) => {
    const nodes = get().nodes.filter((n) => n.data.context !== id);
    const keep = new Set(nodes.map((n) => n.id));
    const edges = get().edges.filter((e) => keep.has(e.source) && keep.has(e.target));
    const contexts = get().contexts.filter((c) => c.id !== id);
    // Prune any relationship touching the removed context (us-00020-AC-5.1).
    const contextRelationships = get().contextRelationships.filter(
      (r) => r.source !== id && r.target !== id,
    );
    set({
      nodes: laidOut(nodes, edges, contexts, get().level),
      edges,
      contexts,
      contextRelationships,
      selectedId: null,
      focusedContext: get().focusedContext === id ? null : get().focusedContext,
    });
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

  removeEdge: (id) =>
    set({
      edges: get().edges.filter((e) => e.id !== id),
      selectedEdgeId: get().selectedEdgeId === id ? null : get().selectedEdgeId,
      // Deleting from the hover-revealed control unmounts the label without a
      // mouseleave, so drop the hover here too — a hovered id that outlives its
      // edge dims every remaining edge with none emphasised (issue-00018).
      hoveredEdgeId: get().hoveredEdgeId === id ? null : get().hoveredEdgeId,
    }),

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

  captureSnapshot: (name) => {
    const id = nanoid();
    const model = toModel(get().nodes, get().edges, get().contexts, {
      name: "Event Storming",
      createdAt: new Date().toISOString(),
      level: get().level,
    }, get().contextRelationships);
    set({ snapshots: [...get().snapshots, { id, name, createdAt: model.meta.createdAt, model }] });
    return id;
  },
  renameSnapshot: (id, name) =>
    set({ snapshots: get().snapshots.map((s) => (s.id === id ? { ...s, name } : s)) }),
  deleteSnapshot: (id) => {
    const compare = get().compare;
    const leftId = compare.leftId === id ? null : compare.leftId;
    const rightId = compare.rightId === id ? null : compare.rightId;
    set({
      snapshots: get().snapshots.filter((s) => s.id !== id),
      compare: {
        leftId,
        rightId,
        active: compare.active && leftId !== null && rightId !== null,
      },
    });
  },
  restoreSnapshot: (id) => {
    const snap = get().snapshots.find((s) => s.id === id);
    if (snap) get().setModel(fromModel(snap.model));
  },
  toggleVersions: () => set({ versionsOpen: !get().versionsOpen, healthOpen: false }),
  setCompareSide: (side, id) =>
    set({ compare: { ...get().compare, [side === "left" ? "leftId" : "rightId"]: id } }),
  openCompare: () => {
    const { leftId, rightId } = get().compare;
    if (leftId && rightId) set({ compare: { ...get().compare, active: true } });
  },
  closeCompare: () => set({ compare: { ...get().compare, active: false } }),

  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),
  setSelectedEdge: (id) => set({ selectedEdgeId: id }),
  setFocusedContext: (id) => set({ focusedContext: id === get().focusedContext ? null : id }),
  setModel: ({ nodes, edges, contexts, contextRelationships, level }) =>
    set({
      nodes: laidOut(nodes, edges, contexts, level ?? get().level),
      edges,
      contexts,
      contextRelationships: contextRelationships ?? [],
      level: level ?? get().level,
      selectedId: null,
      hoveredId: null,
      focusedContext: null,
      hoveredEdgeId: null,
      selectedEdgeId: null,
      isolate: { ...get().isolate, active: false, anchor: null },
      walk: { active: false, index: 0, scope: 1 },
      discovery: { active: false, items: [] },
      filter: { query: "", types: new Set(), contexts: new Set() },
      contextMapOpen: false,
      // Snapshots are model-scoped but survive a model swap (import/restore); only
      // the compare/versions view flags reset here (decision-00008).
      versionsOpen: false,
      compare: { active: false, leftId: null, rightId: null },
    }),
  clear: () =>
    set({
      nodes: [],
      edges: [],
      contexts: [],
      contextRelationships: [],
      selectedId: null,
      hoveredId: null,
      focusedContext: null,
      hoveredEdgeId: null,
      selectedEdgeId: null,
      isolate: { ...get().isolate, active: false, anchor: null },
      walk: { active: false, index: 0, scope: 1 },
      discovery: { active: false, items: [] },
      filter: { query: "", types: new Set(), contexts: new Set() },
      contextMapOpen: false,
      // "New model" discards the model and its snapshots (decision-00008).
      snapshots: [],
      versionsOpen: false,
      compare: { active: false, leftId: null, rightId: null },
    }),

  // Everything a Project owns moves together: setModel already resets the view and
  // the discovery wall, so only the wall's items, the Snapshots, and the Project's
  // identity are layered on top. Nothing of the previous Project survives
  // (us-00032-FR-2) — the decision-00008 §4 carry-over is gone.
  openProject: (record) => {
    get().setModel(fromModel(record.model));
    set({
      discovery: { active: false, items: record.discovery },
      snapshots: record.snapshots,
      saveError: null,
      projectsOpen: false,
      activeProject: {
        id: record.id,
        name: record.name,
        createdAt: record.createdAt,
        lastOpenedAt: record.lastOpenedAt,
        ...(record.source ? { source: record.source } : {}),
        dirty: record.dirty,
        syncToken: 0,
      },
    });
  },
  closeProject: () => {
    get().clear();
    set({ activeProject: null, saveError: null });
  },
  markDirty: () => {
    const project = get().activeProject;
    if (!project || project.dirty) return;
    set({ activeProject: { ...project, dirty: true } });
  },
  markSynced: (source) => {
    const project = get().activeProject;
    if (!project) return;
    set({
      activeProject: {
        ...project,
        ...(source ? { source } : {}),
        dirty: false,
        syncToken: project.syncToken + 1,
      },
    });
  },
  setSaveError: (message) => set({ saveError: message }),
  openProjects: () => set({ projectsOpen: true }),
  closeProjects: () => set({ projectsOpen: false }),
});

export const useESStore = create<ESState>()(initializer);

/** Isolated store instance (for tests). */
export const createESStore = () => createStore<ESState>()(initializer);
