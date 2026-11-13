import { describe, expect, it } from "vitest";
import type { Model } from "./schema";
import { importJSON } from "./serialize";
import { defaultLink, linkAll, linkProblem, mergeFiles, splitModel } from "./split";

const META = { name: "m", level: "design" as const, createdAt: "t" };
const ev = (id: string, context?: string) => ({
  id,
  type: "domainEvent",
  label: id,
  ...(context && { context }),
  order: 0,
  properties: {},
});
const cmd = (id: string, context?: string) => ({ id, type: "command", label: id, ...(context && { context }), properties: {} });
const produces = (id: string, source: string, target: string) => ({ id, source, target, relation: "produces" });

// Ordering and Payment linked, Shipping inline, one Ungrouped event; one edge inside
// each linked context, one crossing them, one inside the inline context.
const MODEL = {
  version: "5.0",
  meta: META,
  contexts: [
    {
      id: "ord",
      name: "Ordering",
      order: 0,
      subdomain: { name: "Ordering", type: "core" },
      purpose: "Take orders.",
      language: [{ term: "Order", meaning: "A committed basket.", avoid: ["basket"] }],
      level: "process",
      file: "contexts/ord.json",
    },
    { id: "pay", name: "Payment", order: 1, subdomain: { name: "Payment", type: "generic" }, file: "contexts/pay.json" },
    { id: "shp", name: "Shipping", order: 2, subdomain: { name: "Shipping", type: "supporting" } },
  ],
  contextRelationships: [{ id: "r1", source: "ord", target: "pay", type: "customerSupplier" }],
  nodes: [
    cmd("c1", "ord"),
    ev("e1", "ord"),
    cmd("c2", "pay"),
    ev("e2", "pay"),
    cmd("c3", "shp"),
    ev("e3", "shp"),
    ev("loose"),
  ],
  edges: [produces("x1", "c1", "e1"), produces("x2", "c2", "e2"), produces("x3", "c1", "e2"), produces("x4", "c3", "e3")],
};

const model = (): Model => {
  const r = importJSON(JSON.stringify(MODEL));
  if (!r.ok) throw new Error(r.error);
  return r.model;
};

const files = () => splitModel(model());
const merge = (f: Record<string, string>) => mergeFiles(f["domain.json"], f);
const edit = (f: Record<string, string>, path: string, change: (v: Record<string, unknown>) => void) => {
  const v = JSON.parse(f[path]);
  change(v);
  return { ...f, [path]: JSON.stringify(v) };
};
const error = (f: Record<string, string>) => {
  const r = merge(f);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.error;
};

describe("mergeFiles / splitModel [decision-00017]", () => {
  it("reads a domain file with no links exactly as a single-file import [AC-1]", () => {
    const single = JSON.stringify({ ...MODEL, contexts: MODEL.contexts.map((c) => ({ ...c, file: undefined })) });
    expect(mergeFiles(single, {})).toEqual(importJSON(single));
  });

  it("puts each element where the decision says, and merges back unchanged [AC-2, AC-3]", () => {
    const f = files();
    expect(Object.keys(f).sort()).toEqual(["contexts/ord.json", "contexts/pay.json", "domain.json"]);
    const domain = JSON.parse(f["domain.json"]);
    expect(domain.nodes.map((n: { id: string }) => n.id)).toEqual(["c3", "e3", "loose"]);
    expect(domain.edges.map((e: { id: string }) => e.id)).toEqual(["x3", "x4"]); // crossing + inline
    const ord = JSON.parse(f["contexts/ord.json"]);
    expect(ord).toEqual({
      context: "ord",
      nodes: [
        { id: "c1", type: "command", label: "c1", properties: {} },
        { id: "e1", type: "domainEvent", label: "e1", order: 0, properties: {} },
      ],
      edges: [produces("x1", "c1", "e1")],
    });

    const back = merge(f);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(back.model.nodes)).toEqual(byId(model().nodes));
    expect(byId(back.model.edges)).toEqual(byId(model().edges));
    expect(back.model.contexts).toEqual(model().contexts);
  });

  it("refuses a node that names its context inside a context file [AC-4]", () => {
    const f = edit(files(), "contexts/ord.json", (v) => {
      (v.nodes as Record<string, unknown>[])[0].context = "ord";
    });
    expect(error(f)).toBe("contexts/ord.json: node c1 carries context - the file is its context");
  });

  it("refuses a domain-file node naming a linked context [AC-4]", () => {
    const f = edit(files(), "domain.json", (v) => {
      (v.nodes as unknown[]).push(ev("stray", "pay"));
    });
    expect(error(f)).toContain("node stray names context pay, whose elements live in contexts/pay.json");
  });

  it.each([
    ["/abs/ord.json", "must be a relative path"],
    ["C:/x.json", "must be a relative path"],
    ["contexts\\ord.json", "must be a relative path"],
    ["../ord.json", "must stay inside the model's folder"],
    ["contexts//ord.json", "must stay inside the model's folder"],
    ["contexts/ord.yaml", "must be a .json file"],
    ["domain.json", "cannot be the domain file"],
  ])("refuses the link %s [AC-5]", (link, problem) => {
    expect(linkProblem(link)).toBe(problem);
    const f = edit(files(), "domain.json", (v) => {
      (v.contexts as Record<string, unknown>[])[0].file = link;
    });
    expect(error(f)).toBe(`context ord: file "${link}" ${problem}`);
  });

  it("refuses a link that is not a string, shared, or missing [AC-5]", () => {
    const notPath = edit(files(), "domain.json", (v) => {
      (v.contexts as Record<string, unknown>[])[0].file = 3;
    });
    expect(error(notPath)).toBe("context ord: file must be a path");
    const shared = edit(files(), "domain.json", (v) => {
      (v.contexts as Record<string, unknown>[])[1].file = "contexts/ord.json";
    });
    expect(error(shared)).toBe('contexts ord and pay both link "contexts/ord.json" - one file each');
    const missing = files();
    delete missing["contexts/pay.json"];
    expect(error(missing)).toBe('context pay: linked file "contexts/pay.json" is missing');
  });

  it("refuses an id used in two files [AC-6]", () => {
    const node = edit(files(), "contexts/pay.json", (v) => {
      (v.nodes as Record<string, unknown>[])[0].id = "c1";
    });
    expect(error(node)).toBe("id c1 is used in both contexts/ord.json and contexts/pay.json");
    const edge = edit(files(), "domain.json", (v) => {
      (v.edges as Record<string, unknown>[])[0].id = "x1";
    });
    expect(error(edge)).toBe("id x1 is used in both domain.json and contexts/ord.json");
  });

  it("refuses an edge filed in the wrong place [AC-3]", () => {
    const inDomain = edit(files(), "domain.json", (v) => {
      (v.edges as unknown[]).push(produces("x9", "c2", "e2"));
    });
    expect(error(inDomain)).toBe("domain.json: edge x9 joins two elements of pay - it belongs in contexts/pay.json");
    const leaving = edit(files(), "contexts/ord.json", (v) => {
      (v.edges as unknown[]).push(produces("x9", "c1", "e3"));
    });
    expect(error(leaving)).toBe("contexts/ord.json: edge x9 leaves context ord - it belongs in domain.json");
  });

  it("refuses unreadable or mislabelled context files", () => {
    expect(error({ ...files(), "contexts/ord.json": "{" })).toBe("contexts/ord.json is not valid JSON.");
    expect(error({ ...files(), "contexts/ord.json": "[]" })).toBe(
      'contexts/ord.json: must be { "context", "nodes", "edges" }',
    );
    const wrong = edit(files(), "contexts/ord.json", (v) => {
      v.context = "pay";
    });
    expect(error(wrong)).toBe('contexts/ord.json: says context "pay", but context ord links it');
  });

  it("reports an unreadable domain file the way an import does", () => {
    expect(mergeFiles("{", {})).toEqual({ ok: false, error: "domain.json is not valid JSON." });
    expect(mergeFiles("[]", {}).ok).toBe(false);
  });

  it("validates the merged model with the schema", () => {
    const f = edit(files(), "contexts/ord.json", (v) => {
      (v.nodes as Record<string, unknown>[])[0].type = "nonsense";
    });
    expect(error(f)).toMatch(/^Invalid model at nodes\.\d+\.type/);
  });

  it("refuses a context id reused as another context's or a node's id [AC-6]", () => {
    const ctx = edit(files(), "domain.json", (v) => {
      (v.contexts as Record<string, unknown>[])[2].id = "ord";
    });
    expect(error(ctx)).toBe("id ord is used in both domain.json and domain.json");
    const node = edit(files(), "contexts/ord.json", (v) => {
      (v.nodes as Record<string, unknown>[])[0].id = "pay";
    });
    expect(error(node)).toBe("id pay is used in both domain.json and contexts/ord.json");
  });

  it("never gives two contexts the same default file [AC-9]", () => {
    const ctxs = [
      { id: "a b", name: "A", order: 0 },
      { id: "a-b", name: "B", order: 1 },
      { id: "x", name: "X", order: 2, file: "contexts/a-b-2.json" },
    ];
    expect(linkAll(ctxs).map((c) => c.file)).toEqual(["contexts/a-b.json", "contexts/a-b-3.json", "contexts/a-b-2.json"]);
  });

  it("links every context that has no file, keeping existing links [AC-9]", () => {
    expect(defaultLink("a b/c")).toBe("contexts/a-b-c.json");
    expect(linkAll(model().contexts).map((c) => c.file)).toEqual([
      "contexts/ord.json",
      "contexts/pay.json",
      "contexts/shp.json",
    ]);
  });
});
