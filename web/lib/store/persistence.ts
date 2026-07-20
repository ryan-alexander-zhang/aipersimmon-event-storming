// Best-effort local autosave. The model is stored as the validated DSL JSON, so
// a corrupt or stale entry is rejected on load (importJSON, which also migrates
// older versions) and the app starts empty instead of crashing (us-00005-FR-2).

import { exportJSON, fromModel, importJSON } from "@/lib/dsl/serialize";
import type { Context } from "@/lib/dsl/schema";
import type { ESEdge, ESNode } from "./types";

export const STORAGE_KEY = "event-storming:model";

export function saveModel(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): void {
  if (typeof window === "undefined") return;
  try {
    const json = exportJSON(nodes, edges, contexts, {
      name: "Event Storming",
      createdAt: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    // Quota or serialisation errors are non-fatal for autosave.
  }
}

export function loadModel(): { nodes: ESNode[]; edges: ESEdge[]; contexts: Context[] } | null {
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
