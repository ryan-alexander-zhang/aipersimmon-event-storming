// Serialize between the runtime canvas (React Flow nodes + edges + contexts) and
// the DSL Model. Positions are runtime-only (computed by the layout engine) and
// never stored. Export validates with the schema (parse); import migrates older
// documents then validates untrusted JSON (safeParse).

import type { Level } from "@/lib/eventstorming/levels";
import type { ESEdge, ESNode } from "@/lib/store/types";
import { migrateToLatest } from "./migrate";
import {
  type Context,
  type ContextRelationship,
  DSL_VERSION,
  type Model,
  modelSchema,
} from "./schema";

export interface ModelMeta {
  name: string;
  createdAt: string;
  level: Level;
}

/** Canvas → DSL. Throws (via schema.parse) if the model is somehow invalid. */
export function toModel(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[],
  meta: ModelMeta,
  contextRelationships: ContextRelationship[] = [],
): Model {
  const draft = {
    version: DSL_VERSION,
    meta: { name: meta.name, level: meta.level, createdAt: meta.createdAt },
    contexts,
    contextRelationships,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.data.label,
      ...(n.data.context !== undefined ? { context: n.data.context } : {}),
      ...(n.data.order !== undefined ? { order: n.data.order } : {}),
      properties: {
        ...(n.data.description !== undefined ? { description: n.data.description } : {}),
        ...(n.data.pivotal !== undefined ? { pivotal: n.data.pivotal } : {}),
        ...(n.data.state !== undefined ? { state: n.data.state } : {}),
        ...(n.data.kind !== undefined ? { kind: n.data.kind } : {}),
        ...(n.data.priority !== undefined ? { priority: n.data.priority } : {}),
        ...(n.data.resolution !== undefined ? { resolution: n.data.resolution } : {}),
        ...(n.data.resolvedAt !== undefined ? { resolvedAt: n.data.resolvedAt } : {}),
        ...(n.data.condition !== undefined ? { condition: n.data.condition } : {}),
        ...(n.data.execution !== undefined ? { execution: n.data.execution } : {}),
        ...(n.data.parameters !== undefined ? { parameters: n.data.parameters } : {}),
        ...(n.data.rule !== undefined ? { rule: n.data.rule } : {}),
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

/** DSL → canvas. Positions are placeholders; the layout engine computes them. */
export function fromModel(model: Model): {
  nodes: ESNode[];
  edges: ESEdge[];
  contexts: Context[];
  contextRelationships: ContextRelationship[];
  level: Level;
} {
  return {
    contexts: model.contexts,
    contextRelationships: model.contextRelationships,
    level: model.meta.level,
    nodes: model.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        ...(n.context !== undefined ? { context: n.context } : {}),
        ...(n.order !== undefined ? { order: n.order } : {}),
        ...(n.properties.description !== undefined
          ? { description: n.properties.description }
          : {}),
        ...(n.properties.pivotal !== undefined ? { pivotal: n.properties.pivotal } : {}),
        ...(n.properties.state !== undefined ? { state: n.properties.state } : {}),
        ...(n.properties.kind !== undefined ? { kind: n.properties.kind } : {}),
        ...(n.properties.priority !== undefined ? { priority: n.properties.priority } : {}),
        ...(n.properties.resolution !== undefined ? { resolution: n.properties.resolution } : {}),
        ...(n.properties.resolvedAt !== undefined ? { resolvedAt: n.properties.resolvedAt } : {}),
        ...(n.properties.condition !== undefined ? { condition: n.properties.condition } : {}),
        ...(n.properties.execution !== undefined ? { execution: n.properties.execution } : {}),
        ...(n.properties.parameters !== undefined ? { parameters: n.properties.parameters } : {}),
        ...(n.properties.rule !== undefined ? { rule: n.properties.rule } : {}),
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

export function exportJSON(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[],
  meta: ModelMeta,
  contextRelationships: ContextRelationship[] = [],
): string {
  return JSON.stringify(toModel(nodes, edges, contexts, meta, contextRelationships), null, 2);
}

export type ImportResult = { ok: true; model: Model } | { ok: false; error: string };

/** Migrate + validate untrusted JSON into a Model, or return a readable error. */
export function importJSON(json: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const result = modelSchema.safeParse(migrateToLatest(raw));
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".") || "(root)";
    return { ok: false, error: `Invalid model at ${path}: ${first?.message ?? "unknown error"}` };
  }
  return { ok: true, model: result.data };
}
