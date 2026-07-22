import { describe, expect, it } from "vitest";
import type { ElementType } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { AGG_MAX_COMMANDS, analyzeModel } from "./health";

const node = (id: string, type: ElementType, label = id): ESNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { label },
});

const edge = (source: string, target: string, relation: RelationType): ESEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  data: { relation },
});

const types = (nodes: ESNode[], edges: ESEdge[], t: string) =>
  analyzeModel(nodes, edges).filter((f) => f.type === t);

describe("analyzeModel", () => {
  it("returns no findings for an empty model (us-00011-AC-4.1)", () => {
    expect(analyzeModel([], [])).toEqual([]);
  });

  it("returns no findings for a clean, complete slice (us-00011-AC-4.1)", () => {
    const nodes = [node("c", "command"), node("e", "domainEvent")];
    const edges = [edge("c", "e", "produces")];
    expect(analyzeModel(nodes, edges)).toEqual([]);
  });

  it("reflects a model change: fixing an orphan clears its finding (us-00011-AC-2.1)", () => {
    const event = node("e", "domainEvent");
    // orphan while unproduced
    expect(types([event], [], "orphan-event")).toHaveLength(1);
    // add the producing command + connect it → the finding is gone on recompute
    const nodes = [event, node("c", "command")];
    expect(types(nodes, [edge("c", "e", "produces")], "orphan-event")).toHaveLength(0);
  });

  describe("orphan-event (us-00011-AC-1.1)", () => {
    it("flags a Domain Event nothing produces or emits", () => {
      const found = types([node("e", "domainEvent", "Order Placed")], [], "orphan-event");
      expect(found).toHaveLength(1);
      expect(found[0].elementIds).toEqual(["e"]);
      expect(found[0].severity).toBe("warning");
      expect(found[0].message).toContain("Order Placed");
    });

    it("does not flag an event produced by a command", () => {
      const nodes = [node("c", "command"), node("e", "domainEvent")];
      expect(types(nodes, [edge("c", "e", "produces")], "orphan-event")).toHaveLength(0);
    });

    it("does not flag an event emitted by an aggregate", () => {
      const nodes = [node("a", "aggregate"), node("e", "domainEvent")];
      expect(types(nodes, [edge("a", "e", "emits")], "orphan-event")).toHaveLength(0);
    });
  });

  describe("dangling-command (us-00011-AC-1.2)", () => {
    it("flags a command with no path to an event", () => {
      const found = types([node("c", "command", "Place Order")], [], "dangling-command");
      expect(found).toHaveLength(1);
      expect(found[0].message).toContain("Place Order");
    });

    it("does not flag a command that produces an event directly", () => {
      const nodes = [node("c", "command"), node("e", "domainEvent")];
      expect(types(nodes, [edge("c", "e", "produces")], "dangling-command")).toHaveLength(0);
    });

    it("does not flag a command handled by an aggregate that emits (multi-hop)", () => {
      const nodes = [node("c", "command"), node("a", "aggregate"), node("e", "domainEvent")];
      const edges = [edge("c", "a", "handledBy"), edge("a", "e", "emits")];
      expect(types(nodes, edges, "dangling-command")).toHaveLength(0);
    });

    it("flags a command whose forward path loops without reaching an event", () => {
      // c -handledBy-> a -emits-> c : a causal loop with no Domain Event
      const nodes = [node("c", "command"), node("a", "aggregate")];
      const edges = [edge("c", "a", "handledBy"), edge("a", "c", "emits")];
      expect(types(nodes, edges, "dangling-command")).toHaveLength(1);
    });
  });

  describe("overloaded-aggregate (us-00011-AC-1.3)", () => {
    const aggWithCommands = (count: number) => {
      const agg = node("a", "aggregate", "Order");
      const nodes: ESNode[] = [agg];
      const edges: ESEdge[] = [];
      for (let i = 0; i < count; i++) {
        nodes.push(node(`c${i}`, "command"));
        edges.push(edge(`c${i}`, "a", "handledBy"));
      }
      return { nodes, edges };
    };

    it("flags an aggregate handling more commands than the threshold", () => {
      const { nodes, edges } = aggWithCommands(AGG_MAX_COMMANDS + 1);
      const found = types(nodes, edges, "overloaded-aggregate");
      expect(found).toHaveLength(1);
      expect(found[0].severity).toBe("info");
      expect(found[0].message).toContain(String(AGG_MAX_COMMANDS + 1));
      // names the aggregate it concerns (us-00011-AC-1.3)
      expect(found[0].elementIds).toEqual(["a"]);
      expect(found[0].message).toContain("Order");
    });

    it("does not flag an aggregate at the threshold", () => {
      const { nodes, edges } = aggWithCommands(AGG_MAX_COMMANDS);
      expect(types(nodes, edges, "overloaded-aggregate")).toHaveLength(0);
    });

    it("flags an aggregate emitting too many events", () => {
      const agg = node("a", "aggregate");
      const nodes: ESNode[] = [agg];
      const edges: ESEdge[] = [];
      for (let i = 0; i <= AGG_MAX_COMMANDS; i++) {
        nodes.push(node(`e${i}`, "domainEvent"));
        edges.push(edge("a", `e${i}`, "emits"));
      }
      expect(types(nodes, edges, "overloaded-aggregate")).toHaveLength(1);
    });
  });

  describe("policy-cycle (us-00011-AC-1.4)", () => {
    it("flags a reaction cycle that runs through a policy", () => {
      // e -triggers-> p -invokes-> c -produces-> e
      const nodes = [node("e", "domainEvent"), node("p", "policy"), node("c", "command")];
      const edges = [
        edge("e", "p", "triggers"),
        edge("p", "c", "invokes"),
        edge("c", "e", "produces"),
      ];
      const found = types(nodes, edges, "policy-cycle");
      expect(found).toHaveLength(1);
      expect(found[0].elementIds.sort()).toEqual(["c", "e", "p"]);
      expect(found[0].message).toContain("->");
    });

    it("does not flag an acyclic reaction chain", () => {
      const nodes = [node("e", "domainEvent"), node("p", "policy"), node("c", "command")];
      const edges = [edge("e", "p", "triggers"), edge("p", "c", "invokes")];
      expect(types(nodes, edges, "policy-cycle")).toHaveLength(0);
    });

    it("ignores a cycle with no policy in it", () => {
      // c -produces-> e -...-> c loop but no policy node
      const nodes = [node("c", "command"), node("e", "domainEvent")];
      const edges = [edge("c", "e", "produces"), edge("e", "c", "produces")];
      expect(types(nodes, edges, "policy-cycle")).toHaveLength(0);
    });
  });

  describe("unresolved-hotspots", () => {
    it("summarises open hotspots into one finding", () => {
      const nodes = [node("h1", "hotspot"), node("h2", "hotspot"), node("e", "domainEvent")];
      const edges = [edge("h1", "e", "annotates")];
      const found = types(nodes, edges, "unresolved-hotspots");
      expect(found).toHaveLength(1);
      expect(found[0].message).toContain("2");
      expect(found[0].elementIds.sort()).toEqual(["h1", "h2"]);
    });

    it("emits nothing when there are no hotspots", () => {
      expect(types([node("e", "domainEvent")], [], "unresolved-hotspots")).toHaveLength(0);
    });

    it("counts only open hotspots, excluding resolved ones (us-00012-AC-3.1/4.1)", () => {
      const open = node("h1", "hotspot"); // no state → open
      const resolved: ESNode = { ...node("h2", "hotspot"), data: { label: "h2", state: "resolved" } };
      const found = types([open, resolved], [], "unresolved-hotspots");
      expect(found).toHaveLength(1);
      expect(found[0].message).toContain("1");
      expect(found[0].elementIds).toEqual(["h1"]);
    });
  });

  it("scales to a few hundred elements without blowing up (spec-00007-XAC-2.1)", () => {
    // 299 command→event pairs plus one orphan event e0 (no producer): ~599 nodes.
    const nodes: ESNode[] = [node("e0", "domainEvent")];
    const edges: ESEdge[] = [];
    for (let i = 1; i < 300; i++) {
      nodes.push(node(`c${i}`, "command"), node(`e${i}`, "domainEvent"));
      edges.push(edge(`c${i}`, `e${i}`, "produces"));
    }
    const t0 = performance.now();
    const out = analyzeModel(nodes, edges);
    const ms = performance.now() - t0;
    // correctness at scale: exactly the one seeded orphan, no false danglers
    const orphans = out.filter((f) => f.type === "orphan-event");
    expect(orphans).toHaveLength(1);
    expect(orphans[0].elementIds).toEqual(["e0"]);
    expect(out.filter((f) => f.type === "dangling-command")).toHaveLength(0);
    // linear analysis stays well under a generous budget (guards against O(n^2))
    expect(ms).toBeLessThan(500);
  });

  it("orders findings warning before info (us-00011-FR-1)", () => {
    // an orphan event (warning) plus a hotspot (info)
    const nodes = [node("e", "domainEvent"), node("h", "hotspot")];
    const out = analyzeModel(nodes, []);
    expect(out.map((f) => f.severity)).toEqual(["warning", "info"]);
  });
});
