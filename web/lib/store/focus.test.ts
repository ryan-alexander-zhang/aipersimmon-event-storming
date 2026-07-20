import { describe, expect, it } from "vitest";
import { computeFocus, computeNeighborhood, focusSource } from "./focus";
import type { ESEdge } from "./types";

const edge = (id: string, source: string, target: string): ESEdge => ({
  id,
  source,
  target,
  data: { relation: "emits" },
});

// a -> b -> c, plus an unrelated d -> e
const edges: ESEdge[] = [edge("ab", "a", "b"), edge("bc", "b", "c"), edge("de", "d", "e")];

describe("computeFocus (RA2)", () => {
  it("returns an inactive, empty set when nothing is focused", () => {
    for (const id of [null, undefined, ""]) {
      const f = computeFocus(id, edges);
      expect(f.active).toBe(false);
      expect(f.nodeIds.size).toBe(0);
      expect(f.edgeIds.size).toBe(0);
    }
  });

  it("includes the focused node, its neighbours, and incident edges", () => {
    const f = computeFocus("b", edges);
    expect(f.active).toBe(true);
    expect([...f.nodeIds].sort()).toEqual(["a", "b", "c"]);
    expect([...f.edgeIds].sort()).toEqual(["ab", "bc"]);
  });

  it("excludes unrelated nodes and edges", () => {
    const f = computeFocus("a", edges);
    expect([...f.nodeIds].sort()).toEqual(["a", "b"]);
    expect([...f.edgeIds]).toEqual(["ab"]);
    expect(f.nodeIds.has("d")).toBe(false);
    expect(f.edgeIds.has("de")).toBe(false);
  });

  it("handles a focused node with no edges (itself only)", () => {
    const f = computeFocus("lonely", edges);
    expect(f.active).toBe(true);
    expect([...f.nodeIds]).toEqual(["lonely"]);
    expect(f.edgeIds.size).toBe(0);
  });
});

describe("computeNeighborhood (TC1)", () => {
  // chain a -> b -> c -> d
  const chain: ESEdge[] = [edge("ab", "a", "b"), edge("bc", "b", "c"), edge("cd", "c", "d")];

  it("returns empty for a missing anchor", () => {
    const n = computeNeighborhood(null, chain, { depth: 3, direction: "both" });
    expect(n.nodeIds.size).toBe(0);
    expect(n.edgeIds.size).toBe(0);
  });

  it("walks downstream (source→target) to the given depth", () => {
    expect([...computeNeighborhood("b", chain, { depth: 1, direction: "down" }).nodeIds].sort()).toEqual(["b", "c"]);
    expect([...computeNeighborhood("b", chain, { depth: 2, direction: "down" }).nodeIds].sort()).toEqual(["b", "c", "d"]);
  });

  it("walks upstream (target→source) to the given depth", () => {
    expect([...computeNeighborhood("c", chain, { depth: 1, direction: "up" }).nodeIds].sort()).toEqual(["b", "c"]);
    expect([...computeNeighborhood("c", chain, { depth: 2, direction: "up" }).nodeIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("both directions reach either side", () => {
    expect([...computeNeighborhood("b", chain, { depth: 1, direction: "both" }).nodeIds].sort()).toEqual(["a", "b", "c"]);
  });

  it("returns the induced edges among reached nodes", () => {
    const n = computeNeighborhood("a", chain, { depth: 3, direction: "down" });
    expect([...n.nodeIds].sort()).toEqual(["a", "b", "c", "d"]);
    expect([...n.edgeIds].sort()).toEqual(["ab", "bc", "cd"]);
  });

  it("an anchor with no edges is just itself", () => {
    const n = computeNeighborhood("lonely", chain, { depth: 3, direction: "both" });
    expect([...n.nodeIds]).toEqual(["lonely"]);
    expect(n.edgeIds.size).toBe(0);
  });
});

describe("focusSource (RA3)", () => {
  it("prefers the hovered node over the selected one", () => {
    expect(focusSource("h", "s")).toBe("h");
  });
  it("falls back to the selected node when nothing is hovered", () => {
    expect(focusSource(null, "s")).toBe("s");
  });
  it("is null when neither is set", () => {
    expect(focusSource(null, null)).toBe(null);
    expect(focusSource(undefined, undefined)).toBe(null);
  });
});
