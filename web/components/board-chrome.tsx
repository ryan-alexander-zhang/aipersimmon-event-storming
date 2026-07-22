"use client";

import { useViewport } from "@xyflow/react";
import { Plus, X } from "lucide-react";
import {
  BAND_ORDER,
  type Band,
  ELEMENT_BAND,
  ELEMENT_DEFINITIONS,
} from "@/lib/eventstorming/elements";
import { contextTint, SUBDOMAIN_STYLE, type Subdomain } from "@/lib/eventstorming/context-color";
import { LEVEL_TYPES } from "@/lib/eventstorming/levels";
import { computeBandTops } from "@/lib/layout/layout";
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
  const { y: vy, zoom } = useViewport();
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const level = useESStore((s) => s.level);
  const addNode = useESStore((s) => s.addNode);
  const renameContext = useESStore((s) => s.renameContext);
  const setContextClassification = useESStore((s) => s.setContextClassification);
  const removeContext = useESStore((s) => s.removeContext);
  const setSelected = useESStore((s) => s.setSelected);

  const visibleBands = new Set(LEVEL_TYPES[level].map((t) => ELEMENT_BAND[t]));

  const bandTops = computeBandTops(nodes, edges, contexts, level);
  const nameOf = new Map(contexts.map((c) => [c.id, c.name]));

  const addEvent = (ctxId?: string) => setSelected(addNode("domainEvent", ctxId));

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

      {/* context legend — chips (colour + name + add-event + remove). On the board
          a context is identified by the sticky tint (decision-00005), not a
          spanning column bar; Ungrouped events get no chip (added via the palette). */}
      {contexts.length > 0 && (
        <div className="pointer-events-auto absolute left-1/2 top-2 flex max-w-[80%] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
          {contexts
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur-sm"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: contextTint(c.id) }}
                />
                <input
                  className="w-24 min-w-0 bg-transparent text-xs font-semibold text-zinc-700 outline-none focus:bg-white/60"
                  value={nameOf.get(c.id) ?? c.name}
                  onChange={(e) => renameContext(c.id, e.target.value)}
                  aria-label="Context name"
                />
                {/* Subdomain classification (spec-00004 FR4): a badge-coloured
                    selector; empty = unclassified. */}
                <select
                  className="rounded border px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide outline-none"
                  aria-label="Classification"
                  data-classification={c.classification ?? ""}
                  value={c.classification ?? ""}
                  onChange={(e) =>
                    setContextClassification(c.id, (e.target.value || undefined) as Subdomain | undefined)
                  }
                  style={
                    c.classification
                      ? {
                          borderColor: SUBDOMAIN_STYLE[c.classification].color,
                          color: SUBDOMAIN_STYLE[c.classification].color,
                        }
                      : { borderColor: "#d4d4d8", color: "#a1a1aa" }
                  }
                >
                  <option value="">—</option>
                  <option value="core">Core</option>
                  <option value="supporting">Supporting</option>
                  <option value="generic">Generic</option>
                </select>
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
            ))}
        </div>
      )}
    </div>
  );
}
