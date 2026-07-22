"use client";

import { useViewport } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import {
  BAND_ORDER,
  type Band,
  ELEMENT_BAND,
  ELEMENT_DEFINITIONS,
} from "@/lib/eventstorming/elements";
import { LEVEL_TYPES } from "@/lib/eventstorming/levels";
import { computeBandTops, computeContextBoxes } from "@/lib/layout/layout";
import { useESStore } from "@/lib/store/store";

const BAND_LABEL: Record<Band, string> = {
  actorSystem: "Actors / Systems",
  command: "Commands",
  constraint: "Constraints",
  aggregate: "Aggregates",
  domainEvent: "Domain Events",
  policy: "Policies",
  readModel: "Read Models",
  hotspot: "Hot Spots",
  opportunity: "Opportunities",
};

const BAND_COLOR: Record<Band, string> = {
  actorSystem: ELEMENT_DEFINITIONS.actor.color,
  command: ELEMENT_DEFINITIONS.command.color,
  constraint: ELEMENT_DEFINITIONS.constraint.color,
  aggregate: ELEMENT_DEFINITIONS.aggregate.color,
  domainEvent: ELEMENT_DEFINITIONS.domainEvent.color,
  policy: ELEMENT_DEFINITIONS.policy.color,
  readModel: ELEMENT_DEFINITIONS.readModel.color,
  hotspot: ELEMENT_DEFINITIONS.hotspot.color,
  opportunity: ELEMENT_DEFINITIONS.opportunity.color,
};

/** Band rail (left, y-aligned) and context headers (top, x-aligned) that track
 *  the React Flow viewport so they stay aligned to nodes under pan/zoom. */
export function BoardChrome() {
  const { x: vx, y: vy, zoom } = useViewport();
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const level = useESStore((s) => s.level);
  const addNode = useESStore((s) => s.addNode);
  const renameContext = useESStore((s) => s.renameContext);
  const removeContext = useESStore((s) => s.removeContext);
  const setSelected = useESStore((s) => s.setSelected);

  const visibleBands = new Set(LEVEL_TYPES[level].map((t) => ELEMENT_BAND[t]));

  const bandTops = computeBandTops(nodes, edges, contexts, level);
  const boxes = new Map(computeContextBoxes(nodes, edges, contexts).map((b) => [b.id, b]));
  const nameOf = new Map(contexts.map((c) => [c.id, c.name]));

  const addEvent = (ctxId?: string) => setSelected(addNode("domainEvent", ctxId));

  // The context-less bucket: the one layout box that is not a declared context.
  const ungrouped = [...boxes.values()].find((b) => !nameOf.has(b.id));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* band rail — left edge, vertical position tracks the viewport */}
      {BAND_ORDER.map((band, i) => {
        if (!visibleBands.has(band)) return null;
        const top = bandTops[i] * zoom + vy;
        return (
          <div
            key={band}
            className="absolute left-2 flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 shadow-sm backdrop-blur-sm"
            style={{ top: top + 6 }}
          >
            <span
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: BAND_COLOR[band] }}
            />
            {BAND_LABEL[band]}
          </div>
        );
      })}

      {/* context headers — top edge, horizontal position tracks the viewport */}
      {contexts
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => {
          const box = boxes.get(c.id);
          const left = (box ? box.x : 0) * zoom + vx;
          const width = (box ? box.width : 180) * zoom;
          return (
            <div
              key={c.id}
              className="pointer-events-auto absolute top-2 flex items-center gap-1.5 rounded-md border border-dashed border-zinc-400 bg-white/85 px-2 py-1 shadow-sm backdrop-blur-sm"
              style={{ left, width: Math.max(width, 150) }}
            >
              <input
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-zinc-700 outline-none focus:bg-white/60"
                value={nameOf.get(c.id) ?? c.name}
                onChange={(e) => renameContext(c.id, e.target.value)}
                aria-label="Context name"
              />
              <button
                type="button"
                className="flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                onClick={() => addEvent(c.id)}
                title="Add a Domain Event to this context"
              >
                <Plus size={11} /> Event
              </button>
              <button
                type="button"
                className="flex items-center rounded p-0.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => removeContext(c.id)}
                title="Remove context"
                aria-label="Remove context"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}

      {/* Ungrouped — a soft group for context-less elements. No rename/remove; it
          appears only while it has members and can be emptied by assigning them. */}
      {ungrouped && (
        <div
          className="pointer-events-auto absolute top-2 flex items-center gap-1.5 rounded-md border border-dashed border-zinc-300 bg-white/70 px-2 py-1 shadow-sm backdrop-blur-sm"
          style={{ left: ungrouped.x * zoom + vx, width: Math.max(ungrouped.width * zoom, 150) }}
        >
          <span className="min-w-0 flex-1 text-xs font-bold italic text-zinc-400">Ungrouped</span>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
            onClick={() => addEvent()}
            title="Add a Domain Event"
          >
            <Plus size={11} /> Event
          </button>
        </div>
      )}
    </div>
  );
}
