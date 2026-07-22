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
    n("ev2", "domainEvent", "B", 1),
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

  it("orders events on one global timeline regardless of context [us-00015-AC-1.1]", () => {
    const { nodes, edges } = sliceModel();
    const out = computeLayout(nodes, edges, contexts);
    const x = Object.fromEntries(out.map((n) => [n.id, n.position.x]));
    expect(x.ev2).toBeGreaterThan(x.ev); // ev2 (global order 1) sits after ev (order 0)
  });

  it("places one context's event strictly between two of another [us-00015-AC-1.1]", () => {
    const ev = (id: string, ctx: string, order: number): ESNode => ({
      id,
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: id, context: ctx, order },
    });
    const out = computeLayout([ev("a", "A", 0), ev("b", "B", 1), ev("c", "A", 2)], [], contexts);
    const x = Object.fromEntries(out.map((n) => [n.id, n.position.x]));
    expect(x.a).toBeLessThan(x.b);
    expect(x.b).toBeLessThan(x.c); // b (context B) sits between a and c (context A)
  });

  it("makes events of different contexts at the same order concurrent (one column) [us-00015-AC-4.1]", () => {
    const ev = (id: string, ctx: string, order: number): ESNode => ({
      id,
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: id, context: ctx, order },
    });
    const out = computeLayout([ev("a", "A", 0), ev("b", "B", 0)], [], contexts);
    const by = Object.fromEntries(out.map((n) => [n.id, n.position]));
    expect(by.a.x).toBe(by.b.x); // same global order → same column, across contexts
    expect(by.a.y).not.toBe(by.b.y); // parallel sub-lanes
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

  it("derives a context box from its events' columns; empty contexts collapse to the origin [us-00015-AC-3.1]", () => {
    const ev = (id: string, order: number): ESNode => ({
      id,
      type: "domainEvent",
      position: { x: 0, y: 0 },
      data: { label: id, context: "A", order },
    });
    const boxes = computeContextBoxes([ev("e0", 0), ev("e1", 1)], [], contexts); // B empty
    const a = boxes.find((b) => b.id === "A")!;
    const b = boxes.find((b) => b.id === "B")!;
    expect(a.x).toBe(0); // spans its events' columns 0..1
    expect(a.width).toBeGreaterThan(0);
    expect(b.x).toBeGreaterThan(a.x); // empty context parks after the timeline
  });

  it("collapses bands hidden at a coarse level so visible bands sit adjacent [issue-00009]", () => {
    const { nodes, edges } = sliceModel();
    // Design shows every band, so the Domain Event sits 4 band-steps below the Actor.
    const design = computeLayout(nodes, edges, contexts, "design");
    const dy = Object.fromEntries(design.map((n) => [n.id, n.position.y]));
    expect(dy.ev - dy.act).toBe(bandIndex("domainEvent") * BAND_H);

    // Big Picture hides Command/Constraint/Aggregate; those bands reserve no
    // height, so the Domain Event band collapses to one step below the Actor.
    const bp = computeLayout(nodes, edges, contexts, "big-picture");
    const by = Object.fromEntries(bp.map((n) => [n.id, n.position.y]));
    expect(by.ev - by.act).toBe(BAND_H);
  });

  it("defaults to the full-band (design) layout when no level is given", () => {
    const { nodes, edges } = sliceModel();
    const withDefault = computeLayout(nodes, edges, contexts);
    const explicit = computeLayout(nodes, edges, contexts, "design");
    expect(withDefault.map((n) => n.position)).toEqual(explicit.map((n) => n.position));
  });

  it("is deterministic (same model → identical layout)", () => {
    const { nodes, edges } = sliceModel();
    const a = computeLayout(nodes, edges, contexts);
    const b = computeLayout(nodes, edges, contexts);
    expect(a.map((n) => n.position)).toEqual(b.map((n) => n.position));
  });
});
