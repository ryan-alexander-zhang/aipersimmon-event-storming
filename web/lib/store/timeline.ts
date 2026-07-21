// Timeline order helpers for Domain Events (design-00004 §3). A context's
// timeline is the sorted distinct `order` values of its Domain Events; each
// distinct value is one column slot, and events sharing a value are a
// concurrency group stacked in that slot. Edits write a (possibly fractional)
// target order, then normalize the context back to contiguous 0..k-1 — so
// "slot index i" always means "order === i".

import type { ESNode } from "./types";

const isEvent = (n: ESNode) => n.type === "domainEvent";
const orderOf = (n: ESNode) => n.data.order ?? 0;

/** Sorted distinct orders of a context's Domain Events = its column slots. */
export function slotOrders(nodes: ESNode[], ctx: string | undefined): number[] {
  const orders = nodes.filter((n) => isEvent(n) && n.data.context === ctx).map(orderOf);
  return [...new Set(orders)].sort((a, b) => a - b);
}

/** The slot index (0-based) of an event within its context's timeline, or -1. */
export function eventSlotIndex(nodes: ESNode[], eventId: string): number {
  const ev = nodes.find((n) => n.id === eventId);
  if (!ev || !isEvent(ev)) return -1;
  return slotOrders(nodes, ev.data.context).indexOf(orderOf(ev));
}

/** An order value that lands an event at gap `index` (0..slotCount): before the
 *  first slot, between two slots (midpoint), or after the last. Normalization
 *  then collapses the fractional value back to an integer. */
export function gapOrder(orders: number[], index: number): number {
  if (orders.length === 0) return 0;
  if (index <= 0) return orders[0] - 1;
  if (index >= orders.length) return orders[orders.length - 1] + 1;
  return (orders[index - 1] + orders[index]) / 2;
}

/** Remap a context's Domain Event orders to contiguous 0..k-1, preserving
 *  concurrency groups (equal orders stay equal). Other nodes are untouched. */
export function normalizeContextOrders(nodes: ESNode[], ctx: string | undefined): ESNode[] {
  const rank = new Map(slotOrders(nodes, ctx).map((o, i) => [o, i]));
  return nodes.map((n) =>
    isEvent(n) && n.data.context === ctx
      ? { ...n, data: { ...n.data, order: rank.get(orderOf(n)) ?? 0 } }
      : n,
  );
}

/** One timeline column: its `order` value and flow-space x anchor (a member
 *  node's position.x). Slots are passed sorted left→right. */
export interface TimelineSlot {
  order: number;
  x: number;
}

export type DropTarget = { kind: "gap"; index: number } | { kind: "onto"; order: number };

/** Resolve a drag's flow-space `x` against a context's slots into a drop target:
 *  within `ontoBand` of a slot's anchor → make concurrent with it (onto, drawn as
 *  a column highlight); otherwise insert at the gap boundary the x falls into
 *  (0..slotCount, drawn as an insertion line). */
export function dropTarget(slots: TimelineSlot[], x: number, ontoBand: number): DropTarget {
  if (slots.length === 0) return { kind: "gap", index: 0 };
  for (const s of slots) {
    if (Math.abs(x - s.x) <= ontoBand) return { kind: "onto", order: s.order };
  }
  let index = 0;
  while (index < slots.length && x > slots[index].x) index++;
  return { kind: "gap", index };
}

/** The order to commit when a Domain Event is dropped at flow-space `x`, given its
 *  context's slot anchors, slot orders, and box — or null to cancel (dropped more
 *  than `outMargin` outside the context; cross-context moves are out of scope,
 *  us-00010-FR-7). `onto` → the target slot's order (concurrent); a gap → an
 *  insertion order between/beyond slots. */
export function dropOrder(
  slots: TimelineSlot[],
  orders: number[],
  box: { x: number; width: number } | undefined,
  x: number,
  ontoBand: number,
  outMargin: number,
): number | null {
  if (box && (x < box.x - outMargin || x > box.x + box.width + outMargin)) return null;
  const t = dropTarget(slots, x, ontoBand);
  return t.kind === "onto" ? t.order : gapOrder(orders, t.index);
}
