import { describe, expect, it } from "vitest";
import type { ESEdge } from "@/lib/store/types";
import { computeEdgeOffsets } from "./edge-spread";

const edge = (
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): ESEdge => ({ id, source, target, sourceHandle, targetHandle, data: { relation: "updates" } });

describe("computeEdgeOffsets (RA6 → TB2)", () => {
  it("leaves a lone edge untouched", () => {
    const out = computeEdgeOffsets([edge("a", "e", "rm1", "s-bottom", "t-top")]);
    expect(out.size).toBe(0);
  });

  it("spreads a fan-out (same source handle) into distinct offsets", () => {
    const out = computeEdgeOffsets([
      edge("a", "e", "rm1", "s-bottom", "t-top"),
      edge("b", "e", "rm2", "s-bottom", "t-top"),
    ]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("spreads a convergence (same target handle) into distinct offsets", () => {
    const out = computeEdgeOffsets([
      edge("a", "rm1", "actor", "s-top", "t-bottom"),
      edge("b", "rm2", "actor", "s-top", "t-bottom"),
    ]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("does not spread edges in unrelated corridors", () => {
    const out = computeEdgeOffsets([
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
    const out = computeEdgeOffsets([bare("a", "e", "rm1"), bare("b", "e", "rm2")]);
    expect(out.size).toBe(2);
    expect(out.get("a")).not.toBe(out.get("b"));
  });

  it("fans a group out symmetrically around 0", () => {
    const out = computeEdgeOffsets([
      edge("a", "e", "rm1", "s-bottom", "t-top"),
      edge("b", "e", "rm2", "s-bottom", "t-top"),
      edge("c", "e", "rm3", "s-bottom", "t-top"),
    ]);
    const vals = ["a", "b", "c"].map((id) => out.get(id)!);
    expect(vals.reduce((s, v) => s + v, 0)).toBe(0); // symmetric
    expect(new Set(vals).size).toBe(3); // all distinct
    expect(vals[1]).toBe(0); // middle sibling stays straight
  });

  it("is deterministic across input order", () => {
    const es = [
      edge("a", "e", "rm1", "s-bottom", "t-top"),
      edge("b", "e", "rm2", "s-bottom", "t-top"),
    ];
    const first = computeEdgeOffsets(es);
    const second = computeEdgeOffsets([...es].reverse());
    expect(first.get("a")).toBe(second.get("a"));
    expect(first.get("b")).toBe(second.get("b"));
  });
});
