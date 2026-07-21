import { describe, expect, it } from "vitest";
import type { Context } from "@/lib/dsl/schema";
import { bandIndex } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { BAND_H, computeContextBoxes, computeLayout, STACK_H } from "./layout";

const contexts: Context[] = [
  { id: "A", name: "Ordering", order: 0 },
  { id: "B", name: "Payment", order: 1 },
];

// A → issues → command → handledBy → aggregate → emits → event → triggers → policy
//                                                     event → updates → readModel
function sliceModel(): { nodes: ESNode[]; edges: ESEdge[] } {
  const n = (id: string, type: ESNode["type"], ctx: string, order?: number): ESNode => ({
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, context: ctx, ...(order !== undefined ? { order } : {}) },
  });
  const nodes: ESNode[] = [
    n("act", "actor", "A"),
    n("cmd", "command", "A"),
    n("agg", "aggregate", "A"),
    n("ev", "domainEvent", "A", 0),
    n("pol", "policy", "A"),
    n("rm", "readModel", "A"),
    n("hot", "hotspot", "A"),
    n("ev2", "domainEvent", "B", 0),
  ];
  const e = (id: string, s: string, t: string, relation: RelationType): ESEdge => ({
    id,
    source: s,
    target: t,
    data: { relation },
  });
  const edges: ESEdge[] = [
    e("1", "act", "cmd", "issues"),
    e("2", "cmd", "agg", "handledBy"),
    e("3", "agg", "ev", "emits"),
    e("4", "ev", "pol", "triggers"),
    e("5", "ev", "rm", "updates"),
    e("6", "hot", "ev", "annotates"),
  ];
  return { nodes, edges };
}

describe("layout engine (RT2)", () => {
  it("places each element type in its own band (y = bandIndex * BAND_H)", () => {
    const { nodes, edges } = sliceModel();
    const out = computeLayout(nodes, edges, contexts);
    const byId = Object.fromEntries(out.map((n) => [n.id, n]));
    for (const id of ["act", "cmd", "agg", "ev", "pol", "rm", "hot"]) {
      expect(byId[id].position.y).toBe(bandIndex(byId[id].type) * BAND_H);
    }
  });

  it("aligns a whole slice in one column (same x)", () => {
    const { nodes, edges } = sliceModel();
    const out = computeLayout(nodes, edges, contexts);
    const x = Object.fromEntries(out.map((n) => [n.id, n.position.x]));
    for (const id of ["act", "cmd", "agg", "ev", "pol", "rm", "hot"]) {
      expect(x[id]).toBe(x.ev);
    }
  });

  it("places a later context to the right", () => {
    const { nodes, edges } = sliceModel();
    const out = computeLayout(nodes, edges, contexts);
    const x = Object.fromEntries(out.map((n) => [n.id, n.position.x]));
    expect(x.ev2).toBeGreaterThan(x.ev); // context B after context A
  });

  it("orders events within a context left→right by their order", () => {
    const { nodes, edges } = sliceModel();
    nodes.push({
      id: "ev0",
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: "ev0", context: "A", order: -1 },
    });
    const out = computeLayout(nodes, edges, contexts);
    const x = Object.fromEntries(out.map((n) => [n.id, n.position.x]));
    expect(x.ev0).toBeLessThan(x.ev); // order -1 before order 0
  });

  it("stacks concurrent events (same order) in one column, different lanes", () => {
    const ev = (id: string, order: number): ESNode => ({
      id,
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: id, context: "A", order },
    });
    const nodes = [ev("p1", 0), ev("p2", 0), ev("later", 1)];
    const out = computeLayout(nodes, [], contexts);
    const by = Object.fromEntries(out.map((n) => [n.id, n.position]));
    // p1 and p2 are concurrent → same column (x), different lane (y)
    expect(by.p1.x).toBe(by.p2.x);
    expect(by.p1.y).not.toBe(by.p2.y);
    // the order-1 event sits in a later column
    expect(by.later.x).toBeGreaterThan(by.p1.x);
  });

  it("grows the band so concurrent lanes do not overlap the next band (issue-00002)", () => {
    const ev = (id: string, order: number): ESNode => ({
      id,
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: id, context: "A", order },
    });
    const pol = (id: string): ESNode => ({
      id,
      type: "policy",
      position: { x: 0, y: 0 },
      data: { label: id, context: "A" },
    });
    // three concurrent events (order 0), each triggering its own policy
    const nodes = [ev("e0", 0), ev("e1", 0), ev("e2", 0), pol("p0"), pol("p1"), pol("p2")];
    const e = (id: string, s: string, t: string): ESEdge => ({
      id,
      source: s,
      target: t,
      data: { relation: "triggers" },
    });
    const edges = [e("t0", "e0", "p0"), e("t1", "e1", "p1"), e("t2", "e2", "p2")];
    const out = computeLayout(nodes, edges, contexts);
    const y = Object.fromEntries(out.map((n) => [n.id, n.position.y]));
    const lowestEvent = Math.max(y.e0, y.e1, y.e2);
    const highestPolicy = Math.min(y.p0, y.p1, y.p2);
    // the lowest event sticky must clear a full sub-row before the policy band
    expect(lowestEvent + STACK_H).toBeLessThanOrEqual(highestPolicy);
  });

  it("handles nodes missing order/context and unattached hotspots without throwing", () => {
    const n = (id: string, type: ESNode["type"], ctx?: string, order?: number): ESNode => ({
      id,
      type,
      position: { x: 0, y: 0 },
      data: {
        label: id,
        ...(ctx ? { context: ctx } : {}),
        ...(order !== undefined ? { order } : {}),
      },
    });
    const out = computeLayout(
      [
        n("e", "domainEvent", "A"), // event with no order
        n("h", "hotspot", "A"), // hotspot with no annotates target
        n("orphan", "actor"), // node with no context
      ],
      [],
      contexts,
    );
    expect(out).toHaveLength(3);
    expect(out.every((x) => Number.isFinite(x.position.x) && Number.isFinite(x.position.y))).toBe(true);
  });

  it("tiles unrelated same-type free nodes side by side, not stacked [issue-00007]", () => {
    const actor = (id: string): ESNode => ({
      id,
      type: "actor",
      position: { x: 0, y: 0 },
      data: { label: id, context: "A" },
    });
    const out = computeLayout([actor("a1"), actor("a2")], [], contexts);
    const xs = out.map((n) => n.position.x);
    const ys = out.map((n) => n.position.y);
    // free (unconnected) nodes have no timeline slot and are not concurrent:
    // distinct columns, one shared band row — never stacked (issue-00007).
    expect(xs[0]).not.toBe(xs[1]);
    expect(ys[0]).toBe(ys[1]);
  });

  it("reserves a column box per context, including empty ones", () => {
    const one: ESNode = {
      id: "ev",
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: "ev", context: "A", order: 0 },
    };
    const boxes = computeContextBoxes([one], [], contexts); // context B has no nodes
    const a = boxes.find((b) => b.id === "A");
    const b = boxes.find((b) => b.id === "B");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(b!.x).toBeGreaterThan(a!.x); // empty B still sits after A
    expect(a!.width).toBeGreaterThan(0);
  });

  it("is deterministic (same model → identical layout)", () => {
    const { nodes, edges } = sliceModel();
    const a = computeLayout(nodes, edges, contexts);
    const b = computeLayout(nodes, edges, contexts);
    expect(a.map((n) => n.position)).toEqual(b.map((n) => n.position));
  });
});
