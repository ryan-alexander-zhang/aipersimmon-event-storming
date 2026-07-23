import { describe, expect, it } from "vitest";
import { describeChange } from "./diff-display";
import type { ChangedNode } from "./diff";
import type { Context, ModelNode } from "./schema";

const n = (patch: Partial<ModelNode> = {}): ModelNode => ({
  id: "a",
  type: "domainEvent",
  label: "E",
  order: 0,
  properties: {},
  ...patch,
});

const changed = (before: ModelNode, after: ModelNode, fields: ChangedNode["fields"]): ChangedNode => ({
  before,
  after,
  fields,
});

const ctx: Context[] = [
  { id: "ord", name: "Ordering", order: 0 },
  { id: "pay", name: "Payment", order: 1 },
];

describe("describeChange [us-00023-FR-8/9]", () => {
  it("renders a rename as a struck old label + detail line [AC-8.1]", () => {
    const c = changed(n({ label: "测试3" }), n({ label: "测试3修改了" }), [
      { field: "label", before: "测试3", after: "测试3修改了" },
    ]);
    const d = describeChange(c, ctx, ctx);
    expect(d.renamedFrom).toBe("测试3");
    expect(d.chips).toEqual([]); // label isn't a chip; it's the struck line
    expect(d.detail).toContain("label: 测试3 → 测试3修改了");
  });

  it("renders an order move as a direction chip, not a number [AC-8.2]", () => {
    const later = describeChange(changed(n({ order: 0 }), n({ order: 5 }), [
      { field: "order", before: 0, after: 5 },
    ]), ctx, ctx);
    expect(later.chips).toEqual(["➡ later"]);
    expect(later.detail).toContain("moved later");
    expect(later.chips.join()).not.toMatch(/\d/); // no raw slot number

    const earlier = describeChange(changed(n({ order: 5 }), n({ order: 1 }), [
      { field: "order", before: 5, after: 1 },
    ]), ctx, ctx);
    expect(earlier.chips).toEqual(["⬅ earlier"]);
  });

  it("resolves context ids to names in the detail [AC-9.1]", () => {
    const c = changed(n({ context: "ord" }), n({ context: "pay" }), [
      { field: "context", before: "ord", after: "pay" },
    ]);
    const d = describeChange(c, ctx, ctx);
    expect(d.chips).toContain("context ✎");
    expect(d.detail).toContain("context: Ordering → Payment");
  });

  it("shows Ungrouped when a context id is empty/absent", () => {
    const c = changed(n({ context: "ord" }), n({}), [
      { field: "context", before: "ord", after: undefined },
    ]);
    expect(describeChange(c, ctx, ctx).detail).toContain("context: Ordering → Ungrouped");
  });

  it("renders a hotspot state/kind/priority change as a before → after chip", () => {
    const c = changed(n({ type: "hotspot", properties: { state: "open" } }), n({ type: "hotspot", properties: { state: "resolved" } }), [
      { field: "state", before: "open", after: "resolved" },
    ]);
    const d = describeChange(c, ctx, ctx);
    expect(d.chips).toEqual(["state: open → resolved"]);
    expect(d.detail).toContain("state: open → resolved");
  });

  it("renders a description change as a chip + before → after detail", () => {
    const c = changed(n({ properties: {} }), n({ properties: { description: "note" } }), [
      { field: "description", before: undefined, after: "note" },
    ]);
    const d = describeChange(c, ctx, ctx);
    expect(d.chips).toEqual(["description ✎"]);
    expect(d.detail).toContain("description: — → note");
  });

  it("caps chips at 3 with a +N overflow", () => {
    const c = changed(n(), n(), [
      { field: "order", before: 0, after: 1 },
      { field: "context", before: "ord", after: "pay" },
      { field: "pivotal", before: undefined, after: true },
      { field: "state", before: "open", after: "resolved" },
    ]);
    const d = describeChange(c, ctx, ctx);
    expect(d.chips).toHaveLength(4); // 3 shown + "+1"
    expect(d.chips[3]).toBe("+1");
  });
});
