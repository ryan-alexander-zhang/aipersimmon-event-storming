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

  const nav =
    "flex items-center rounded-md border border-zinc-300 p-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-40";

  return (
    <div
      className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg"
      data-testid="walkthrough"
    >
      <button
        type="button"
        aria-label="Previous event"
        className={nav}
        disabled={index <= 0}
        onClick={() => walkStep(-1)}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="min-w-36 max-w-56 text-center">
        <div className="font-mono text-[10px] text-zinc-400">
          {total === 0 ? "0 / 0" : `${index + 1} / ${total}`}
        </div>
        <div className="truncate text-xs font-medium text-zinc-800" data-testid="walkthrough-label">
          {label}
        </div>
      </div>
      <button
        type="button"
        aria-label="Next event"
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
    </div>
  );
}
