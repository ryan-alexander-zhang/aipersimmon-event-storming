import { beforeEach, describe, expect, it } from "vitest";
import type { StoreApi } from "zustand";
import { createESStore, type ESState } from "./store";

let store: StoreApi<ESState>;
const get = () => store.getState();

beforeEach(() => {
  store = createESStore();
});

describe("store (T3)", () => {
  it("adds a typed node with a default label [us-00001-FR-1]", () => {
    const id = get().addNode("domainEvent", { x: 10, y: 20 });
    const node = get().nodes.find((n) => n.id === id);
    expect(node).toMatchObject({ type: "domainEvent", position: { x: 10, y: 20 } });
    expect(node?.data.label).toBe("Domain Event");
  });

  it("updates only the target node's data [us-00001-FR-2/3]", () => {
    const id = get().addNode("domainEvent", { x: 0, y: 0 });
    const other = get().addNode("command", { x: 5, y: 0 });
    get().updateNodeData(id, { label: "Order Placed", pivotal: true });
    expect(get().nodes.find((n) => n.id === id)?.data).toMatchObject({
      label: "Order Placed",
      pivotal: true,
    });
    expect(get().nodes.find((n) => n.id === other)?.data.label).toBe("Command");
  });

  it("clears selection when the selected node is removed", () => {
    const id = get().addNode("actor", { x: 0, y: 0 });
    get().setSelected(id);
    get().removeNode(id);
    expect(get().selectedId).toBeNull();
  });

  it("removes a node and its attached edges [us-00001-FR-4]", () => {
    const a = get().addNode("actor", { x: 0, y: 0 });
    const c = get().addNode("command", { x: 1, y: 0 });
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    expect(get().edges).toHaveLength(1);

    get().removeNode(c);
    expect(get().nodes.find((n) => n.id === c)).toBeUndefined();
    expect(get().edges).toHaveLength(0);
  });

  it("creates a semantic edge for a valid connection [us-00002-FR-1]", () => {
    const a = get().addNode("actor", { x: 0, y: 0 });
    const c = get().addNode("command", { x: 1, y: 0 });
    const ok = get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    expect(ok).toBe(true);
    expect(get().edges[0]).toMatchObject({ source: a, target: c, data: { relation: "issues" } });
  });

  it("rejects an invalid connection and creates no edge [us-00002-FR-2]", () => {
    const a = get().addNode("actor", { x: 0, y: 0 });
    const e = get().addNode("domainEvent", { x: 1, y: 0 });
    const ok = get().connect({ source: a, target: e, sourceHandle: null, targetHandle: null });
    expect(ok).toBe(false);
    expect(get().edges).toHaveLength(0);
  });

  it("attaches a hotspot via an annotates edge [us-00003-FR-1]", () => {
    const e = get().addNode("domainEvent", { x: 0, y: 0 });
    const h = get().addHotspot(e, { x: 0, y: 50 }, "reserve stock when?");
    const hotspot = get().nodes.find((n) => n.id === h);
    expect(hotspot).toMatchObject({ type: "hotspot", data: { label: "reserve stock when?" } });
    expect(get().edges).toContainEqual(
      expect.objectContaining({ source: h, target: e, data: { relation: "annotates" } }),
    );
  });

  it("applies node and edge changes (React Flow wiring)", () => {
    const a = get().addNode("actor", { x: 0, y: 0 });
    const c = get().addNode("command", { x: 1, y: 0 });
    get().connect({ source: a, target: c, sourceHandle: null, targetHandle: null });
    const edgeId = get().edges[0].id;

    get().onEdgesChange([{ type: "remove", id: edgeId }]);
    expect(get().edges).toHaveLength(0);

    get().onNodesChange([{ type: "remove", id: a }]);
    expect(get().nodes.find((n) => n.id === a)).toBeUndefined();
  });

  it("tracks selection", () => {
    const id = get().addNode("actor", { x: 0, y: 0 });
    get().setSelected(id);
    expect(get().selectedId).toBe(id);
    get().setSelected(null);
    expect(get().selectedId).toBeNull();
  });

  it("rejects degenerate connections (self, missing node, null endpoint)", () => {
    const c = get().addNode("command", { x: 0, y: 0 });
    expect(get().connect({ source: c, target: c, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().connect({ source: "ghost", target: c, sourceHandle: null, targetHandle: null })).toBe(false);
    // React Flow types source as non-null, but guard against a runtime null.
    expect(get().connect({ source: null as unknown as string, target: c, sourceHandle: null, targetHandle: null })).toBe(false);
    expect(get().edges).toHaveLength(0);
  });

  it("replaces state on setModel and resets on clear", () => {
    get().addNode("actor", { x: 0, y: 0 });
    get().setModel({ nodes: [], edges: [] });
    expect(get().nodes).toHaveLength(0);

    get().addNode("command", { x: 0, y: 0 });
    get().clear();
    expect(get().nodes).toHaveLength(0);
    expect(get().edges).toHaveLength(0);
  });
});
