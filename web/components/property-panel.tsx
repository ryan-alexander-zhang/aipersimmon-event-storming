"use client";

import { Trash2 } from "lucide-react";
import { ELEMENT_DEFINITIONS } from "@/lib/eventstorming/elements";
import { useESStore } from "@/lib/store/store";

export function PropertyPanel() {
  const selectedId = useESStore((s) => s.selectedId);
  const node = useESStore((s) => s.nodes.find((n) => n.id === s.selectedId) ?? null);
  const updateNodeData = useESStore((s) => s.updateNodeData);
  const removeNode = useESStore((s) => s.removeNode);

  const wrap = "w-64 shrink-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-3";

  if (!node) {
    return (
      <aside className={wrap}>
        <p className="text-xs text-zinc-500">Select an element to edit it.</p>
      </aside>
    );
  }

  const def = ELEMENT_DEFINITIONS[node.type];
  const isHotspot = node.type === "hotspot";
  const field = "mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm";

  return (
    <aside className={wrap} key={selectedId}>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: def.color }} />
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {def.label}
        </span>
      </div>

      <label className="block text-xs font-medium text-zinc-600">
        {isHotspot ? "Text" : "Label"}
        <input
          className={field}
          value={node.data.label}
          onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
        />
      </label>

      {!isHotspot && (
        <label className="mt-3 block text-xs font-medium text-zinc-600">
          Description
          <textarea
            className={`${field} h-20 resize-none`}
            value={node.data.description ?? ""}
            onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          />
        </label>
      )}

      {node.type === "domainEvent" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={!!node.data.pivotal}
            onChange={(e) => updateNodeData(node.id, { pivotal: e.target.checked })}
          />
          Pivotal event
        </label>
      )}

      <button
        type="button"
        className="mt-4 flex items-center gap-1.5 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        onClick={() => removeNode(node.id)}
      >
        <Trash2 size={14} /> Delete
      </button>
    </aside>
  );
}
