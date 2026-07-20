"use client";

import { Plus } from "lucide-react";
import { useViewport } from "@xyflow/react";
import {
  BAND_ORDER,
  type Band,
  ELEMENT_DEFINITIONS,
} from "@/lib/eventstorming/elements";
import { BAND_H, contextExtents } from "@/lib/layout/layout";
import { useESStore } from "@/lib/store/store";

const BAND_LABEL: Record<Band, string> = {
  actorSystem: "Actors / Systems",
  command: "Commands",
  aggregate: "Aggregates",
  domainEvent: "Domain Events",
  policy: "Policies",
  readModel: "Read Models",
  hotspot: "Hot Spots",
};

const BAND_COLOR: Record<Band, string> = {
  actorSystem: ELEMENT_DEFINITIONS.actor.color,
  command: ELEMENT_DEFINITIONS.command.color,
  aggregate: ELEMENT_DEFINITIONS.aggregate.color,
  domainEvent: ELEMENT_DEFINITIONS.domainEvent.color,
  policy: ELEMENT_DEFINITIONS.policy.color,
  readModel: ELEMENT_DEFINITIONS.readModel.color,
  hotspot: ELEMENT_DEFINITIONS.hotspot.color,
};

/** Band rail (left, y-aligned) and context headers (top, x-aligned) that track
 *  the React Flow viewport so they stay aligned to nodes under pan/zoom. */
export function BoardChrome() {
  const { x: vx, y: vy, zoom } = useViewport();
  const nodes = useESStore((s) => s.nodes);
  const contexts = useESStore((s) => s.contexts);
  const addNode = useESStore((s) => s.addNode);
  const setSelected = useESStore((s) => s.setSelected);

  const extents = contextExtents(nodes);

  const addEvent = (ctxId: string) => setSelected(addNode("domainEvent", ctxId));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* band rail — left edge, vertical position tracks the viewport */}
      {BAND_ORDER.map((band, i) => {
        const top = i * BAND_H * zoom + vy;
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
          const ext = extents.get(c.id);
          const left = (ext ? ext.x : 0) * zoom + vx;
          const width = (ext ? ext.width : 180) * zoom;
          return (
            <div
              key={c.id}
              className="pointer-events-auto absolute top-2 flex items-center gap-2 rounded-md border border-dashed border-zinc-400 bg-white/85 px-2.5 py-1 shadow-sm backdrop-blur-sm"
              style={{ left, minWidth: Math.max(width, 140) }}
            >
              <span className="truncate text-xs font-bold text-zinc-700">{c.name}</span>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                onClick={() => addEvent(c.id)}
                title="Add a Domain Event to this context"
              >
                <Plus size={11} /> Event
              </button>
            </div>
          );
        })}
    </div>
  );
}
