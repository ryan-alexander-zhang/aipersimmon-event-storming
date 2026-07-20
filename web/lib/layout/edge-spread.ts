// Parallel-edge separation. When several edges leave the same handle (a fan-out,
// e.g. one Domain Event `updates` two Read Models) or arrive at the same handle
// (a convergence, e.g. two Read Models `inform` one Actor), their bezier paths
// overlap. Giving each sibling a distinct curvature bows them apart so they no
// longer render on top of each other (design-00003 §3 Tier A). Pure — returns a
// per-edge curvature only for edges that share a corridor.

import type { ESEdge } from "@/lib/store/types";

const BASE = 0.15;
const STEP = 0.28;

const key = (node: string | undefined, handle: string | null | undefined) =>
  `${node ?? ""}|${handle ?? ""}`;

function group(edges: ESEdge[], keyOf: (e: ESEdge) => string): Map<string, ESEdge[]> {
  const m = new Map<string, ESEdge[]>();
  for (const e of edges) {
    const k = keyOf(e);
    const arr = m.get(k);
    if (arr) arr.push(e);
    else m.set(k, [e]);
  }
  return m;
}

/** edgeId → curvature, only for edges that share a source or target handle with
 *  a sibling. Deterministic: siblings are ordered by id so the spread is stable. */
export function computeEdgeCurvature(edges: ESEdge[]): Map<string, number> {
  const out = new Map<string, number>();
  const assign = (siblings: ESEdge[]) => {
    if (siblings.length < 2) return;
    [...siblings]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((e, i) => out.set(e.id, BASE + i * STEP));
  };
  // Fan-out first (share source handle), then convergence (share target handle)
  // for edges not already spread.
  for (const g of group(edges, (e) => key(e.source, e.sourceHandle)).values()) assign(g);
  const remaining = edges.filter((e) => !out.has(e.id));
  for (const g of group(remaining, (e) => key(e.target, e.targetHandle)).values()) assign(g);
  return out;
}
