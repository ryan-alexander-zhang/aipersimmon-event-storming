import { describe, expect, it } from "vitest";
import { DSL_VERSION, type Model, modelSchema } from "./schema";

function validModel(): unknown {
  return {
    version: DSL_VERSION,
    meta: { name: "Order flow", level: "process", createdAt: "2026-07-20T00:00:00Z" },
    contexts: [{ id: "ord", name: "Ordering", order: 0 }],
    nodes: [
      { id: "a1", type: "actor", label: "Customer", context: "ord", properties: {} },
      { id: "c1", type: "command", label: "Place Order", context: "ord", properties: {} },
      {
        id: "e1",
        type: "domainEvent",
        label: "Order Placed",
        context: "ord",
        order: 0,
        properties: { pivotal: true, description: "the order exists" },
      },
    ],
    edges: [{ id: "r1", source: "a1", target: "c1", relation: "issues" }],
  };
}

describe("DSL model schema (v2)", () => {
  it("accepts a valid model", () => {
    expect(modelSchema.safeParse(validModel()).success).toBe(true);
  });

  it("defaults missing node properties and contexts", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>>; contexts?: unknown };
    delete model.nodes[0].properties;
    delete model.contexts;
    const parsed = modelSchema.parse(model) as Model;
    expect(parsed.nodes[0].properties).toEqual({});
    expect(parsed.contexts).toEqual([]);
  });

  it("accepts the new updates relation", () => {
    const model = validModel() as { edges: Array<Record<string, unknown>> };
    model.edges.push({ id: "r2", source: "e1", target: "rm1", relation: "updates" });
    expect(modelSchema.safeParse(model).success).toBe(true);
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

  it("accepts a Policy's condition/execution/parameters and a Constraint's rule [us-00026-FR-1/2/3, us-00027-FR-1]", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    model.nodes.push({
      id: "p1",
      type: "policy",
      label: "Re-match on decline",
      context: "ord",
      properties: {
        condition: "retry count < 3",
        execution: "automatic",
        parameters: [{ name: "retry", value: "3" }],
      },
    });
    model.nodes.push({
      id: "k1",
      type: "constraint",
      label: "Credit limit",
      context: "ord",
      properties: { rule: "order.total <= account.creditLimit" },
    });
    expect(modelSchema.safeParse(model).success).toBe(true);
  });

  it("rejects an invalid execution value", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    model.nodes[0].properties = { execution: "eventual" };
    expect(modelSchema.safeParse(model).success).toBe(false);
  });

  it("rejects a parameter entry missing name or value", () => {
    const model = validModel() as { nodes: Array<Record<string, unknown>> };
    model.nodes[0].properties = { parameters: [{ name: "retry" }] };
    expect(modelSchema.safeParse(model).success).toBe(false);
  });
});
