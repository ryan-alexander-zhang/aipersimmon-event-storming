import { beforeEach, describe, expect, it } from "vitest";
import type { Context } from "@/lib/dsl/schema";
import type { ESEdge, ESNode } from "./types";
import { clearSaved, loadModel, saveModel, STORAGE_KEY } from "./persistence";

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

  it("saves and restores the model incl. contexts [us-00005-FR-1]", () => {
    saveModel(nodes, edges, contexts);
    const loaded = loadModel();
    expect(loaded?.contexts).toEqual(contexts);
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
      expect(() => saveModel(nodes, edges, contexts)).not.toThrow();
      expect(loadModel()).toBeNull();
      expect(() => clearSaved()).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});
