// Best-effort local autosave. The model is stored as the validated DSL JSON, so
// a corrupt or stale entry is rejected on load (importJSON, which also migrates
// older versions) and the app starts empty instead of crashing (us-00005-FR-2).

import { exportJSON, fromModel, importJSON } from "@/lib/dsl/serialize";
import type { Context, ContextRelationship } from "@/lib/dsl/schema";
import type { Level } from "@/lib/eventstorming/levels";
import type { DiscoveryItem } from "./store";
import type { ESEdge, ESNode } from "./types";

export const STORAGE_KEY = "event-storming:model";
// The discovery wall is scratch state kept OUT of the model DSL (decision-00004);
// it lives under its own key and never round-trips through exportJSON/importJSON.
export const STORAGE_KEY_DISCOVERY = "event-storming:discovery";

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
