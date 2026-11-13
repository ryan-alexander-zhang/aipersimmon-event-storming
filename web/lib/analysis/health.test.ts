import { describe, expect, it } from "vitest";
import type { Context, ContextRelationship } from "@/lib/dsl/schema";
import type { ElementType } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { AGG_MAX_COMMANDS, analyzeModel, seamStyle } from "./health";

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

    it("does not flag a temporal Domain Event - time is its producer [issue-00039]", () => {
      const e = node("e", "domainEvent", "Billing Month Ended");
      e.data.temporal = true;
      expect(types([e], [], "orphan-event")).toHaveLength(0);
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
      // asks the G2 question, not only for a split (plan-00025-AC-6)
      expect(found[0].message).toContain("which rule do they all share?");
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

  describe("unrecorded-resolution [us-00033-AC-5.1]", () => {
    const resolved = (id: string, resolution?: string): ESNode => ({
      ...node(id, "hotspot"),
      data: { label: id, state: "resolved", ...(resolution ? { resolution } : {}) },
    });

    it("reports a resolved hotspot with nothing written down", () => {
      const found = types([resolved("h1"), resolved("h2", "we chose per-item locks")], [], "unrecorded-resolution");
      expect(found).toHaveLength(1);
      expect(found[0].elementIds).toEqual(["h1"]);
      expect(found[0].severity).toBe("warning");
    });

    it("treats a blank resolution as none", () => {
      expect(types([resolved("h1", "   ")], [], "unrecorded-resolution")).toHaveLength(1);
    });

    it("leaves open hotspots alone — they are not expected to have one yet", () => {
      expect(types([node("h1", "hotspot")], [], "unrecorded-resolution")).toHaveLength(0);
    });
  });

  // An alternative set is a positive statement: nothing infers a fork, and nothing asks
  // about one (us-00035, amended). The only thing health says about sets is that a set of
  // one is not a set.
  describe("lone-alternative [us-00035-AC-5.1]", () => {
    it("reports a set with one member — nothing happens instead of itself", () => {
      const only: ESNode = {
        ...node("e1", "domainEvent"),
        data: { label: "e1", alternativeSet: "charge-outcome" },
      };
      const found = types([only], [], "lone-alternative");
      expect(found).toHaveLength(1);
      expect(found[0].elementIds).toEqual(["e1"]);
      expect(found[0].message).toContain("charge-outcome");
    });

    it("says nothing once the set has two members", () => {
      const member = (id: string): ESNode => ({
        ...node(id, "domainEvent"),
        data: { label: id, alternativeSet: "charge-outcome" },
      });
      expect(types([member("e1"), member("e2")], [], "lone-alternative")).toHaveLength(0);
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

describe("subdomain findings [decision-00016]", () => {
  const ctx = (id: string, name: string, subdomain?: Context["subdomain"]): Context => ({
    id,
    name,
    order: 0,
    purpose: "p", // keeps missing-purpose out of these cases
    ...(subdomain && { subdomain }),
  });

  it("flags two contexts realising one subdomain, at any level, names compared case-insensitively", () => {
    const contexts = [
      ctx("a", "Ordering", { name: "Sales", type: "core" }),
      ctx("b", "Checkout", { name: "sales ", type: "core" }),
      ctx("c", "Payment", { name: "Payment", type: "generic" }),
    ];
    const out = analyzeModel([], [], contexts, "big-picture");
    expect(out.map((f) => f.type)).toEqual(["duplicate-subdomain"]);
    expect(out[0].message).toContain("'Ordering', 'Checkout'");
  });

  it("at design, flags a context with no subdomain and a subdomain with no type", () => {
    const contexts = [ctx("a", "Ordering"), ctx("b", "Payment", { name: "Payment" })];
    const out = analyzeModel([], [], contexts, "design");
    expect(out.map((f) => f.id)).toEqual(["missing-subdomain:a", "missing-subdomain:b"]);
  });

  it("does not ask for a subdomain before design", () => {
    const contexts = [ctx("a", "Ordering"), ctx("b", "Payment", { name: "Payment" })];
    expect(analyzeModel([], [], contexts, "process")).toEqual([]);
  });

  it("is clean when every context realises its own typed subdomain", () => {
    const contexts = [
      ctx("a", "Ordering", { name: "Ordering", type: "core" }),
      ctx("b", "Payment", { name: "Payment", type: "generic" }),
    ];
    expect(analyzeModel([], [], contexts, "design")).toEqual([]);
  });
});

describe("unbacked-seam [decision-00017, plan-00024-AC-7]", () => {
  const inCtx = (id: string, type: ElementType, context: string): ESNode => ({
    ...node(id, type),
    data: { label: id, context },
  });
  const contexts: Context[] = [
    { id: "ord", name: "Ordering", order: 0 },
    { id: "pay", name: "Payment", order: 1 },
  ];
  const nodes = [
    inCtx("c1", "command", "ord"),
    inCtx("e1", "domainEvent", "pay"),
    inCtx("c2", "command", "ord"),
    inCtx("e2", "domainEvent", "pay"),
    inCtx("e3", "domainEvent", "ord"),
    node("loose", "domainEvent"),
    inCtx("op", "actor", "pay"),
  ];
  const edges = [
    edge("c1", "e1", "produces"),
    edge("c2", "e2", "produces"),
    edge("c1", "e3", "produces"), // inside one context
    edge("c2", "loose", "produces"), // to an Ungrouped element
    edge("op", "c2", "issues"), // a person acting in two contexts
  ];
  const seams = (rels: Parameters<typeof analyzeModel>[4]) =>
    analyzeModel(nodes, edges, contexts, "process", rels).filter((f) => f.type === "unbacked-seam");

  it("reports a pair joined by an edge and no relationship, once", () => {
    const out = seams([]);
    expect(out).toHaveLength(1);
    expect(out[0].message).toBe("'Ordering' and 'Payment' are joined by an edge but have no Context Relationship");
    expect([...out[0].elementIds].sort()).toEqual(["c1", "c2", "e1", "e2"]);
  });

  it("does not count an Actor's edge as a seam", () => {
    const actorOnly = analyzeModel(
      [inCtx("op", "actor", "pay"), inCtx("c", "command", "ord")],
      [edge("op", "c", "issues")],
      contexts,
    );
    expect(actorOnly.filter((f) => f.type === "unbacked-seam")).toEqual([]);
  });

  it("does not count a Hotspot's or Opportunity's edge as a seam [issue-00040]", () => {
    const commentary = analyzeModel(
      [inCtx("h", "hotspot", "pay"), inCtx("o", "opportunity", "pay"), inCtx("c", "command", "ord")],
      [edge("h", "c", "annotates"), edge("o", "c", "highlights")],
      contexts,
    );
    expect(commentary.filter((f) => f.type === "unbacked-seam")).toEqual([]);
  });

  it("is satisfied by a relationship in either direction", () => {
    expect(seams([{ id: "r", source: "pay", target: "ord", type: "conformist" }])).toEqual([]);
    expect(seams([{ id: "r", source: "ord", target: "pay", type: "acl" }])).toEqual([]);
  });

  it("names a context that is not declared by its id", () => {
    const out = analyzeModel([inCtx("a", "command", "x"), inCtx("b", "domainEvent", "y")], [edge("a", "b", "produces")]);
    expect(out.find((f) => f.type === "unbacked-seam")?.message).toBe(
      "'x' and 'y' are joined by an edge but have no Context Relationship",
    );
  });
});

describe("heuristic findings [decision-00018]", () => {
  const of = (findings: ReturnType<typeof analyzeModel>, t: string) => findings.filter((f) => f.type === t);

  it("warns on an event named by a CRUD or UI verb, at any level [plan-00025-AC-3]", () => {
    const nodes = [
      node("a", "domainEvent", "Order Created"),
      node("b", "domainEvent", "Button  Clicked "),
      node("c", "domainEvent", "Cargo Loaded"),
      node("d", "domainEvent", "Item Removed"),
      node("e", "command", "Order Created"),
    ];
    const found = of(analyzeModel(nodes, []), "technical-event");
    expect(found.map((f) => f.elementIds)).toEqual([["a"], ["b"]]);
    expect(found[0].message).toBe("Domain Event 'Order Created' names a technical step - what happened in business terms?");
  });

  it("warns on a design-level context without a purpose [plan-00025-AC-4]", () => {
    const ctxs: Context[] = [
      { id: "ord", name: "Ordering", order: 0, purpose: "Take orders." },
      { id: "pay", name: "Payment", order: 1, purpose: "  " },
      { id: "shp", name: "Shipping", order: 2 },
    ];
    const found = of(analyzeModel([], [], ctxs, "design"), "missing-purpose");
    expect(found.map((f) => f.id)).toEqual(["missing-purpose:pay", "missing-purpose:shp"]);
    expect(of(analyzeModel([], [], ctxs, "process"), "missing-purpose")).toEqual([]);
  });

  it("warns on a design-level aggregate whose commands no constraint guards [plan-00025-AC-5]", () => {
    const nodes = [
      node("c1", "command"),
      node("c2", "command"),
      node("ag", "aggregate", "Order"),
      node("bare", "aggregate", "Basket"),
      node("k", "constraint"),
    ];
    const edges = [edge("c1", "ag", "handledBy"), edge("c2", "bare", "handledBy")];
    const at = (es: ESEdge[], level?: "design" | "process") =>
      of(analyzeModel(nodes, es, [], level), "unguarded-aggregate").map((f) => f.elementIds[0]);
    expect(at(edges, "design")).toEqual(["ag", "bare"]);
    expect(at([...edges, edge("c1", "k", "constrainedBy")], "design")).toEqual(["bare"]);
    expect(at(edges, "process")).toEqual([]);
  });
});

describe("per-context level and integration direction [decision-00019]", () => {
  const at = (id: string, type: ElementType, context?: string, data: Partial<ESNode["data"]> = {}): ESNode => ({
    ...node(id, type),
    data: { label: id, ...(context && { context }), ...data },
  });
  const of = (findings: ReturnType<typeof analyzeModel>, t: string) => findings.filter((f) => f.type === t);
  const ctx = (id: string, extra: Partial<Context> = {}): Context => ({
    id,
    name: id.toUpperCase(),
    order: 0,
    subdomain: { name: id, type: "core" },
    purpose: "p",
    ...extra,
  });

  it("judges design requirements by each context's own level [plan-00026-AC-8]", () => {
    const contexts = [ctx("ord"), { id: "new", name: "NEW", order: 1, level: "big-picture" as const }];
    const nodes = [
      at("e-ord", "domainEvent", "ord"),
      at("e-new", "domainEvent", "new"),
      at("ag", "aggregate", "ord"),
      at("p-ord", "policy", "ord"),
      at("p-new", "policy", "new"),
    ];
    const out = analyzeModel(nodes, [], contexts, "design");
    expect(of(out, "missing-subdomain")).toEqual([]); // NEW is not designed yet
    expect(of(out, "missing-purpose")).toEqual([]);
    expect(of(out, "orphan-event").map((f) => f.elementIds[0])).toEqual(["e-ord"]); // e-new exempt
    expect(of(out, "unguarded-aggregate").map((f) => f.elementIds[0])).toEqual(["ag"]);
    expect(of(out, "missing-execution").map((f) => f.elementIds[0])).toEqual(["p-ord"]);
  });

  it("caps a context's level at the model's [plan-00026-AC-6]", () => {
    const out = analyzeModel([at("p", "policy", "ord")], [], [ctx("ord", { level: "design" })], "process");
    expect(of(out, "missing-execution")).toEqual([]);
    // with no model level, the declared one applies
    expect(of(analyzeModel([at("p", "policy", "ord")], [], [ctx("ord", { level: "design" })]), "missing-execution")).toHaveLength(1);
  });

  it("exempts events from orphan-event at Big Picture, as the validator does", () => {
    expect(of(analyzeModel([at("e", "domainEvent")], [], [], "big-picture"), "orphan-event")).toEqual([]);
    expect(of(analyzeModel([at("e", "domainEvent")], [], [], "process"), "orphan-event")).toHaveLength(1);
  });

  it("warns on a node its context's declared level does not allow [plan-00026-AC-7]", () => {
    const contexts = [ctx("new", { level: "big-picture" }), ctx("ord")];
    const nodes = [at("c-new", "command", "new"), at("c-ord", "command", "ord"), at("c-free", "command")];
    const out = of(analyzeModel(nodes, [], contexts, "design"), "type-above-level");
    expect(out.map((f) => f.elementIds[0])).toEqual(["c-new"]);
    expect(out[0].message).toBe("'c-new' is a command, but its context is at big-picture");
    // a type above the model's level is the view's business
    expect(of(analyzeModel(nodes, [], [ctx("ord")], "big-picture"), "type-above-level")).toEqual([]);
  });

  describe("reversed-dependency [plan-00026-AC-4]", () => {
    const contexts = [ctx("ord"), ctx("pay")];
    // Ordering's saga calls Payment's command; Payment's event feeds Ordering's policy.
    const nodes = [
      at("saga", "policy", "ord", { execution: "automatic" }),
      at("charge", "command", "pay"),
      at("charged", "domainEvent", "pay"),
      at("react", "policy", "ord", { execution: "automatic" }),
    ];
    const calls = [edge("saga", "charge", "invokes")];
    const listens = [edge("charged", "react", "triggers")];
    const rel = (source: string, target: string, type = "customerSupplier") =>
      ({ id: `${source}-${target}`, source, target, type }) as ContextRelationship;
    const reversedFor = (es: ESEdge[], rels: Parameters<typeof analyzeModel>[4]) =>
      of(analyzeModel(nodes, es, contexts, "process", rels), "reversed-dependency");

    it("warns once per pair when the seams make the declared upstream depend on its downstream", () => {
      const out = reversedFor([...calls, ...listens], [rel("ord", "pay")]);
      expect(out).toHaveLength(1);
      expect(out[0].message).toBe(
        "'ORD' depends on 'PAY' (invokes 'saga' -> 'charge'), but the Context Relationship makes 'ORD' upstream",
      );
      expect([...out[0].elementIds].sort()).toEqual(["charge", "charged", "react", "saga"]);
    });

    it("passes when a relationship points the derived way, or is symmetric", () => {
      expect(reversedFor([...calls, ...listens], [rel("pay", "ord")])).toEqual([]);
      expect(reversedFor(calls, [rel("ord", "pay"), rel("pay", "ord", "conformist")])).toEqual([]);
      expect(reversedFor(calls, [rel("ord", "pay", "partnership")])).toEqual([]);
    });
  });

  describe("mutual-dependency [plan-00026-AC-4b]", () => {
    const contexts = [ctx("ord"), ctx("pay")];
    // Ordering calls Payment's command, and Payment reacts to Ordering's event.
    const nodes = [
      at("saga", "policy", "ord", { execution: "automatic" }),
      at("charge", "command", "pay"),
      at("placed", "domainEvent", "ord"),
      at("hold", "policy", "pay", { execution: "automatic" }),
    ];
    const both = [edge("saga", "charge", "invokes"), edge("placed", "hold", "triggers")];
    const rel = (source: string, target: string, type = "customerSupplier") =>
      ({ id: `${source}-${target}-${type}`, source, target, type }) as ContextRelationship;
    const run = (es: ESEdge[], rels: ContextRelationship[]) => analyzeModel(nodes, es, contexts, "process", rels);

    it("warns once for a pair depending both ways, instead of reversed-dependency", () => {
      const out = run(both, [rel("ord", "pay")]);
      expect(of(out, "reversed-dependency")).toEqual([]);
      const mutual = of(out, "mutual-dependency");
      expect(mutual).toHaveLength(1);
      expect(mutual[0].message).toBe(
        "'ORD' and 'PAY' depend on each other - straighten one direction, declare a Partnership, or merge them",
      );
      expect([...mutual[0].elementIds].sort()).toEqual(["charge", "hold", "placed", "saga"]);
    });

    it("is not silenced by a relationship each way, only by a Partnership or Shared Kernel", () => {
      expect(of(run(both, [rel("ord", "pay"), rel("pay", "ord")]), "mutual-dependency")).toHaveLength(1);
      expect(of(run(both, [rel("ord", "pay", "partnership")]), "mutual-dependency")).toEqual([]);
      expect(of(run(both, [rel("pay", "ord", "sharedKernel")]), "mutual-dependency")).toEqual([]);
    });

    it("does not fire on a one-way pair", () => {
      expect(of(run([both[0]], [rel("pay", "ord")]), "mutual-dependency")).toEqual([]);
    });

    it("classifies events by their source and calls by their target", () => {
      expect(seamStyle("triggers")).toEqual({ style: "events", upstream: "source" });
      expect(seamStyle("updates")).toEqual({ style: "events", upstream: "source" });
      expect(seamStyle("emits")).toEqual({ style: "events", upstream: "source" });
      for (const r of ["invokes", "handledBy", "produces", "issues", "constrainedBy"] as const) {
        expect(seamStyle(r)).toEqual({ style: "api", upstream: "target" });
      }
    });
  });
});
