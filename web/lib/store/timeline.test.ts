import { describe, expect, it } from "vitest";
import type { ESNode } from "./types";
import {
  dropOrder,
  dropTarget,
  eventSlotIndex,
  gapOrder,
  normalizeContextOrders,
  slotOrders,
  timelineOrder,
} from "./timeline";

// Minimal Domain Event node for the pure timeline helpers.
const ev = (id: string, order: number, ctx?: string): ESNode => ({
  id,
  type: "domainEvent",
  position: { x: 0, y: 0 },
  data: { label: id, context: ctx, order },
});
const other = (id: string, ctx?: string): ESNode => ({
  id,
  type: "command",
  position: { x: 0, y: 0 },
  data: { label: id, context: ctx },
});

describe("timeline helpers [us-00010]", () => {
  it("slotOrders returns sorted distinct orders per context", () => {
    const nodes = [ev("a", 2, "c"), ev("b", 0, "c"), ev("d", 0, "c"), ev("e", 5, "x")];
    expect(slotOrders(nodes, "c")).toEqual([0, 2]); // 0 shared → one slot
    expect(slotOrders(nodes, "x")).toEqual([5]);
    expect(slotOrders(nodes, "none")).toEqual([]);
  });

  it("timelineOrder sorts events by order, then context, then id; excludes non-events [us-00014-AC-2.1]", () => {
    const nodes = [
      ev("e2", 1, "a"),
      other("cmd", "a"),
      ev("e1", 0, "a"),
      ev("e3", 1, "b"), // same order as e2 but later context
      ev("e0", 1, "a"), // same order/context as e2 → tiebreak by id (e0 < e2)
    ];
    expect(timelineOrder(nodes)).toEqual(["e1", "e0", "e2", "e3"]);
  });

  it("eventSlotIndex locates an event's slot; -1 for non-events/unknown", () => {
    const nodes = [ev("a", 0, "c"), ev("b", 3, "c"), other("cmd", "c")];
    expect(eventSlotIndex(nodes, "a")).toBe(0);
    expect(eventSlotIndex(nodes, "b")).toBe(1);
    expect(eventSlotIndex(nodes, "cmd")).toBe(-1);
    expect(eventSlotIndex(nodes, "ghost")).toBe(-1);
  });

  it("gapOrder yields before-first, midpoint, and after-last values", () => {
    expect(gapOrder([0, 1, 2], 0)).toBe(-1);
    expect(gapOrder([0, 1, 2], 1)).toBe(0.5);
    expect(gapOrder([0, 1, 2], 3)).toBe(3);
    expect(gapOrder([], 0)).toBe(0);
  });

  it("normalizeContextOrders collapses gaps but preserves concurrency groups", () => {
    const nodes = [ev("a", 0, "c"), ev("b", 5, "c"), ev("d", 5, "c"), ev("z", 9, "x")];
    const out = normalizeContextOrders(nodes, "c");
    const order = (id: string) => out.find((n) => n.id === id)!.data.order;
    expect(order("a")).toBe(0);
    expect(order("b")).toBe(1);
    expect(order("d")).toBe(1); // concurrency group kept together
    expect(order("z")).toBe(9); // other context untouched
  });

  it("normalizeContextOrders leaves non-event nodes alone", () => {
    const nodes = [ev("a", 3, "c"), other("cmd", "c")];
    const out = normalizeContextOrders(nodes, "c");
    expect(out.find((n) => n.id === "cmd")!.data.order).toBeUndefined();
    expect(out.find((n) => n.id === "a")!.data.order).toBe(0);
  });

  // dropTarget's kind is what the drop indicator draws: gap → insertion line,
  // onto → column highlight (us-00010-AC-6.1).
  describe("dropTarget [us-00010-AC-6.1]", () => {
    const slots = [
      { order: 0, x: 0 },
      { order: 1, x: 230 },
      { order: 2, x: 460 },
    ];
    it("before the first slot when left of all (gap → line)", () => {
      expect(dropTarget(slots, -100, 50)).toEqual({ kind: "gap", index: 0 });
    });
    it("onto a slot when near its anchor (onto → highlight)", () => {
      expect(dropTarget(slots, 235, 50)).toEqual({ kind: "onto", order: 1 });
    });
    it("into a gap when between anchors and outside the onto band (gap → line)", () => {
      expect(dropTarget(slots, 130, 50)).toEqual({ kind: "gap", index: 1 });
    });
    it("after the last slot when right of all", () => {
      expect(dropTarget(slots, 900, 50)).toEqual({ kind: "gap", index: 3 });
    });
    it("empty timeline → the first gap", () => {
      expect(dropTarget([], 42, 50)).toEqual({ kind: "gap", index: 0 });
    });
  });

  describe("dropOrder [us-00010-AC-6.1/7.1]", () => {
    const slots = [
      { order: 0, x: 0 },
      { order: 1, x: 230 },
    ];
    const orders = [0, 1];
    const box = { x: 0, width: 230 };
    const BAND = 30;
    const MARGIN = 100;
    it("a gap drop yields an insertion order [us-00010-AC-6.1]", () => {
      expect(dropOrder(slots, orders, box, -50, BAND, MARGIN)).toBe(-1); // before first
      expect(dropOrder(slots, orders, box, 115, BAND, MARGIN)).toBe(0.5); // between the two
    });
    it("an onto drop yields the target slot's order (concurrency) [us-00010-AC-6.1]", () => {
      expect(dropOrder(slots, orders, box, 5, BAND, MARGIN)).toBe(0);
    });
    it("a drop beyond the context box + margin cancels (null) [us-00010-AC-7.1]", () => {
      expect(dropOrder(slots, orders, box, 400, BAND, MARGIN)).toBeNull();
      expect(dropOrder(slots, orders, box, 5, BAND, MARGIN)).not.toBeNull(); // inside → commits
    });
  });
});
