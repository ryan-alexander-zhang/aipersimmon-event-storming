import { describe, expect, it } from "vitest";
import { DSL_VERSION, type Model, modelSchema } from "./schema";

function validModel(): unknown {
  return {
    version: DSL_VERSION,
    meta: { name: "Order flow", level: "process", createdAt: "2026-07-16T00:00:00Z" },
    nodes: [
      { id: "a1", type: "actor", label: "Customer", position: { x: 0, y: 0 }, properties: {} },
      { id: "c1", type: "command", label: "Place Order", position: { x: 100, y: 0 }, properties: {} },
      {
        id: "e1",
        type: "domainEvent",
        label: "Order Placed",
        position: { x: 200, y: 0 },
        properties: { pivotal: true, description: "the order exists" },
      },
    ],
    edges: [{ id: "r1", source: "a1", target: "c1", relation: "issues" }],
  };
}

describe("DSL model schema", () => {
  it("accepts a valid model", () => {
    const result = modelSchema.safeParse(validModel());
    expect(result.success).toBe(true);
  });

  it("defaults missing node properties to an empty object", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    delete model.nodes[0].properties;
    const parsed = modelSchema.parse(model) as Model;
    expect(parsed.nodes[0].properties).toEqual({});
  });

  it("rejects an unknown element type", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    model.nodes[0].type = "widget";
    expect(modelSchema.safeParse(model).success).toBe(false);
  });

  it("rejects an unknown relation", () => {
    const model = validModel() as { edges: Array<Record<string, unknown>> };
    model.edges[0].relation = "links";
    expect(modelSchema.safeParse(model).success).toBe(false);
  });

  it("rejects an unknown DSL version (spec-00001-XFR-3)", () => {
    const model = validModel() as { version: string };
    model.version = "9.9";
    expect(modelSchema.safeParse(model).success).toBe(false);
  });

  it("rejects a node with an empty id", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    model.nodes[0].id = "";
    expect(modelSchema.safeParse(model).success).toBe(false);
  });
});
