"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { ELEMENT_DEFINITIONS, type ElementType } from "@/lib/eventstorming/elements";
import { useESStore } from "@/lib/store/store";

// Contextual slice actions per selected element type. `dir` says whether the new
// node is the source ("from") or target ("to") of the relation with the selection;
// the relation itself is resolved from the two types by the store.
type SliceAction = { label: string; type: ElementType; dir: "from" | "to" };

const SLICE: Partial<Record<ElementType, SliceAction[]>> = {
  domainEvent: [
    { label: "+ Aggregate (produces)", type: "aggregate", dir: "from" },
    { label: "+ Policy (triggers)", type: "policy", dir: "to" },
    { label: "+ Read Model (updates)", type: "readModel", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  aggregate: [
    { label: "+ Command (handled by)", type: "command", dir: "from" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  command: [
    { label: "+ Actor (issues)", type: "actor", dir: "from" },
    { label: "+ Aggregate (acts on)", type: "aggregate", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  policy: [
    { label: "+ Command (invokes)", type: "command", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  readModel: [
    { label: "+ Actor (informs)", type: "actor", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  actor: [
    { label: "+ Command (issues)", type: "command", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
  externalSystem: [
    { label: "+ Domain Event (emits)", type: "domainEvent", dir: "to" },
    { label: "+ Hotspot", type: "hotspot", dir: "from" },
  ],
};

export function PropertyPanel() {
  const selectedId = useESStore((s) => s.selectedId);
  const node = useESStore((s) => s.nodes.find((n) => n.id === s.selectedId) ?? null);
  const nodes = useESStore((s) => s.nodes);
  const contexts = useESStore((s) => s.contexts);
  const addNode = useESStore((s) => s.addNode);
  const connect = useESStore((s) => s.connect);
  const updateNodeData = useESStore((s) => s.updateNodeData);
  const removeNode = useESStore((s) => s.removeNode);
  const reorderEvent = useESStore((s) => s.reorderEvent);
  const reassignContext = useESStore((s) => s.reassignContext);
  const setSelected = useESStore((s) => s.setSelected);

  const wrap = "w-64 shrink-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-3";

  if (!node) {
    return (
      <aside className={wrap}>
        <p className="text-xs text-zinc-500">Select an element to edit it, or add a Domain Event from a context header to start a slice.</p>
      </aside>
    );
  }

  const def = ELEMENT_DEFINITIONS[node.type];
  const isHotspot = node.type === "hotspot";
  const field = "mt-1 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm";
  const ctx = node.data.context ?? contexts[0]?.id ?? "";

  const runSlice = (a: SliceAction) => {
    const newId = addNode(a.type, ctx, a.type === "hotspot" ? { label: "Hotspot?" } : undefined);
    const conn =
      a.dir === "from"
        ? { source: newId, target: node.id }
        : { source: node.id, target: newId };
    connect({ ...conn, sourceHandle: null, targetHandle: null });
    setSelected(newId);
  };

  const moveEvent = (delta: -1 | 1) => {
    const siblings = nodes
      .filter((n) => n.type === "domainEvent" && n.data.context === node.data.context)
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
    const idx = siblings.findIndex((s) => s.id === node.id);
    const swap = siblings[idx + delta];
    if (!swap) return;
    const a = siblings[idx].data.order ?? idx;
    const b = swap.data.order ?? idx + delta;
    reorderEvent(siblings[idx].id, b);
    reorderEvent(swap.id, a);
  };

  const actions = SLICE[node.type] ?? [];

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
            className={`${field} h-16 resize-none`}
            value={node.data.description ?? ""}
            onChange={(e) => updateNodeData(node.id, { description: e.target.value })}
          />
        </label>
      )}

      {contexts.length > 0 && (
        <label className="mt-3 block text-xs font-medium text-zinc-600">
          Bounded context
          <select
            className={field}
            value={node.data.context ?? ""}
            onChange={(e) => reassignContext(node.id, e.target.value)}
          >
            {node.data.context === undefined && <option value="">—</option>}
            {contexts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {node.type === "domainEvent" && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={!!node.data.pivotal}
              onChange={(e) => updateNodeData(node.id, { pivotal: e.target.checked })}
            />
            Pivotal event
          </label>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Timeline</span>
            <button
              type="button"
              className="flex items-center rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100"
              onClick={() => moveEvent(-1)}
              title="Move earlier"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              className="flex items-center rounded border border-zinc-300 px-1.5 py-0.5 hover:bg-zinc-100"
              onClick={() => moveEvent(1)}
              title="Move later"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Build slice
          </div>
          <div className="flex flex-col gap-1.5">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className="flex items-center gap-2 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                onClick={() => runSlice(a)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: ELEMENT_DEFINITIONS[a.type].color }}
                />
                {a.label}
              </button>
            ))}
          </div>
        </div>
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
