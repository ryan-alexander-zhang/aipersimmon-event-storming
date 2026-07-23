import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@/lib/dsl/schema";
import type { DiscoveryItem } from "./store";
import type { ESEdge, ESNode } from "./types";
import type { Model } from "@/lib/dsl/schema";
import type { Snapshot } from "./store";
import {
  clearDiscovery,
  clearSaved,
  clearSnapshots,
  loadDiscovery,
  loadModel,
  loadSnapshots,
  saveDiscovery,
  saveModel,
  saveSnapshots,
  STORAGE_KEY,
  STORAGE_KEY_DISCOVERY,
  STORAGE_KEY_SNAPSHOTS,
} from "./persistence";

const contexts: Context[] = [{ id: "ord", name: "Ordering", order: 0 }];
const nodes: ESNode[] = [
  { id: "a1", type: "actor", position: { x: 0, y: 0 }, data: { label: "Customer", context: "ord" } },
  {
    id: "e1",
    type: "domainEvent",
    position: { x: 0, y: 0 },
    data: { label: "Order Placed", context: "ord", order: 0, pivotal: true },
  },
];
const edges: ESEdge[] = [];

describe("persistence v2 (T10/RT7)", () => {
  beforeEach(() => clearSaved());

  it("saves and restores the model incl. contexts + level [us-00005-FR-1]", () => {
    saveModel(nodes, edges, contexts, "process");
    const loaded = loadModel();
    expect(loaded?.contexts).toEqual(contexts);
    expect(loaded?.level).toBe("process");
    expect(loaded?.nodes.map((n) => n.data)).toEqual(nodes.map((n) => n.data));
  });

  it("returns null when nothing is saved", () => {
    expect(loadModel()).toBeNull();
  });

  it("returns null (not throw) for corrupt storage [us-00005-FR-2]", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not valid json ]");
    expect(loadModel()).toBeNull();
  });

  it("returns null for schema-invalid stored data [us-00005-FR-2]", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "2.0", nodes: [] }));
    expect(loadModel()).toBeNull();
  });

  it("no-ops safely without a window (SSR guard)", () => {
    const original = globalThis.window;
    // @ts-expect-error simulate a non-browser environment
    delete globalThis.window;
    try {
      expect(() => saveModel(nodes, edges, contexts, "design")).not.toThrow();
      expect(loadModel()).toBeNull();
      expect(() => clearSaved()).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});

describe("discovery persistence [spec-00002]", () => {
  const items: DiscoveryItem[] = [
    { id: "d1", label: "Order Placed", x: 40, y: 10 },
    { id: "d2", label: "Payment Failed", x: 220, y: 90 },
  ];

  beforeEach(() => {
    clearSaved();
    clearDiscovery();
  });

  it("round-trips the discovery wall [us-00016-AC-6.1]", () => {
    saveDiscovery(items);
    expect(loadDiscovery()).toEqual(items);
  });

  it("returns an empty wall when nothing is saved or the entry is corrupt", () => {
    expect(loadDiscovery()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY_DISCOVERY, "{ not json ]");
    expect(loadDiscovery()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY_DISCOVERY, JSON.stringify({ items: [{ id: 1 }] }));
    expect(loadDiscovery()).toEqual([]); // shape-invalid items filtered out
  });

  it("keeps the wall entirely out of the model DSL [us-00016-AC-5.1, spec-00002-XAC-1.1]", () => {
    saveDiscovery(items);
    saveModel(nodes, edges, contexts, "big-picture");
    // the model store holds no discovery data...
    const modelRaw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    expect(modelRaw).not.toContain("Payment Failed");
    // ...and clearing the model leaves the wall intact (separate keys)
    clearSaved();
    expect(loadDiscovery()).toEqual(items);
    // exportJSON is what saveModel writes; it has no notion of discovery items
    expect(loadModel()?.nodes.some((n) => n.data.label === "Payment Failed")).toBeFalsy();
  });

  it("clears only the discovery key, not the model", () => {
    saveModel(nodes, edges, contexts, "design");
    saveDiscovery(items);
    clearDiscovery();
    expect(loadDiscovery()).toEqual([]);
    expect(loadModel()).not.toBeNull(); // model survives
  });
});

describe("snapshot persistence [spec-00008 / decision-00008]", () => {
  const model: Model = {
    version: "4.0",
    meta: { name: "Event Storming", level: "design", createdAt: "2026-01-01T00:00:00.000Z" },
    contexts: [{ id: "ord", name: "Ordering", order: 0 }],
    contextRelationships: [],
    nodes: [{ id: "e1", type: "domainEvent", label: "Order Placed", context: "ord", order: 0, properties: {} }],
    edges: [],
  };
  const snap: Snapshot = { id: "s1", name: "as-is", createdAt: "2026-01-01T00:00:00.000Z", model };

  beforeEach(() => {
    clearSaved();
    clearSnapshots();
  });

  it("round-trips snapshots [us-00021-AC-6.2]", () => {
    saveSnapshots([snap]);
    expect(loadSnapshots()).toEqual([snap]);
  });

  it("returns [] when nothing is saved or the entry is corrupt", () => {
    expect(loadSnapshots()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY_SNAPSHOTS, "{ not json ]");
    expect(loadSnapshots()).toEqual([]);
  });

  it("migrates a snapshot whose model predates the current DSL [us-00021-AC-7.1]", () => {
    // A v3.0 model (no contextRelationships) stored as a snapshot.
    const v3 = { version: "3.0", meta: model.meta, contexts: model.contexts, nodes: model.nodes, edges: [] };
    window.localStorage.setItem(
      STORAGE_KEY_SNAPSHOTS,
      JSON.stringify({ snapshots: [{ id: "s1", name: "old", createdAt: "t", model: v3 }] }),
    );
    const loaded = loadSnapshots();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].model.version).toBe("4.0");
    expect(loaded[0].model.contextRelationships).toEqual([]);
  });

  it("drops a schema-invalid snapshot without crashing [us-00021-AC-7.1]", () => {
    window.localStorage.setItem(
      STORAGE_KEY_SNAPSHOTS,
      JSON.stringify({
        snapshots: [
          { id: "bad", name: "x", createdAt: "t", model: { version: "4.0", nodes: [] } },
          snap,
        ],
      }),
    );
    expect(loadSnapshots()).toEqual([snap]); // only the valid one survives
  });

  it("keeps snapshots out of the model DSL and independent of it [us-00021-AC-6.1]", () => {
    saveSnapshots([snap]);
    saveModel(nodes, edges, contexts, "design");
    const modelRaw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    expect(modelRaw).not.toContain("as-is"); // snapshot name never in the model export
    clearSaved();
    expect(loadSnapshots()).toEqual([snap]); // separate keys — snapshots survive
  });

  it("no-ops safely without a window (SSR guard)", () => {
    const original = globalThis.window;
    // @ts-expect-error simulate a non-browser environment
    delete globalThis.window;
    try {
      expect(() => saveSnapshots([snap])).not.toThrow();
      expect(loadSnapshots()).toEqual([]);
      expect(() => clearSnapshots()).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});
