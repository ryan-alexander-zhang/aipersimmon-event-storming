import { describe, expect, it } from "vitest";
import type { ESEdge } from "@/lib/store/types";
import { computeEdgeCurvature } from "./edge-spread";

const edge = (
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): ESEdge => ({ id, source, target, sourceHandle, targetHandle, data: { relation: "updates" } });

describe("computeEdgeCurvature (RA6)", () => {
  it("leaves a lone edge untouched", () => {
    const out = computeEdgeCurvature([edge("a", "e", "rm1", "s-bottom", "t-top")]);
    expect(out.size).toBe(0);
  });

  it("spreads a fan-out (same source handle) into distinct curvatures", () => {
    const out = computeEdgeCurvature([
      edge("a", "e", "rm1", "s-bottom", "t-top"),
      edge("b", "e", "rm2", "s-bottom", "t-top"),
    ]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("spreads a convergence (same target handle) into distinct curvatures", () => {
    const out = computeEdgeCurvature([
      edge("a", "rm1", "actor", "s-top", "t-bottom"),
      edge("b", "rm2", "actor", "s-top", "t-bottom"),
    ]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("does not spread edges in unrelated corridors", () => {
    const out = computeEdgeCurvature([
      edge("a", "e1", "rm1", "s-bottom", "t-top"),
      edge("b", "e2", "rm2", "s-bottom", "t-top"),
    ]);
    expect(out.size).toBe(0);
  });

  it("groups edges with no handles by node alone", () => {
    const bare = (id: string, source: string, target: string): ESEdge => ({
      id,
      source,
      target,
      data: { relation: "updates" },
    });
    const out = computeEdgeCurvature([bare("a", "e", "rm1"), bare("b", "e", "rm2")]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("is deterministic across input order", () => {
    const es = [
      edge("a", "e", "rm1", "s-bottom", "t-top"),
      edge("b", "e", "rm2", "s-bottom", "t-top"),
    ];
    const first = computeEdgeCurvature(es);
    const second = computeEdgeCurvature([...es].reverse());
    expect(first.get("a")).toBe(second.get("a"));
    expect(first.get("b")).toBe(second.get("b"));
  });
});
