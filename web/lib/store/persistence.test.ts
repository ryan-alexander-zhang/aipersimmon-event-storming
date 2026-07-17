import { beforeEach, describe, expect, it } from "vitest";
import type { ESEdge, ESNode } from "./types";
import { clearSaved, loadModel, saveModel, STORAGE_KEY } from "./persistence";

const nodes: ESNode[] = [
  { id: "a1", type: "actor", position: { x: 0, y: 0 }, data: { label: "Customer" } },
  {
    id: "e1",
    type: "domainEvent",
    position: { x: 100, y: 20 },
    data: { label: "Order Placed", pivotal: true },
  },
];
const edges: ESEdge[] = [];

describe("persistence (T10)", () => {
  beforeEach(() => clearSaved());

  it("saves and restores the model [us-00005-FR-1]", () => {
    saveModel(nodes, edges);
    const loaded = loadModel();
    expect(loaded?.nodes).toEqual(nodes);
    expect(loaded?.edges).toEqual(edges);
  });

  it("returns null when nothing is saved", () => {
    expect(loadModel()).toBeNull();
  });

  it("returns null (not throw) for corrupt storage [us-00005-FR-2]", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not valid json ]");
    expect(loadModel()).toBeNull();
  });

  it("returns null for schema-invalid stored data [us-00005-FR-2]", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: "1.0", nodes: [] }));
    expect(loadModel()).toBeNull();
  });

  it("no-ops safely without a window (SSR guard)", () => {
    const original = globalThis.window;
    // @ts-expect-error simulate a non-browser environment
    delete globalThis.window;
    try {
      expect(() => saveModel(nodes, edges)).not.toThrow();
      expect(loadModel()).toBeNull();
      expect(() => clearSaved()).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});
