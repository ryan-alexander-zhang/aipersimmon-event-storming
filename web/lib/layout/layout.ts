// Deterministic banded layout. Position is a pure function of the model:
//   y = band(type)             (fixed row per element type)
//   x = column(context, order) (timeline slot; a Domain Event's slice shares its column)
// The user never sets positions — this is what keeps the board readable.

import type { Context } from "@/lib/dsl/schema";
import { bandIndex } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";

export const COL_W = 230;
export const BAND_H = 132;
export const STACK_H = 70;
export const CTX_GAP_COLS = 0.5; // extra spacing between contexts, in columns
export const NODE_W = 190;

interface Placement {
  col: number; // local column within the node's context (timeline slot)
  ctx: string; // context id
  lane: number; // parallel sub-lane within the slot (concurrent events)
}

function sourceOf(edges: ESEdge[], target: string, rel: RelationType): string | undefined {
  return edges.find((e) => e.target === target && e.data?.relation === rel)?.source;
}
function targetsOf(edges: ESEdge[], source: string, rel: RelationType): string[] {
  return edges.filter((e) => e.source === source && e.data?.relation === rel).map((e) => e.target);
}

interface Placed {
  place: Map<string, Placement>;
  ctxIds: string[];
  base: Map<string, number>; // context id → base column
  width: Map<string, number>; // context id → column span
}

// Assign every node a (context, local column) and reserve an ordered column slot
// per context — including empty contexts, so their headers never pile up.
function computePlacement(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): Placed {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ctxOf = (id: string) => byId.get(id)?.data.context ?? "__none";
  const place = new Map<string, Placement>();
  const set = (id: string, ctx: string, col: number, lane: number) => {
    if (id && byId.has(id) && !place.has(id)) place.set(id, { ctx, col, lane });
  };

  // 1. Domain Events carry the timeline order. Distinct orders → columns; events
  //    that share an order are concurrent → same column, stacked in sub-lanes.
  const eventsByCtx = new Map<string, ESNode[]>();
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
    const c = n.data.context ?? "__none";
    (eventsByCtx.get(c) ?? eventsByCtx.set(c, []).get(c)!).push(n);
  }
  for (const [ctx, evs] of eventsByCtx) {
    const orders = [...new Set(evs.map((e) => e.data.order ?? 0))].sort((a, b) => a - b);
    const colByOrder = new Map(orders.map((o, i) => [o, i]));
    const byOrder = new Map<number, ESNode[]>();
    for (const ev of evs) {
      const o = ev.data.order ?? 0;
      (byOrder.get(o) ?? byOrder.set(o, []).get(o)!).push(ev);
    }
    for (const [o, group] of byOrder) {
      const col = colByOrder.get(o) ?? 0;
      group.sort((a, b) => a.id.localeCompare(b.id));
      group.forEach((ev, lane) => {
        set(ev.id, ctx, col, lane);
        // 2. propagate the event's slot + lane across its slice
        const agg = sourceOf(edges, ev.id, "emits");
        if (agg) {
          set(agg, ctx, col, lane);
          const cmd = sourceOf(edges, agg, "handledBy");
          if (cmd) {
            set(cmd, ctx, col, lane);
            const actor = sourceOf(edges, cmd, "issues");
            if (actor) set(actor, ctx, col, lane);
          }
        }
        for (const p of targetsOf(edges, ev.id, "triggers")) set(p, ctx, col, lane);
        for (const rm of targetsOf(edges, ev.id, "updates")) set(rm, ctx, col, lane);
      });
    }
  }

  // 3. hotspots take the slot + lane of the element they annotate
  for (const n of nodes) {
    if (n.type !== "hotspot") continue;
    const tgt = targetsOf(edges, n.id, "annotates")[0];
    const p = tgt ? place.get(tgt) : undefined;
    if (p) set(n.id, p.ctx, p.col, p.lane);
  }

  // 4. anything still unplaced → column 0 of its context
  for (const n of nodes) if (!place.has(n.id)) set(n.id, ctxOf(n.id), 0, 0);

  // 5. ordered contexts (declared first, then any referenced-only) each reserve
  //    a slot; an empty context still gets width 1.
  const ordered = [...contexts].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const ctxIds = ordered.map((c) => c.id);
  for (const p of place.values()) if (!ctxIds.includes(p.ctx)) ctxIds.push(p.ctx);

  const width = new Map<string, number>();
  for (const id of ctxIds) {
    let max = 0;
    for (const p of place.values()) if (p.ctx === id) max = Math.max(max, p.col);
    width.set(id, max + 1);
  }
  const base = new Map<string, number>();
  let acc = 0;
  for (const id of ctxIds) {
    base.set(id, acc);
    acc += (width.get(id) ?? 1) + CTX_GAP_COLS;
  }

  return { place, ctxIds, base, width };
}

/** Compute a new node array with positions derived from the model. Pure and
 *  deterministic: the same (nodes, edges, contexts) always yields the same layout. */
export function computeLayout(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): ESNode[] {
  const { place, base } = computePlacement(nodes, edges, contexts);
  const cellCount = new Map<string, number>();
  return nodes.map((n) => {
    const p = place.get(n.id)!;
    const globalCol = (base.get(p.ctx) ?? 0) + p.col;
    const row = bandIndex(n.type);
    // parallel lane offsets the whole slice within its band; a residual counter
    // separates any exact (band, column, lane) collisions.
    const cellKey = `${row}:${globalCol.toFixed(2)}:${p.lane}`;
    const stack = cellCount.get(cellKey) ?? 0;
    cellCount.set(cellKey, stack + 1);
    return {
      ...n,
      position: {
        x: Math.round(globalCol * COL_W),
        y: row * BAND_H + (p.lane + stack) * STACK_H,
      },
    };
  });
}

/** Flow-space horizontal box of each context (including empty ones), for the
 *  context headers — reserved by order, never piled at the origin. */
export function computeContextBoxes(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[],
): Array<{ id: string; x: number; width: number }> {
  const { ctxIds, base, width } = computePlacement(nodes, edges, contexts);
  return ctxIds.map((id) => ({
    id,
    x: (base.get(id) ?? 0) * COL_W,
    width: (width.get(id) ?? 1) * COL_W - (COL_W - NODE_W),
  }));
}
