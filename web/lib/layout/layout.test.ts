import { describe, expect, it } from "vitest";
import type { Context } from "@/lib/dsl/schema";
import { bandIndex } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { BAND_H, computeLayout } from "./layout";

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

  it("is deterministic (same model → identical layout)", () => {
    const { nodes, edges } = sliceModel();
    const a = computeLayout(nodes, edges, contexts);
    const b = computeLayout(nodes, edges, contexts);
    expect(a.map((n) => n.position)).toEqual(b.map((n) => n.position));
  });
});
