// Best-effort local autosave. The model is stored as the validated DSL JSON, so
// a corrupt or stale entry is rejected on load (importJSON, which also migrates
// older versions) and the app starts empty instead of crashing (us-00005-FR-2).

import { migrateToLatest } from "@/lib/dsl/migrate";
import { exportJSON, fromModel, importJSON } from "@/lib/dsl/serialize";
import { type Context, type ContextRelationship, modelSchema } from "@/lib/dsl/schema";
import type { Level } from "@/lib/eventstorming/levels";
import type { DiscoveryItem, Snapshot } from "./store";
import type { ESEdge, ESNode } from "./types";

export const STORAGE_KEY = "event-storming:model";
// The discovery wall is scratch state kept OUT of the model DSL (decision-00004);
// it lives under its own key and never round-trips through exportJSON/importJSON.
export const STORAGE_KEY_DISCOVERY = "event-storming:discovery";
// Named snapshots (spec-00008 FR10) live outside the model DSL under their own key
// (decision-00008): each is a full validated Model, migrated on load, and never
// part of the current model's export.
export const STORAGE_KEY_SNAPSHOTS = "event-storming:snapshots";

export function saveModel(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[],
  level: Level,
  contextRelationships: ContextRelationship[] = [],
): void {
  if (typeof window === "undefined") return;
  try {
    const json = exportJSON(
      nodes,
      edges,
      contexts,
      { name: "Event Storming", createdAt: new Date().toISOString(), level },
      contextRelationships,
    );
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Quota or serialisation errors are non-fatal for autosave.
  }
}

export function loadModel(): {
  nodes: ESNode[];
  edges: ESEdge[];
  contexts: Context[];
  contextRelationships: ContextRelationship[];
  level: Level;
} | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const result = importJSON(raw);
  if (!result.ok) return null;
  return fromModel(result.model);
}

export function clearSaved(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

// Discovery wall persistence — a plain items array, deliberately not DSL-validated
// so it can never leak into or corrupt the model. Best-effort like model autosave.

export function saveDiscovery(items: DiscoveryItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_DISCOVERY, JSON.stringify({ items }));
  } catch {
    // Quota or serialisation errors are non-fatal.
  }
}

export function loadDiscovery(): DiscoveryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY_DISCOVERY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { items?: unknown };
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.filter(
      (it): it is DiscoveryItem =>
        typeof it === "object" &&
        it !== null &&
        typeof (it as DiscoveryItem).id === "string" &&
        typeof (it as DiscoveryItem).label === "string" &&
        typeof (it as DiscoveryItem).x === "number" &&
        typeof (it as DiscoveryItem).y === "number",
    );
  } catch {
    return [];
  }
}

export function clearDiscovery(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY_DISCOVERY);
}

// Snapshot persistence (spec-00008 / decision-00008). Snapshots persist (unlike the
// scratch discovery wall) but stay OUT of the model DSL. Each holds a full Model, so
// on load every snapshot is migrated + validated exactly like the main model; a
// stale or corrupt entry is dropped, never fatal (us-00021-AC-7.1).

export function saveSnapshots(snapshots: Snapshot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify({ snapshots }));
  } catch {
    // Quota or serialisation errors are non-fatal.
  }
}

export function loadSnapshots(): Snapshot[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { snapshots?: unknown };
    if (!Array.isArray(parsed.snapshots)) return [];
    const out: Snapshot[] = [];
    for (const entry of parsed.snapshots) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof (entry as Snapshot).id !== "string" ||
        typeof (entry as Snapshot).name !== "string" ||
        typeof (entry as Snapshot).createdAt !== "string"
      ) {
        continue;
      }
      const e = entry as Snapshot;
      const result = modelSchema.safeParse(migrateToLatest(e.model));
      if (result.success) out.push({ id: e.id, name: e.name, createdAt: e.createdAt, model: result.data });
    }
    return out;
  } catch {
    return [];
  }
}

export function clearSnapshots(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY_SNAPSHOTS);
}
