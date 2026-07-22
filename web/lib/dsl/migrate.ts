// Forward-migrate an older DSL document to the current version so old files
// still import. Unknown/newer versions are returned untouched for the schema to
// accept or reject.

const DEFAULT_CONTEXT = { id: "default", name: "Default", order: 0 };

function migrateV1toV2(v1: Record<string, unknown>): unknown {
  const rawNodes = Array.isArray(v1.nodes) ? (v1.nodes as Record<string, unknown>[]) : [];

  // Domain Events carry the timeline order; derive it from their v1 x position.
  const events = rawNodes
    .filter((n) => n.type === "domainEvent")
    .map((n) => ({ id: n.id, x: readX(n) }))
    .sort((a, b) => a.x - b.x);
  const eventOrder = new Map(events.map((e, i) => [e.id, i]));

  const nodes = rawNodes.map((n) => {
    const base: Record<string, unknown> = {
      id: n.id,
      type: n.type,
      label: n.label,
      context: DEFAULT_CONTEXT.id,
      properties: n.properties ?? {},
    };
    if (n.type === "domainEvent") base.order = eventOrder.get(n.id) ?? 0;
    return base;
  });

  return {
    version: "2.0",
    meta: v1.meta,
    contexts: [DEFAULT_CONTEXT],
    nodes,
    edges: Array.isArray(v1.edges) ? v1.edges : [],
  };
}

function readX(n: Record<string, unknown>): number {
  const p = n.position as { x?: number } | undefined;
  return typeof p?.x === "number" ? p.x : 0;
}

// v2 → v3: per-context `order` becomes a single global `order` (decision-00005).
// Sort events by their current visible sequence (context.order, per-context
// order), then dense-rank into a global order — events that were concurrent
// within a context (same context + order) keep an equal global order
// (design-00005 §2). Contexts stay as attributes; nothing is lost.
function migrateV2toV3(v2: Record<string, unknown>): unknown {
  const nodes = Array.isArray(v2.nodes) ? (v2.nodes as Record<string, unknown>[]) : [];
  const contexts = Array.isArray(v2.contexts) ? (v2.contexts as Record<string, unknown>[]) : [];
  const ctxOrder = new Map(contexts.map((c) => [c.id as string, (c.order as number) ?? 0]));
  const events = nodes
    .filter((n) => n.type === "domainEvent")
    .map((n) => ({
      id: n.id as string,
      c: ctxOrder.get(n.context as string) ?? 0,
      o: (n.order as number) ?? 0,
    }))
    .sort((a, b) => a.c - b.c || a.o - b.o);
  const rank = new Map<string, number>();
  let r = -1;
  let prev = "";
  for (const e of events) {
    const key = `${e.c}:${e.o}`;
    if (key !== prev) {
      r++;
      prev = key;
    }
    rank.set(e.id, r);
  }
  const migrated = nodes.map((n) =>
    n.type === "domainEvent" ? { ...n, order: rank.get(n.id as string) ?? 0 } : n,
  );
  return { ...v2, version: "3.0", nodes: migrated };
}

/** Migrate any supported older document to the latest shape (chained). */
export function migrateToLatest(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  let r = raw as Record<string, unknown>;
  if (r.version === "1.0") r = migrateV1toV2(r) as Record<string, unknown>;
  if (r.version === "2.0") r = migrateV2toV3(r) as Record<string, unknown>;
  return r;
}
