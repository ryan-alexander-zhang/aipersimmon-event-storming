import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { BAND_H } from "@/lib/layout/layout";
import { createESStore, type ESState } from "./store";
import { gapOrder, slotOrders } from "./timeline";

let store: StoreApi<ESState>;
const get = () => store.getState();
const node = (id: string) => get().nodes.find((n) => n.id === id);

beforeEach(() => {
  store = createESStore();
});

describe("store v2 (RT3)", () => {
  it("adds a bounded context with an incrementing order [us-00006-FR-1]", () => {
    const a = get().addContext("Ordering");
    const b = get().addContext("Payment");
    expect(get().contexts).toEqual([
      { id: a, name: "Ordering", order: 0 },
      { id: b, name: "Payment", order: 1 },
    ]);
  });

  it("adds a typed node into a context with a default label [us-00001-FR-1]", () => {
    const ctx = get().addContext("Ordering");
    const id = get().addNode("command", ctx);
    expect(node(id)).toMatchObject({ type: "command", data: { context: ctx, label: "Command" } });
  });

  it("assigns Domain Events an incrementing timeline order [us-00006-FR-2]", () => {
    const ctx = get().addContext("Ordering");
    const e0 = get().addNode("domainEvent", ctx);
    const e1 = get().addNode("domainEvent", ctx);
    expect(node(e0)?.data.order).toBe(0);
    expect(node(e1)?.data.order).toBe(1);
  });

  it("adds an Ungrouped node when no context is given, with its own timeline [issue-00006]", () => {
    const e0 = get().addNode("domainEvent");
    const e1 = get().addNode("domainEvent");
    expect(node(e0)?.data.context).toBeUndefined();
    expect(node(e0)?.data.order).toBe(0);
    expect(node(e1)?.data.order).toBe(1); // ungrouped events share one timeline
  });

  it("reassigning to an empty context returns a node to Ungrouped [issue-00006]", () => {
    const ctx = get().addContext("c");
    const e = get().addNode("domainEvent", ctx);
    expect(node(e)?.data.context).toBe(ctx);
    get().reassignContext(e, "");
    expect(node(e)?.data.context).toBeUndefined();
  });

  it("creates a semantic edge for a valid connection [us-00002-FR-1]", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    expect(get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null })).toBe(true);
    expect(get().edges[0]).toMatchObject({ source: a, target: c, data: { relation: "issues" } });
  });

  it("links a Command directly to the Domain Event it produces [decision-00003]", () => {
    const ctx = get().addContext("c");
    const cmd = get().addNode("command", ctx);
    const e = get().addNode("domainEvent", ctx);
    expect(get().connect({ source: cmd, target: e, sourceHandle: null, targetHandle: null })).toBe(true);
    expect(get().edges[0].data?.relation).toBe("produces");
  });

  it("links a Command to a Constraint that restricts it [decision-00003]", () => {
    const ctx = get().addContext("c");
    const cmd = get().addNode("command", ctx);
    const k = get().addNode("constraint", ctx);
    get().connect({ source: cmd, target: k, sourceHandle: null, targetHandle: null });
    expect(get().edges[0].data?.relation).toBe("constrainedBy");
  });

  it("creates an updates edge for Domain Event -> Read Model [us-00007-FR-2]", () => {
    const ctx = get().addContext("c");
    const e = get().addNode("domainEvent", ctx);
    const rm = get().addNode("readModel", ctx);
    get().connect({ source: e, target: rm, sourceHandle: null, targetHandle: null });
    expect(get().edges[0].data?.relation).toBe("updates");
  });

  it("rejects an invalid connection [us-00002-FR-2]", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const e = get().addNode("domainEvent", ctx);
    expect(get().connect({ source: a, target: e, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().edges).toHaveLength(0);
  });

  it("attaches a hotspot via an annotates edge, inheriting context [us-00003-FR-1]", () => {
    const ctx = get().addContext("c");
    const e = get().addNode("domainEvent", ctx);
    const h = get().addHotspot(e, "reserve when?");
    expect(node(h)).toMatchObject({ type: "hotspot", data: { context: ctx, label: "reserve when?" } });
    expect(get().edges).toContainEqual(
      expect.objectContaining({ source: h, target: e, data: { relation: "annotates" } }),
    );
  });

  it("attaches an opportunity via a highlights edge, inheriting context [us-00013-AC-1.1]", () => {
    const ctx = get().addContext("c");
    const e = get().addNode("domainEvent", ctx);
    const o = get().addOpportunity(e, "batch discounts?");
    expect(node(o)).toMatchObject({
      type: "opportunity",
      data: { context: ctx, label: "batch discounts?" },
    });
    expect(get().edges).toContainEqual(
      expect.objectContaining({ source: o, target: e, data: { relation: "highlights" } }),
    );
  });

  it("removes a node and its attached edges [us-00001-FR-4]", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    get().removeNode(c);
    expect(node(c)).toBeUndefined();
    expect(get().edges).toHaveLength(0);
  });

  it("tiles free (unconnected) same-band nodes horizontally, not stacked [issue-00007]", () => {
    const a0 = get().addNode("actor");
    const a1 = get().addNode("actor");
    const a2 = get().addNode("actor");
    const xs = [a0, a1, a2].map((id) => node(id)!.position.x);
    const ys = [a0, a1, a2].map((id) => node(id)!.position.y);
    // free actors are not concurrent: they spread along the band (distinct x),
    // and share the one Actors/Systems row (same y), never stacked vertically.
    expect(new Set(xs).size).toBe(3);
    expect(new Set(ys).size).toBe(1);
  });

  it("aligns free nodes to their own band's first columns, not after other bands [issue-00007]", () => {
    const e0 = get().addNode("domainEvent");
    const e1 = get().addNode("domainEvent");
    const a0 = get().addNode("actor");
    const a1 = get().addNode("actor");
    // Actors are a different band (row) than Domain Events, so they never collide;
    // free Actors should tile from their band's column 0 (above the events), not be
    // pushed to the right past the events.
    expect(node(a0)!.position.x).toBe(node(e0)!.position.x);
    expect(node(a1)!.position.x).toBe(node(e1)!.position.x);
  });

  it("connecting one free node to an event keeps the others compact, not shifted right [issue-00008]", () => {
    const c0 = get().addNode("command");
    const c1 = get().addNode("command");
    const c2 = get().addNode("command");
    const e0 = get().addNode("domainEvent");
    const e1 = get().addNode("domainEvent");
    const e2 = get().addNode("domainEvent");
    get().connect({ source: c0, target: e2, sourceHandle: null, targetHandle: null }); // produces
    const cmdXs = [c0, c1, c2].map((id) => node(id)!.position.x).sort((a, b) => a - b);
    const evtXs = [e0, e1, e2].map((id) => node(id)!.position.x).sort((a, b) => a - b);
    // the connected command aligns above its event; the free ones fill the empty
    // low columns — so the band spans the same columns as the events, not beyond.
    expect(cmdXs).toEqual(evtXs);
  });

  it("reassigns a node's context [us-00006-FR-4]", () => {
    const c1 = get().addContext("c1");
    const c2 = get().addContext("c2");
    const e = get().addNode("domainEvent", c1);
    get().reassignContext(e, c2);
    expect(node(e)?.data.context).toBe(c2);
  });

  it("lays out a slice into bands (command above its event, same column) [us-00007-FR-3]", () => {
    const ctx = get().addContext("c");
    const c = get().addNode("command", ctx);
    const ag = get().addNode("aggregate", ctx);
    const e = get().addNode("domainEvent", ctx);
    get().connect({ source: c, target: ag, sourceHandle: null, targetHandle: null }); // handledBy
    get().connect({ source: ag, target: e, sourceHandle: null, targetHandle: null }); // emits
    // command band (row 1) is above domainEvent band (row 3)
    expect(node(c)!.position.y).toBeLessThan(node(e)!.position.y);
    // same slice → same column (x)
    expect(node(c)!.position.x).toBe(node(e)!.position.x);
  });

  it("rejects degenerate connections (self, missing node, null endpoint)", () => {
    const ctx = get().addContext("c");
    const c = get().addNode("command", ctx);
    expect(get().connect({ source: c, target: c, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().connect({ source: "ghost", target: c, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(
      get().connect({ source: null as unknown as string, target: c, sourceHandle: null, targetHandle: null }),
    ).toBe(false);
    expect(get().edges).toHaveLength(0);
  });

  it("removeContext drops member nodes and their edges", () => {
    const ctx = get().addContext("c");
    const e = get().addNode("domainEvent", ctx);
    const p = get().addNode("policy", ctx);
    get().connect({ source: e, target: p, sourceHandle: null, targetHandle: null });
    expect(get().edges).toHaveLength(1);
    get().removeContext(ctx);
    expect(get().nodes).toHaveLength(0);
    expect(get().edges).toHaveLength(0);
  });

  it("sets the level [us-00008-FR-1]", () => {
    expect(get().level).toBe("design");
    get().setLevel("big-picture");
    expect(get().level).toBe("big-picture");
  });

  it("renames only the target context", () => {
    const c = get().addContext("Old");
    const other = get().addContext("Other");
    get().renameContext(c, "New");
    expect(get().contexts.find((x) => x.id === c)?.name).toBe("New");
    expect(get().contexts.find((x) => x.id === other)?.name).toBe("Other");
  });

  it("clears selection when the selected node is removed", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    get().setSelected(a);
    get().removeNode(a);
    expect(get().selectedId).toBeNull();
  });

  it("reordering an event swaps its timeline column (x) [us-00006-AC-3.1]", () => {
    const ctx = get().addContext("c");
    const e0 = get().addNode("domainEvent", ctx); // order 0
    const e1 = get().addNode("domainEvent", ctx); // order 1
    expect(node(e1)!.position.x).toBeGreaterThan(node(e0)!.position.x);
    get().setEventOrder(e0, 2); // move e0 after e1
    expect(node(e0)!.position.x).toBeGreaterThan(node(e1)!.position.x);
  });

  it("reassigning context moves a node into the other context's column [us-00006-AC-4.1]", () => {
    const a = get().addContext("A");
    const b = get().addContext("B"); // ordered after A → to the right
    const ev = get().addNode("domainEvent", a);
    const before = node(ev)!.position.x;
    get().reassignContext(ev, b);
    expect(node(ev)!.position.x).toBeGreaterThan(before);
  });

  it("replaces state on setModel and resets on clear", () => {
    const ctx = get().addContext("c");
    get().addNode("actor", ctx);
    get().setModel({ nodes: [], edges: [], contexts: [] });
    expect(get().nodes).toHaveLength(0);
    expect(get().contexts).toHaveLength(0);
    get().addNode("command", get().addContext("x"));
    get().clear();
    expect(get().nodes).toHaveLength(0);
    expect(get().edges).toHaveLength(0);
    expect(get().contexts).toHaveLength(0);
  });

  it("tracks the transient hover target and clears it on clear/setModel (RA3)", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    get().setHovered(a);
    expect(get().hoveredId).toBe(a);
    get().clear();
    expect(get().hoveredId).toBeNull();
    const ctx2 = get().addContext("c2");
    get().setHovered(get().addNode("actor", ctx2));
    get().setModel({ nodes: [], edges: [], contexts: [] });
    expect(get().hoveredId).toBeNull();
  });

  it("tracks isolate view state and clears active on clear/setModel (TC2)", () => {
    expect(get().isolate).toEqual({ active: false, direction: "down", depth: 2 });
    get().toggleIsolate();
    expect(get().isolate.active).toBe(true);
    get().setIsolateDirection("up");
    get().setIsolateDepth(3);
    expect(get().isolate).toMatchObject({ active: true, direction: "up", depth: 3 });
    get().setIsolateDepth(0); // clamped to >= 1
    expect(get().isolate.depth).toBe(1);
    get().clear();
    expect(get().isolate.active).toBe(false);
    expect(get().isolate.direction).toBe("up"); // preference kept
  });

  it("toggles the model-health panel visibility [spec-00007]", () => {
    expect(get().healthOpen).toBe(false);
    get().toggleHealth();
    expect(get().healthOpen).toBe(true);
    get().toggleHealth();
    expect(get().healthOpen).toBe(false);
  });

  it("walkthrough steps the timeline read-only: start, step, clamp, stop [us-00014-AC-1.1/2.1/3.1/5.1]", () => {
    const ctx = get().addContext("c");
    const e0 = get().addNode("domainEvent", ctx); // order 0
    const e1 = get().addNode("domainEvent", ctx); // order 1
    const before = JSON.stringify(get().nodes);

    get().startWalkthrough();
    expect(get().walk).toEqual({ active: true, index: 0 });
    expect(get().selectedId).toBe(e0); // first event (AC-1.1)

    get().walkStep(1);
    expect(get().walk.index).toBe(1);
    expect(get().selectedId).toBe(e1); // forward (AC-2.1)

    get().walkStep(1); // clamp at last (AC-3.1)
    expect(get().walk.index).toBe(1);

    get().walkStep(-1);
    expect(get().selectedId).toBe(e0); // backward (AC-2.1)
    get().walkStep(-1); // clamp at first
    expect(get().walk.index).toBe(0);

    get().stopWalkthrough();
    expect(get().walk.active).toBe(false);
    expect(JSON.stringify(get().nodes)).toBe(before); // model unchanged (AC-5.1)
  });

  it("walkthrough on an empty board activates with no selection and no-op steps", () => {
    get().startWalkthrough();
    expect(get().walk.active).toBe(true);
    expect(get().selectedId).toBeNull();
    get().walkStep(1); // no events → no-op, no throw
    expect(get().walk.index).toBe(0);
  });

  it("resets the walkthrough on clear [plan-00010 P1.2]", () => {
    const ctx = get().addContext("c");
    get().addNode("domainEvent", ctx);
    get().addNode("domainEvent", ctx);
    get().startWalkthrough();
    get().walkStep(1);
    expect(get().walk).toEqual({ active: true, index: 1 });
    get().clear();
    expect(get().walk).toEqual({ active: false, index: 0 });
  });

  it("tracks the hovered edge and clears it on clear (HE1)", () => {
    get().setHoveredEdge("e1");
    expect(get().hoveredEdgeId).toBe("e1");
    get().clear();
    expect(get().hoveredEdgeId).toBeNull();
  });

  it("applies node/edge changes and tracks selection", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    get().onEdgesChange([{ type: "remove", id: get().edges[0].id }]);
    expect(get().edges).toHaveLength(0);
    get().setSelected(a);
    expect(get().selectedId).toBe(a);
    get().onNodesChange([{ type: "remove", id: a }]);
    expect(node(a)).toBeUndefined();
  });
});

describe("timeline editing [us-00010]", () => {
  // build n Domain Events in one context; return the context id and their ids
  const events = (n: number) => {
    const ctx = get().addContext("c");
    const ids = Array.from({ length: n }, () => get().addNode("domainEvent", ctx));
    return { ctx, ids };
  };
  const orderOf = (id: string) => node(id)!.data.order;
  // the context's Domain Events, in timeline order, as an id sequence
  const sequence = (ctx: string) =>
    get()
      .nodes.filter((n) => n.type === "domainEvent" && n.data.context === ctx)
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0))
      .map((n) => n.id);

  it("inserts a dragged event into a gap, shifting the rest [us-00010-AC-1.1]", () => {
    const { ctx, ids: [a, b, c] } = events(3);
    // drop C in the gap between A and B (gap index 1)
    get().setEventOrder(c, gapOrder(slotOrders(get().nodes, ctx), 1));
    expect(sequence(ctx)).toEqual([a, c, b]);
  });

  it("moves a dragged event after the last column [us-00010-AC-1.2]", () => {
    const { ctx, ids: [a, b, c] } = events(3);
    get().setEventOrder(a, gapOrder(slotOrders(get().nodes, ctx), 3));
    expect(sequence(ctx)).toEqual([b, c, a]);
  });

  it("makes two events concurrent when one is dropped onto the other [us-00010-AC-2.1]", () => {
    const { ctx, ids: [a, b] } = events(2);
    get().setEventOrder(b, slotOrders(get().nodes, ctx)[0]); // onto A's slot
    expect(orderOf(a)).toBe(orderOf(b)); // one shared slot
    // concurrent → same timeline column (x), different parallel sub-lane (y)
    expect(node(a)!.position.x).toBe(node(b)!.position.x);
    expect(node(a)!.position.y).not.toBe(node(b)!.position.y);
  });

  it("splits a concurrent event back into its own column [us-00010-AC-3.1]", () => {
    const { ctx, ids: [a, b] } = events(2);
    get().setEventOrder(b, slotOrders(get().nodes, ctx)[0]); // concurrent with A
    expect(orderOf(a)).toBe(orderOf(b));
    // drag B into the gap after the (now single) column
    get().setEventOrder(b, gapOrder(slotOrders(get().nodes, ctx), 1));
    expect(orderOf(a)).not.toBe(orderOf(b));
    expect(sequence(ctx)).toEqual([a, b]);
  });

  it("moves an event to the start of its context [us-00010-AC-4.1]", () => {
    const { ctx, ids: [a, b, c] } = events(3);
    get().moveEventToEnd(c, -1);
    expect(sequence(ctx)).toEqual([c, a, b]);
  });

  it("nudges a selected event one column toward the start [us-00010-AC-5.1]", () => {
    const { ctx, ids: [a, b, c] } = events(3);
    get().nudgeEvent(b, -1);
    expect(sequence(ctx)).toEqual([b, a, c]);
  });

  it("leaves no empty column: an adjustment normalizes a gapped context [us-00010-AC-8.1]", () => {
    const { ids: [a, b, c] } = events(3);
    get().removeNode(b); // A at order 0, C at order 2 → a gap at slot 1
    get().setEventOrder(c, 2); // any adjustment re-normalizes the context
    expect([orderOf(a), orderOf(c)].sort((x, y) => (x ?? 0) - (y ?? 0))).toEqual([0, 1]);
  });

  it("ignores timeline moves on non-events [us-00010 scope]", () => {
    const ctx = get().addContext("c");
    const cmd = get().addNode("command", ctx);
    get().setEventOrder(cmd, 3);
    get().nudgeEvent(cmd, 1);
    expect(node(cmd)?.data.order).toBeUndefined();
  });

  it("relayouts to collapse hidden bands when the Level changes [issue-00009]", () => {
    const ctx = get().addContext("Ordering");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    const e = get().addNode("domainEvent", ctx);
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null }); // issues
    get().connect({ source: c, target: e, sourceHandle: null, targetHandle: null }); // produces
    // Design (default): Command/Constraint/Aggregate bands sit between the Actor
    // band and the Domain Event band, so its event is 4 band-steps below it.
    expect(node(e)!.position.y - node(a)!.position.y).toBe(4 * BAND_H);
    // Big Picture hides those three bands; the layout must reflow so the visible
    // Domain Event band collapses up to sit one step below the Actor band.
    get().setLevel("big-picture");
    expect(node(e)!.position.y - node(a)!.position.y).toBe(BAND_H);
  });
});
