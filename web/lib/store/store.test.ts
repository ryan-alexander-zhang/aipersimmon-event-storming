import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { createESStore, type ESState } from "./store";

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

  it("creates a semantic edge for a valid connection [us-00002-FR-1]", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    expect(get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null })).toBe(true);
    expect(get().edges[0]).toMatchObject({ source: a, target: c, data: { relation: "issues" } });
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

  it("removes a node and its attached edges [us-00001-FR-4]", () => {
    const ctx = get().addContext("c");
    const a = get().addNode("actor", ctx);
    const c = get().addNode("command", ctx);
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    get().removeNode(c);
    expect(node(c)).toBeUndefined();
    expect(get().edges).toHaveLength(0);
  });

  it("reorders an event and reassigns a node's context [us-00006-FR-3/4]", () => {
    const c1 = get().addContext("c1");
    const c2 = get().addContext("c2");
    const e = get().addNode("domainEvent", c1);
    get().reorderEvent(e, 5);
    expect(node(e)?.data.order).toBe(5);
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
    get().reorderEvent(e0, 2); // move e0 after e1
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
