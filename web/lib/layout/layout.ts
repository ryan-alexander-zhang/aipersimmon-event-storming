// Deterministic banded layout. Position is a pure function of the model:
//   y = band(type)             (fixed row per element type)
//   x = column(context, order) (timeline slot; a Domain Event's slice shares its column)
// The user never sets positions — this is what keeps the board readable.

import type { Context } from "@/lib/dsl/schema";
import { BAND_ORDER, bandIndex } from "@/lib/eventstorming/elements";
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
        // 2. propagate the event's slot + lane upstream across its slice. An
        //    event is produced either directly by a Command (produces, Process)
        //    or via an Aggregate boundary (emits, Design); from the Command we
        //    also pull its Actor, Constraint, and Aggregate into the column.
        const agg = sourceOf(edges, ev.id, "emits");
        if (agg) set(agg, ctx, col, lane);
        const cmd = sourceOf(edges, ev.id, "produces") ?? (agg && sourceOf(edges, agg, "handledBy"));
        if (cmd) {
          set(cmd, ctx, col, lane);
          const actor = sourceOf(edges, cmd, "issues");
          if (actor) set(actor, ctx, col, lane);
          const constraint = sourceOf(edges, cmd, "constrainedBy");
          if (constraint) set(constraint, ctx, col, lane);
          const aggViaCmd = sourceOf(edges, cmd, "handledBy");
          if (aggViaCmd) set(aggViaCmd, ctx, col, lane);
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

  // 4. free (unplaced) nodes have no timeline slot; tile them horizontally in
  //    their band, side by side. They must not share a column within a band —
  //    the sub-lane stacking a shared column triggers means *concurrency*, which
  //    does not apply here. Fill the LOWEST available columns per (context, band),
  //    skipping only columns a placed node in that same band holds. This keeps
  //    free nodes compact from column 0 and stops one placed node (e.g. a Command
  //    connected to a far Event) from evacuating the rest to higher columns.
  const occupied = new Map<string, Set<number>>(); // `${ctx}:${band}` → placed columns
  for (const [id, p] of place) {
    const t = byId.get(id)?.type;
    if (!t) continue;
    const k = `${p.ctx}:${bandIndex(t)}`;
    (occupied.get(k) ?? occupied.set(k, new Set()).get(k)!).add(p.col);
  }
  const nextFree = new Map<string, number>(); // `${ctx}:${band}` → next column to try
  for (const n of nodes) {
    if (place.has(n.id)) continue;
    const ctx = ctxOf(n.id);
    const key = `${ctx}:${bandIndex(n.type)}`;
    const taken = occupied.get(key);
    let col = nextFree.get(key) ?? 0;
    while (taken?.has(col)) col++;
    nextFree.set(key, col + 1);
    set(n.id, ctx, col, 0);
  }

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

interface Rows {
  subRow: Map<string, number>; // sub-row within the band (lane + collision stack)
  globalCol: Map<string, number>;
  bandTops: number[]; // y of each band's top, indexed by band-order row
}

// Resolve each node's sub-row within its band and, from the busiest band, the
// cumulative top y of every band. A band grows by STACK_H per extra sub-row so
// concurrent lanes never overflow into the band below (issue-00002).
function computeRows(nodes: ESNode[], place: Placed["place"], base: Placed["base"]): Rows {
  const cellCount = new Map<string, number>();
  const subRow = new Map<string, number>();
  const globalCol = new Map<string, number>();
  const maxSubRow = new Array(BAND_ORDER.length).fill(0);
  for (const n of nodes) {
    // computePlacement places every node and bases every referenced context.
    const p = place.get(n.id)!;
    const gcol = base.get(p.ctx)! + p.col;
    const row = bandIndex(n.type);
    // parallel lane offsets the whole slice within its band; a residual counter
    // separates any exact (band, column, lane) collisions.
    const cellKey = `${row}:${gcol.toFixed(2)}:${p.lane}`;
    const stack = cellCount.get(cellKey) ?? 0;
    cellCount.set(cellKey, stack + 1);
    const sr = p.lane + stack;
    subRow.set(n.id, sr);
    globalCol.set(n.id, gcol);
    if (sr > maxSubRow[row]) maxSubRow[row] = sr;
  }
  const bandTops = new Array(BAND_ORDER.length).fill(0);
  for (let r = 1; r < bandTops.length; r++) {
    // a band with maxSubRow s occupies s*STACK_H + BAND_H; an un-stacked band
    // keeps BAND_H, so a board with no concurrency lays out exactly as before.
    bandTops[r] = bandTops[r - 1] + maxSubRow[r - 1] * STACK_H + BAND_H;
  }
  return { subRow, globalCol, bandTops };
}

/** Compute a new node array with positions derived from the model. Pure and
 *  deterministic: the same (nodes, edges, contexts) always yields the same layout. */
export function computeLayout(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): ESNode[] {
  const { place, base } = computePlacement(nodes, edges, contexts);
  const { subRow, globalCol, bandTops } = computeRows(nodes, place, base);
  return nodes.map((n) => ({
    ...n,
    position: {
      x: Math.round(globalCol.get(n.id)! * COL_W),
      y: bandTops[bandIndex(n.type)] + subRow.get(n.id)! * STACK_H,
    },
  }));
}

/** The y of each band's top (indexed by band-order row), for the band rail so it
 *  tracks the variable band heights. Same inputs as computeLayout. */
export function computeBandTops(nodes: ESNode[], edges: ESEdge[], contexts: Context[]): number[] {
  const { place, base } = computePlacement(nodes, edges, contexts);
  return computeRows(nodes, place, base).bandTops;
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
    x: base.get(id)! * COL_W,
    width: width.get(id)! * COL_W - (COL_W - NODE_W),
  }));
}
