// Serialize between the React Flow canvas (nodes + edges) and the DSL Model.
// Export validates with the schema (parse); import validates untrusted JSON
// (safeParse) before it can touch the app state.

import type { ESEdge, ESNode } from "@/lib/store/types";
import { DSL_VERSION, type Model, modelSchema } from "./schema";

export interface ModelMeta {
  name: string;
  createdAt: string;
}

/** Canvas → DSL. Throws (via schema.parse) if the canvas is somehow invalid. */
export function toModel(nodes: ESNode[], edges: ESEdge[], meta: ModelMeta): Model {
  const draft = {
    version: DSL_VERSION,
    meta: { name: meta.name, level: "process", createdAt: meta.createdAt },
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.data.label,
      position: { x: n.position.x, y: n.position.y },
      properties: {
        ...(n.data.description !== undefined ? { description: n.data.description } : {}),
        ...(n.data.pivotal !== undefined ? { pivotal: n.data.pivotal } : {}),
      },
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      relation: e.data?.relation,
    })),
  };
  return modelSchema.parse(draft);
}

/** DSL → canvas. */
export function fromModel(model: Model): { nodes: ESNode[]; edges: ESEdge[] } {
  return {
    nodes: model.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: {
        label: n.label,
        ...(n.properties.description !== undefined
          ? { description: n.properties.description }
          : {}),
        ...(n.properties.pivotal !== undefined ? { pivotal: n.properties.pivotal } : {}),
      },
    })),
    edges: model.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      data: { relation: e.relation },
      label: e.relation,
    })),
  };
}

export function exportJSON(nodes: ESNode[], edges: ESEdge[], meta: ModelMeta): string {
  return JSON.stringify(toModel(nodes, edges, meta), null, 2);
}

export type ImportResult =
  | { ok: true; model: Model }
  | { ok: false; error: string };

/** Parse and validate untrusted JSON into a Model, or return a readable error. */
export function importJSON(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const result = modelSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "(root)";
    return { ok: false, error: `Invalid model at ${path}: ${first?.message ?? "unknown error"}` };
  }
  return { ok: true, model: result.data };
}
