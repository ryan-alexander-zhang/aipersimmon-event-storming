// Parallel-edge separation by corridor. The banded layout puts a whole slice in
// one column, so orthogonal edges that run along the same column (or the same
// row) land on one centreline and overlap — a fan-out, a convergence, or a long
// back-edge (informs / invokes / annotates) crossing the causal chain. We group
// edges into corridors (a column for vertical edges, a row for horizontal ones)
// and assign lanes so overlapping spans get a small side offset while the
// touching causal chain stays on the centre. Pure; needs node positions.
// (design-00003 §3 Tier B; generalises the earlier shared-handle version —
// issue-00003.)

import type { ESEdge } from "@/lib/store/types";

interface Pt {
  x: number;
  y: number;
}

const GAP = 26; // px between lanes; stays well within a column

/** lane 0 = centre; higher lanes fan out symmetrically (+G, −G, +2G, −2G, …). */
function laneOffset(lane: number): number {
  if (lane === 0) return 0;
  const step = Math.ceil(lane / 2);
  return lane % 2 === 1 ? step * GAP : -step * GAP;
}

const overlaps = (a: { lo: number; hi: number }, b: { lo: number; hi: number }) =>
  !(a.hi <= b.lo || b.hi <= a.lo); // touching endpoints do not count as overlap

/** edgeId → centre offset (px), only for edges pushed off their corridor's
 *  centreline. Deterministic; shorter edges keep the centre so the causal chain
 *  stays straight and only long/crossing edges bow aside. */
export function computeEdgeOffsets(edges: ESEdge[], pos: Map<string, Pt>): Map<string, number> {
  const out = new Map<string, number>();
  const corridors = new Map<string, Array<{ id: string; lo: number; hi: number }>>();
  for (const e of edges) {
    const s = pos.get(e.source);
    const t = pos.get(e.target);
    if (!s || !t) continue;
    const vertical = Math.abs(t.y - s.y) >= Math.abs(t.x - s.x);
    const key = vertical ? `V:${Math.round((s.x + t.x) / 2)}` : `H:${Math.round((s.y + t.y) / 2)}`;
    const [a, b] = vertical ? [s.y, t.y] : [s.x, t.x];
    const item = { id: e.id, lo: Math.min(a, b), hi: Math.max(a, b) };
    const arr = corridors.get(key);
    if (arr) arr.push(item);
    else corridors.set(key, [item]);
  }
  for (const items of corridors.values()) {
    if (items.length < 2) continue;
    // shorter edges claim the centre first; stable tie-break for determinism
    items.sort(
      (p, q) => p.hi - p.lo - (q.hi - q.lo) || p.lo - q.lo || p.id.localeCompare(q.id),
    );
    const lanes: Array<Array<{ lo: number; hi: number }>> = [];
    for (const it of items) {
      let lane = lanes.findIndex((occ) => occ.every((o) => !overlaps(it, o)));
      if (lane === -1) {
        lane = lanes.length;
        lanes.push([]);
      }
      lanes[lane].push(it);
      const offset = laneOffset(lane);
      if (offset !== 0) out.set(it.id, offset);
    }
  }
  return out;
}
