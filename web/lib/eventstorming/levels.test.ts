import { describe, expect, it } from "vitest";
import type { ElementType } from "./elements";
import { isVisibleAt, LEVEL_TYPES } from "./levels";

describe("levels", () => {
  it("is cumulative: Big Picture ⊂ Process ⊂ Design", () => {
    expect(LEVEL_TYPES["big-picture"].every((t) => LEVEL_TYPES.process.includes(t))).toBe(true);
    expect(LEVEL_TYPES.process.every((t) => LEVEL_TYPES.design.includes(t))).toBe(true);
  });

  it("Big Picture shows only actors/systems, events, hotspots [us-00008-AC-1.1]", () => {
    const shown: ElementType[] = ["actor", "externalSystem", "domainEvent", "hotspot"];
    const hidden: ElementType[] = ["command", "aggregate", "policy", "readModel"];
    for (const t of shown) expect(isVisibleAt("big-picture", t)).toBe(true);
    for (const t of hidden) expect(isVisibleAt("big-picture", t)).toBe(false);
  });

  it("Process adds commands/policies/read models but not aggregates", () => {
    expect(isVisibleAt("process", "command")).toBe(true);
    expect(isVisibleAt("process", "policy")).toBe(true);
    expect(isVisibleAt("process", "readModel")).toBe(true);
    expect(isVisibleAt("process", "aggregate")).toBe(false);
  });

  it("Design shows aggregates", () => {
    expect(isVisibleAt("design", "aggregate")).toBe(true);
  });
});
