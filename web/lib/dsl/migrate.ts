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

/** Migrate any supported older document to the latest shape. */
export function migrateToLatest(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const r = raw as Record<string, unknown>;
  if (r.version === "1.0") return migrateV1toV2(r);
  return raw;
}
