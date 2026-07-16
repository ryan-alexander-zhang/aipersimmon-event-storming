"use client";

import { ELEMENT_DEFINITIONS, ELEMENT_TYPES } from "@/lib/eventstorming/elements";

export const ELEMENT_DND_MIME = "application/es-element";

/** Left sidebar of draggable element types. Drag onto the canvas to create a
 *  node of that type (handled in the editor's onDrop). */
export function Palette() {
  return (
    <aside className="w-44 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Elements
      </h2>
      <div className="flex flex-col gap-2">
        {ELEMENT_TYPES.map((type) => (
          <div
            key={type}
            draggable
            data-testid={`palette-${type}`}
            onDragStart={(e) => {
              e.dataTransfer.setData(ELEMENT_DND_MIME, type);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded-md px-2 py-1.5 text-xs font-medium text-zinc-900 shadow-sm active:cursor-grabbing"
            style={{ background: ELEMENT_DEFINITIONS[type].color }}
          >
            {ELEMENT_DEFINITIONS[type].label}
          </div>
        ))}
      </div>
    </aside>
  );
}
