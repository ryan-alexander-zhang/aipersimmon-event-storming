"use client";

import { useReactFlow } from "@xyflow/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect } from "react";
import { useESStore } from "@/lib/store/store";
import { timelineOrder } from "@/lib/store/timeline";

/** Narrative walkthrough overlay (spec-00005): steps through the Domain Event
 *  timeline. Read-only — it moves the selection (so the board dims to the current
 *  event's slice) and frames it; it never edits the model. */
export function Walkthrough() {
  const nodes = useESStore((s) => s.nodes);
  const index = useESStore((s) => s.walk.index);
  const walkStep = useESStore((s) => s.walkStep);
  const stop = useESStore((s) => s.stopWalkthrough);
  const { fitView } = useReactFlow();

  const order = timelineOrder(nodes);
  const total = order.length;
  const currentId = order[index];
  const label = nodes.find((n) => n.id === currentId)?.data.label ?? "—";

  // Frame the current event as the cursor moves.
  useEffect(() => {
    if (currentId) {
      void fitView({ nodes: [{ id: currentId }], padding: 0.4, duration: 300, maxZoom: 1.5 });
    }
  }, [currentId, fitView]);

  // ←/→ step the cursor (us-00028-FR-5). The editor's arrow handler returns while
  // a walkthrough is active, so the same keys never also nudge the timeline
  // (spec-00005-XFR-1). Ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      walkStep(e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walkStep]);

  const nav =
    "flex items-center rounded-md border border-zinc-300 p-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40";

  return (
    <div
      className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 overflow-hidden rounded-lg border border-zinc-200 bg-white px-3 pb-3 pt-2 shadow-lg"
      data-testid="walkthrough"
    >
      <button
        type="button"
        aria-label="Previous event"
        aria-keyshortcuts="ArrowLeft"
        className={nav}
        disabled={index <= 0}
        onClick={() => walkStep(-1)}
      >
        <ChevronLeft size={16} />
      </button>
      {/* The event's name is what the story is told with, so it leads; the counter
          is the supporting detail, not the only signal of where the cursor is. */}
      <div className="min-w-40 max-w-60 text-center">
        <div
          className="truncate text-sm font-semibold text-zinc-900"
          data-testid="walkthrough-label"
        >
          {label}
        </div>
        <div
          className="mt-0.5 font-mono text-[11px] text-zinc-500"
          data-testid="walkthrough-counter"
        >
          {total === 0 ? "0 / 0" : `${index + 1} / ${total}`}
        </div>
      </div>
      <button
        type="button"
        aria-label="Next event"
        aria-keyshortcuts="ArrowRight"
        className={nav}
        disabled={total === 0 || index >= total - 1}
        onClick={() => walkStep(1)}
      >
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        aria-label="Exit walkthrough"
        className="flex items-center rounded-md border border-zinc-300 p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        onClick={stop}
      >
        <X size={15} />
      </button>
      {/* How far along the timeline the cursor is, in the same violet as the Step
          Ring on the board. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-zinc-100">
        <div
          className="h-full bg-violet-700 transition-[width] duration-200"
          style={{ width: `${total === 0 ? 0 : ((index + 1) / total) * 100}%` }}
          data-testid="walkthrough-progress"
        />
      </div>
    </div>
  );
}
