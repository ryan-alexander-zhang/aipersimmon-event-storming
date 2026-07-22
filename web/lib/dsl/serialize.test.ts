import { describe, expect, it } from "vitest";
import type { Context } from "@/lib/dsl/schema";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { exportJSON, fromModel, importJSON, toModel } from "./serialize";

const META = { name: "Order flow", createdAt: "2026-07-20T00:00:00Z", level: "design" as const };
const CONTEXTS: Context[] = [{ id: "ord", name: "Ordering", order: 0 }];

function sampleCanvas(): { nodes: ESNode[]; edges: ESEdge[] } {
  const nodes: ESNode[] = [
    { id: "a1", type: "actor", position: { x: 0, y: 0 }, data: { label: "Customer", context: "ord" } },
    {
      id: "c1",
      type: "command",
      position: { x: 40, y: 0 },
      data: { label: "Place Order", context: "ord" },
    },
    {
      id: "e1",
      type: "domainEvent",
      position: { x: 80, y: 0 },
      data: { label: "Order Placed", context: "ord", order: 0, pivotal: true, description: "exists" },
    },
  ];
  const edges: ESEdge[] = [
    { id: "r1", source: "a1", target: "c1", data: { relation: "issues" }, label: "issues" },
  ];
  return { nodes, edges };
}

describe("serialize v2 (T2/RT1)", () => {
  it("round-trips canvas -> model -> canvas preserving context and order, dropping position", () => {
    const { nodes, edges } = sampleCanvas();
    const back = fromModel(toModel(nodes, edges, CONTEXTS, META));
    expect(back.contexts).toEqual(CONTEXTS);
    // data (context/order/label/props) preserved; position is a computed placeholder
    expect(back.nodes.map((n) => ({ id: n.id, type: n.type, data: n.data }))).toEqual(
      nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })),
    );
    expect(back.nodes.every((n) => n.position.x === 0 && n.position.y === 0)).toBe(true);
  });

  it("round-trips hotspot state/kind/priority [us-00012-AC-1.1/2.1]", () => {
    const nodes: ESNode[] = [
      {
        id: "h1",
        type: "hotspot",
        position: { x: 0, y: 0 },
        data: { label: "reserve when?", state: "resolved", kind: "question", priority: "high" },
      },
    ];
    const back = fromModel(toModel(nodes, [], [], META));
    expect(back.nodes[0].data).toMatchObject({
      state: "resolved",
      kind: "question",
      priority: "high",
    });
  });

  it("imports a pre-spec v2.0 file without the new fields [spec-00003-XAC-1.1]", () => {
    const model = {
      version: "2.0",
      meta: { name: "old", level: "design", createdAt: "2026-01-01T00:00:00Z" },
      contexts: [],
      nodes: [{ id: "h1", type: "hotspot", label: "old", properties: {} }],
      edges: [],
    };
    const result = importJSON(JSON.stringify(model));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const back = fromModel(result.model);
      expect(back.nodes[0].data.state).toBeUndefined(); // absent = open, resolved at read time
    }
  });

  it("export omits position and includes contexts + order + level [us-00004]", () => {
    const { nodes, edges } = sampleCanvas();
    const out = JSON.parse(exportJSON(nodes, edges, CONTEXTS, META));
    expect(out.version).toBe("2.0");
    expect(out.contexts).toEqual(CONTEXTS);
    expect(out.meta.level).toBe("design");
    expect(out.nodes[0].position).toBeUndefined();
    expect(out.nodes[2].order).toBe(0);
  });

  it("import round-trips a v2 export equal to the model [us-00004-AC-3.1]", () => {
    const { nodes, edges } = sampleCanvas();
    const model = toModel(nodes, edges, CONTEXTS, META);
    const result = importJSON(exportJSON(nodes, edges, CONTEXTS, META));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.model).toEqual(model);
  });

  it("round-trips a node with no context (global participant)", () => {
    const global: ESNode[] = [
      { id: "g", type: "actor", position: { x: 0, y: 0 }, data: { label: "Global" } },
    ];
    const back = fromModel(toModel(global, [], [], META));
    expect(back.nodes[0].data.context).toBeUndefined();
    const out = JSON.parse(exportJSON(global, [], [], META));
    expect(out.nodes[0].context).toBeUndefined();
  });

  it("migrates a v1 document on import (drops position, default context)", () => {
    const v1 = JSON.stringify({
      version: "1.0",
      meta: { name: "old", level: "process", createdAt: "t" },
      nodes: [
        { id: "e1", type: "domainEvent", label: "E1", position: { x: 200, y: 0 }, properties: {} },
        { id: "e2", type: "domainEvent", label: "E0", position: { x: 10, y: 0 }, properties: {} },
      ],
      edges: [],
    });
    const result = importJSON(v1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.version).toBe("2.0");
      expect(result.model.contexts).toEqual([{ id: "default", name: "Default", order: 0 }]);
      const byId = Object.fromEntries(result.model.nodes.map((n) => [n.id, n]));
      expect(byId.e1.context).toBe("default");
      // order derived from v1 x: e2 (x=10) before e1 (x=200)
      expect(byId.e2.order).toBe(0);
      expect(byId.e1.order).toBe(1);
    }
  });

  it("migrates a v1 doc with a non-event node and missing arrays", () => {
    const v1 = JSON.stringify({
      version: "1.0",
      meta: { name: "x", level: "process", createdAt: "t" },
      nodes: [{ id: "c1", type: "command", label: "C" }], // no position, no edges key
    });
    const result = importJSON(v1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.model.nodes[0].context).toBe("default");
      expect(result.model.nodes[0].order).toBeUndefined(); // non-event carries no order
      expect(result.model.edges).toEqual([]);
    }
  });

  it("passes through non-object input for the schema to reject", () => {
    expect(importJSON("null").ok).toBe(false);
  });

  it("rejects malformed JSON [spec-00001-XFR-2]", () => {
    const r = importJSON("{ not json ]");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not valid JSON/i);
  });

  it("reports a root error when JSON is not a model object", () => {
    const r = importJSON("42");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/\(root\)/);
  });

  it("rejects an unknown DSL version [spec-00001-XFR-3]", () => {
    const r = importJSON(
      JSON.stringify({ version: "9.9", meta: { name: "x", level: "process", createdAt: "t" }, nodes: [], edges: [] }),
    );
    expect(r.ok).toBe(false);
  });
});
