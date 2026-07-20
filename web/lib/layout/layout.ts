// Deterministic banded layout. Position is a pure function of the model:
//   y = band(type)             (fixed row per element type)
//   x = column(context, order) (timeline slot; a Domain Event's slice shares its column)
// The user never sets positions — this is what keeps the board readable.

import { bandIndex } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { Context } from "@/lib/dsl/schema";
import type { ESEdge, ESNode } from "@/lib/store/types";

export const COL_W = 230;
export const BAND_H = 132;
export const STACK_H = 70;
export const CTX_GAP_COLS = 0.35; // extra spacing between contexts, in columns

interface Placement {
  col: number; // local column within the node's context
  ctx: string; // context id
}

function sourceOf(edges: ESEdge[], target: string, rel: RelationType): string | undefined {
  return edges.find((e) => e.target === target && e.data?.relation === rel)?.source;
}
function targetsOf(edges: ESEdge[], source: string, rel: RelationType): string[] {
  return edges.filter((e) => e.source === source && e.data?.relation === rel).map((e) => e.target);
}

/** Compute a new node array with positions derived from the model. Pure and
 *  deterministic: the same (nodes, edges, contexts) always yields the same layout. */
export function computeLayout(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): ESNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ctxOf = (id: string) => byId.get(id)?.data.context ?? "__none";
  const place = new Map<string, Placement>();
  const set = (id: string, ctx: string, col: number) => {
    if (id && byId.has(id) && !place.has(id)) place.set(id, { ctx, col });
  };

  // 1. Domain Events carry the timeline order → local column within their context.
  const eventsByCtx = new Map<string, ESNode[]>();
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
    const c = n.data.context ?? "__none";
    (eventsByCtx.get(c) ?? eventsByCtx.set(c, []).get(c)!).push(n);
  }
  for (const [ctx, evs] of eventsByCtx) {
    evs.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0) || a.id.localeCompare(b.id));
    evs.forEach((ev, i) => {
      set(ev.id, ctx, i);
      // 2. propagate the event's column across its slice
      const agg = sourceOf(edges, ev.id, "emits");
      if (agg) {
        set(agg, ctx, i);
        const cmd = sourceOf(edges, agg, "handledBy");
        if (cmd) {
          set(cmd, ctx, i);
          const actor = sourceOf(edges, cmd, "issues");
          if (actor) set(actor, ctx, i);
        }
      }
      for (const p of targetsOf(edges, ev.id, "triggers")) set(p, ctx, i);
      for (const rm of targetsOf(edges, ev.id, "updates")) set(rm, ctx, i);
    });
  }

  // 3. hotspots take the column of the element they annotate
  for (const n of nodes) {
    if (n.type !== "hotspot") continue;
    const tgt = targetsOf(edges, n.id, "annotates")[0];
    const p = tgt ? place.get(tgt) : undefined;
    if (p) set(n.id, p.ctx, p.col);
  }

  // 4. anything still unplaced → column 0 of its context
  for (const n of nodes) if (!place.has(n.id)) set(n.id, ctxOf(n.id), 0);

  // 5. context base column (contexts ordered; each as wide as its max local column)
  const ordered = [...contexts].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const ctxIds = ordered.map((c) => c.id);
  for (const p of place.values()) if (!ctxIds.includes(p.ctx)) ctxIds.push(p.ctx);
  const widthOf = (ctx: string) => {
    let max = 0;
    for (const p of place.values()) if (p.ctx === ctx) max = Math.max(max, p.col);
    return max + 1;
  };
  const base = new Map<string, number>();
  let acc = 0;
  for (const id of ctxIds) {
    base.set(id, acc);
    acc += widthOf(id) + CTX_GAP_COLS;
  }

  // 6. stack multiple nodes that land in the same (band, global column)
  const cellCount = new Map<string, number>();
  return nodes.map((n) => {
    const p = place.get(n.id)!;
    const globalCol = (base.get(p.ctx) ?? 0) + p.col;
    const row = bandIndex(n.type);
    const cellKey = `${row}:${globalCol.toFixed(2)}`;
    const stack = cellCount.get(cellKey) ?? 0;
    cellCount.set(cellKey, stack + 1);
    return {
      ...n,
      position: { x: Math.round(globalCol * COL_W), y: row * BAND_H + stack * STACK_H },
    };
  });
}
