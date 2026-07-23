import { describe, expect, it } from "vitest";
import { diffModels } from "./diff";
import type { Model, ModelEdge, ModelNode } from "./schema";

const node = (id: string, patch: Partial<ModelNode> = {}): ModelNode => ({
  id,
  type: "domainEvent",
  label: id,
  order: 0,
  properties: {},
  ...patch,
});

const model = (nodes: ModelNode[], edges: ModelEdge[] = []): Model => ({
  version: "4.0",
  meta: { name: "m", level: "big-picture", createdAt: "t" },
  contexts: [],
  contextRelationships: [],
  nodes,
  edges,
});

describe("diffModels [us-00023]", () => {
  it("marks a target-only node as added [us-00023-AC-1.1]", () => {
    const base = model([node("a")]);
    const target = model([node("a"), node("b", { order: 1 })]);
    const d = diffModels(base, target);
    expect(d.nodes.get("a")).toBe("unchanged");
    expect(d.nodes.get("b")).toBe("added");
    expect(d.summary).toEqual({ added: 1, removed: 0, changed: 0 });
  });

  it("marks a base-only node as removed [us-00023-AC-2.1]", () => {
    const base = model([node("a"), node("b", { order: 1 })]);
    const target = model([node("a")]);
    const d = diffModels(base, target);
    expect(d.removedNodes.map((n) => n.id)).toEqual(["b"]);
    expect(d.nodes.has("b")).toBe(false); // not on the target board
    expect(d.summary).toEqual({ added: 0, removed: 1, changed: 0 });
  });

  it("marks a renamed (relabelled) kept node as changed, not added/removed [us-00023-AC-1.2]", () => {
    const base = model([node("a", { label: "Order Placed" })]);
    const target = model([node("a", { label: "Order Submitted" })]);
    const d = diffModels(base, target);
    expect(d.nodes.get("a")).toBe("changed");
    expect(d.removedNodes).toHaveLength(0);
    expect(d.summary).toEqual({ added: 0, removed: 0, changed: 1 });
  });

  it("treats a timeline-order change as changed", () => {
    const base = model([node("a", { order: 0 })]);
    const target = model([node("a", { order: 3 })]);
    expect(diffModels(base, target).nodes.get("a")).toBe("changed");
  });

  it("reports identical models as all unchanged with a 0/0/0 summary [us-00023-AC-3.1]", () => {
    const m = model([node("a"), node("b", { order: 1 })], [
      { id: "e1", source: "a", target: "b", relation: "produces" },
    ]);
    const d = diffModels(m, structuredClone(m));
    expect([...d.nodes.values()].every((s) => s === "unchanged")).toBe(true);
    expect(d.edges.get("e1")).toBe("unchanged");
    expect(d.summary).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("records field-level detail for a changed node [us-00023-FR-8]", () => {
    const base = model([node("a", { label: "测试3", order: 0, context: "ord" })]);
    const target = model([node("a", { label: "测试3修改了", order: 2, context: "pay" })]);
    const c = diffModels(base, target).changed.get("a");
    expect(c?.before.label).toBe("测试3");
    expect(c?.after.label).toBe("测试3修改了");
    const byField = Object.fromEntries((c?.fields ?? []).map((f) => [f.field, f]));
    expect(byField.label).toMatchObject({ before: "测试3", after: "测试3修改了" });
    expect(byField.order).toMatchObject({ before: 0, after: 2 });
    expect(byField.context).toMatchObject({ before: "ord", after: "pay" });
  });

  it("records a property toggle (pivotal) as a changed field", () => {
    const base = model([node("a", { properties: {} })]);
    const target = model([node("a", { properties: { pivotal: true } })]);
    const c = diffModels(base, target).changed.get("a");
    expect(c?.fields).toEqual([{ field: "pivotal", before: undefined, after: true }]);
  });

  it("leaves `changed` empty for added/removed/unchanged nodes", () => {
    const base = model([node("a")]);
    const target = model([node("a"), node("b", { order: 1 })]);
    expect(diffModels(base, target).changed.size).toBe(0);
  });

  it("classifies edges: added / removed / relation-changed", () => {
    const a = node("a");
    const b = node("b", { order: 1 });
    const base = model([a, b], [{ id: "e1", source: "a", target: "b", relation: "produces" }]);
    const target = model([a, b], [
      { id: "e1", source: "a", target: "b", relation: "triggers" }, // relation changed
      { id: "e2", source: "b", target: "a", relation: "produces" }, // added
    ]);
    const d = diffModels(base, target);
    expect(d.edges.get("e1")).toBe("changed");
    expect(d.edges.get("e2")).toBe("added");
    expect(d.summary).toEqual({ added: 1, removed: 0, changed: 1 });
  });
});
