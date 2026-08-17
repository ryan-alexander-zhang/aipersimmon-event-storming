import { beforeEach, describe, expect, it } from "vitest";
import type { Model } from "@/lib/dsl/schema";
import {
  createProject,
  STORAGE_KEY,
  STORAGE_KEY_DISCOVERY,
  STORAGE_KEY_SNAPSHOTS,
  deleteProject,
  getActiveProjectId,
  listProjects,
  loadProject,
  migrateLegacy,
  saveProject,
  setActiveProjectId,
} from "./projects";
import { putRecord } from "./projects-db";
import type { DiscoveryItem, Snapshot } from "./store";

const model: Model = {
  version: "4.0",
  meta: { name: "Ordering", level: "design", createdAt: "2026-01-01T00:00:00.000Z" },
  contexts: [{ id: "ord", name: "Ordering", order: 0 }],
  contextRelationships: [],
  nodes: [
    { id: "e1", type: "domainEvent", label: "Order Placed", context: "ord", order: 0, properties: {} },
  ],
  edges: [],
};
const snapshot: Snapshot = { id: "s1", name: "as-is", createdAt: "2026-01-01T00:00:00.000Z", model };
const discovery: DiscoveryItem[] = [{ id: "d1", label: "Order Placed", x: 40, y: 10 }];

function resetDB(): Promise<void> {
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase("event-storming");
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  window.localStorage.clear();
  await resetDB();
});

describe("project records [us-00030 / us-00032]", () => {
  it("creates a Project and reads it back across connections [us-00030-AC-1.1]", async () => {
    const created = await createProject("Ordering");
    expect(await listProjects()).toEqual([
      expect.objectContaining({ id: created.id, name: "Ordering" }),
    ]);
    const loaded = await loadProject(created.id);
    expect(loaded?.name).toBe("Ordering");
    expect(loaded?.model.nodes).toEqual([]);
    expect(loaded?.dirty).toBe(false);
  });

  it("round-trips a Project's Model, discovery wall, and Snapshots [us-00032-AC-1.1]", async () => {
    const created = await createProject("Ordering");
    await saveProject({ ...created, model, discovery, snapshots: [snapshot] });
    const loaded = await loadProject(created.id);
    expect(loaded?.model).toEqual(model);
    expect(loaded?.discovery).toEqual(discovery);
    expect(loaded?.snapshots).toEqual([snapshot]);
  });

  it("migrates a Project whose stored Model predates the current DSL", async () => {
    const created = await createProject("Ordering");
    const v3 = { version: "3.0", meta: model.meta, contexts: model.contexts, nodes: model.nodes, edges: [] };
    await putRecord({ ...created, model: v3 } as unknown as { id: string });
    const loaded = await loadProject(created.id);
    expect(loaded?.model.version).toBe("4.0");
    expect(loaded?.model.contextRelationships).toEqual([]);
  });

  it("opens a Project with a corrupt Model as an empty board [us-00032-AC-3.1]", async () => {
    const created = await createProject("Ordering");
    await putRecord({ ...created, model: { version: "4.0", nodes: [] } } as unknown as { id: string });
    const loaded = await loadProject(created.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("Ordering");
    expect(loaded?.model.nodes).toEqual([]);
  });

  it("drops a schema-invalid Snapshot and keeps its siblings", async () => {
    const created = await createProject("Ordering");
    await putRecord({
      ...created,
      snapshots: [{ id: "bad", name: "x", createdAt: "t", model: { version: "4.0", nodes: [] } }, snapshot],
    } as unknown as { id: string });
    expect((await loadProject(created.id))?.snapshots).toEqual([snapshot]);
  });

  it("drops a shape-invalid Snapshot entry", async () => {
    const created = await createProject("Ordering");
    await putRecord({ ...created, snapshots: [null, { id: 1 }, snapshot] } as unknown as { id: string });
    expect((await loadProject(created.id))?.snapshots).toEqual([snapshot]);
  });

  it("returns null for a Project that is not there", async () => {
    expect(await loadProject("nope")).toBeNull();
  });

  it("returns null rather than throwing when the store cannot be read", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulate a browser that denies IndexedDB (private mode)
    delete globalThis.indexedDB;
    try {
      expect(await loadProject("anything")).toBeNull();
    } finally {
      globalThis.indexedDB = original;
    }
  });
});

describe("Recent [us-00030-FR-2, us-00030-FR-7]", () => {
  it("lists Projects most-recently-opened first", async () => {
    const a = await createProject("A");
    const b = await createProject("B");
    await saveProject({ ...a, lastOpenedAt: "2026-01-02T00:00:00.000Z" });
    await saveProject({ ...b, lastOpenedAt: "2026-01-01T00:00:00.000Z" });
    expect((await listProjects()).map((p) => p.name)).toEqual(["A", "B"]);
  });

  it("omits an unreadable record and still lists the rest [us-00030-AC-7.1]", async () => {
    await createProject("Ordering");
    await putRecord({ id: "broken" }); // no name / timestamps: identity is unreadable
    expect((await listProjects()).map((p) => p.name)).toEqual(["Ordering"]);
  });

  it("loads a Project's source file, and ignores one that lost its handle", async () => {
    const withSource = await createProject("A");
    const broken = await createProject("B");
    const source = { handle: {}, name: "a.json", lastRefreshedAt: "2026-01-01T00:00:00.000Z" };
    await putRecord({ ...withSource, source } as unknown as { id: string });
    await putRecord({ ...broken, source: { name: "b.json" } } as unknown as { id: string });
    expect((await loadProject(withSource.id))?.source?.name).toBe("a.json");
    expect((await loadProject(broken.id))?.source).toBeUndefined();
  });

  it("reports a Project's source file name", async () => {
    const created = await createProject("Ordering");
    await putRecord({
      ...created,
      source: { handle: {}, name: "ordering.json", lastRefreshedAt: "2026-01-01T00:00:00.000Z" },
    } as unknown as { id: string });
    expect((await listProjects())[0].sourceName).toBe("ordering.json");
  });
});

describe("deleting a Project [us-00030-AC-6.1]", () => {
  it("removes only that Project, and clears it as the active one", async () => {
    const a = await createProject("A");
    const b = await createProject("B");
    setActiveProjectId(a.id);
    await deleteProject(a.id);
    expect((await listProjects()).map((p) => p.name)).toEqual(["B"]);
    expect(await loadProject(b.id)).not.toBeNull();
    expect(getActiveProjectId()).toBeNull();
  });

  it("leaves a different active Project alone", async () => {
    const a = await createProject("A");
    const b = await createProject("B");
    setActiveProjectId(b.id);
    await deleteProject(a.id);
    expect(getActiveProjectId()).toBe(b.id);
  });

  it("no-ops safely without a window (SSR guard)", async () => {
    const original = globalThis.window;
    // @ts-expect-error simulate a non-browser environment
    delete globalThis.window;
    try {
      expect(getActiveProjectId()).toBeNull();
      expect(() => setActiveProjectId("x")).not.toThrow();
      expect(() => setActiveProjectId(null)).not.toThrow();
      expect(await migrateLegacy()).toBeNull();
    } finally {
      globalThis.window = original;
    }
  });
});

describe("migration off the pre-Project keys [us-00032-AC-4.1]", () => {
  beforeEach(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
    window.localStorage.setItem(STORAGE_KEY_DISCOVERY, JSON.stringify({ items: discovery }));
    window.localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify({ snapshots: [snapshot] }));
  });

  it("folds the implicit model, wall, and Snapshots into one Project and drops the keys", async () => {
    const migrated = await migrateLegacy();
    expect(migrated?.name).toBe("Ordering");
    expect(migrated?.model).toEqual(model);
    expect(migrated?.discovery).toEqual(discovery);
    expect(migrated?.snapshots).toEqual([snapshot]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY_DISCOVERY)).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY_SNAPSHOTS)).toBeNull();
    expect(await loadProject(migrated!.id)).not.toBeNull();
  });

  it("runs once: a second call finds nothing to move", async () => {
    await migrateLegacy();
    expect(await migrateLegacy()).toBeNull();
    expect(await listProjects()).toHaveLength(1);
  });

  it("does not migrate when a Project already exists", async () => {
    await createProject("Ordering");
    expect(await migrateLegacy()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it("keeps the wall and Snapshots when the stored model is corrupt", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not valid json ]");
    const migrated = await migrateLegacy();
    expect(migrated?.name).toBe("Untitled");
    expect(migrated?.model.nodes).toEqual([]);
    expect(migrated?.discovery).toEqual(discovery);
    expect(migrated?.snapshots).toEqual([snapshot]);
  });

  it("does nothing when there is no pre-Project data", async () => {
    window.localStorage.clear();
    expect(await migrateLegacy()).toBeNull();
  });

  it("migrates a model that was saved without a wall or Snapshots", async () => {
    window.localStorage.removeItem(STORAGE_KEY_DISCOVERY);
    window.localStorage.removeItem(STORAGE_KEY_SNAPSHOTS);
    const migrated = await migrateLegacy();
    expect(migrated?.model).toEqual(model);
    expect(migrated?.discovery).toEqual([]);
    expect(migrated?.snapshots).toEqual([]);
  });

  it("survives a corrupt wall and Snapshot entry", async () => {
    window.localStorage.setItem(STORAGE_KEY_DISCOVERY, "{ not json ]");
    window.localStorage.setItem(STORAGE_KEY_SNAPSHOTS, "{ not json ]");
    const migrated = await migrateLegacy();
    expect(migrated?.model).toEqual(model);
    expect(migrated?.discovery).toEqual([]);
    expect(migrated?.snapshots).toEqual([]);
  });
});

describe("write failures surface [us-00032-FR-5]", () => {
  it("rejects instead of swallowing when IndexedDB is unavailable", async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulate a browser that denies IndexedDB (private mode)
    delete globalThis.indexedDB;
    try {
      const record = { id: "x", name: "X", createdAt: "t", lastOpenedAt: "t", model, discovery: [], snapshots: [], dirty: false };
      await expect(saveProject(record)).rejects.toThrow(/IndexedDB is unavailable/);
      expect(await listProjects()).toEqual([]); // reads still degrade quietly
    } finally {
      globalThis.indexedDB = original;
    }
  });

  it("degrades to an empty Recent when the stored database is newer than this app", async () => {
    // A tab left open on an older build: opening at DB_VERSION 1 fails with a
    // VersionError rather than downgrading the store.
    await new Promise<void>((resolve) => {
      const req = indexedDB.open("event-storming", 2);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
    });
    expect(await listProjects()).toEqual([]);
  });
});
