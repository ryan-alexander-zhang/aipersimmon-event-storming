import { describe, expect, it } from "vitest";
import { contextEdgeHandles } from "./context-map";

// issue-00012: Context Map edges must leave the source on the side facing the
// target and enter the target on the facing side — not always the left handle.
describe("contextEdgeHandles [issue-00012]", () => {
  it("routes to the right when the target is to the right", () => {
    expect(contextEdgeHandles({ x: 0, y: 0 }, { x: 300, y: 0 })).toEqual({
      sourceHandle: "s-right",
      targetHandle: "t-left",
    });
  });

  it("routes to the left when the target is to the left", () => {
    expect(contextEdgeHandles({ x: 300, y: 0 }, { x: 0, y: 0 })).toEqual({
      sourceHandle: "s-left",
      targetHandle: "t-right",
    });
  });

  it("routes down when the target is below (dominant vertical axis)", () => {
    expect(contextEdgeHandles({ x: 0, y: 0 }, { x: 10, y: 300 })).toEqual({
      sourceHandle: "s-bottom",
      targetHandle: "t-top",
    });
  });

  it("routes up when the target is above", () => {
    expect(contextEdgeHandles({ x: 0, y: 300 }, { x: 0, y: 0 })).toEqual({
      sourceHandle: "s-top",
      targetHandle: "t-bottom",
    });
  });
});
