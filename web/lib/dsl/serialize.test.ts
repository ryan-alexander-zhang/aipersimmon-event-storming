import { describe, expect, it } from "vitest";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { exportJSON, fromModel, importJSON, toModel } from "./serialize";

const META = { name: "Order flow", createdAt: "2026-07-16T00:00:00Z" };

function sampleCanvas(): { nodes: ESNode[]; edges: ESEdge[] } {
  const nodes: ESNode[] = [
    { id: "a1", type: "actor", position: { x: 0, y: 0 }, data: { label: "Customer" } },
    { id: "c1", type: "command", position: { x: 100, y: 0 }, data: { label: "Place Order" } },
    {
      id: "e1",
      type: "domainEvent",
      position: { x: 200, y: 40 },
      data: { label: "Order Placed", pivotal: true, description: "order exists" },
    },
  ];
  const edges: ESEdge[] = [
    { id: "r1", source: "a1", target: "c1", data: { relation: "issues" }, label: "issues" },
  ];
  return { nodes, edges };
}

describe("serialize (T2)", () => {
  it("round-trips canvas -> model -> canvas preserving ids, type, position, data", () => {
    const { nodes, edges } = sampleCanvas();
    const back = fromModel(toModel(nodes, edges, META));

    expect(back.nodes).toEqual(nodes);
    expect(back.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, relation: e.data?.relation }))).toEqual([
      { id: "r1", source: "a1", target: "c1", relation: "issues" },
    ]);
  });

  it("round-trips through JSON (export -> import equals the model) [us-00004-AC-3.1]", () => {
    const { nodes, edges } = sampleCanvas();
    const model = toModel(nodes, edges, META);
    const result = importJSON(exportJSON(nodes, edges, META));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.model).toEqual(model);
  });

  it("stamps the DSL version on export [us-00004-FR-1]", () => {
    const { nodes, edges } = sampleCanvas();
    expect(JSON.parse(exportJSON(nodes, edges, META)).version).toBe("1.0");
  });

  it("rejects malformed JSON with a readable error [spec-00001-XFR-2]", () => {
    const result = importJSON("{ not json ]");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/i);
  });

  it("rejects schema-invalid JSON [spec-00001-XFR-2]", () => {
    const bad = JSON.stringify({
      version: "1.0",
      meta: { name: "x", level: "process", createdAt: "t" },
      nodes: [{ id: "n1", type: "widget", label: "?", position: { x: 0, y: 0 } }],
      edges: [],
    });
    expect(importJSON(bad).ok).toBe(false);
  });

  it("reports a root error when the JSON is not a model object", () => {
    const result = importJSON("42");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/\(root\)/);
  });

  it("rejects an unknown DSL version [spec-00001-XFR-3]", () => {
    const future = JSON.stringify({
      version: "9.9",
      meta: { name: "x", level: "process", createdAt: "t" },
      nodes: [],
      edges: [],
    });
    expect(importJSON(future).ok).toBe(false);
  });
});
