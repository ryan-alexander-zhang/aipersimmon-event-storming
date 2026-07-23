"use client";

import { Handle, type NodeProps } from "@xyflow/react";
import { Star } from "lucide-react";
import type { DiffStatus } from "@/lib/dsl/diff";
import type { DiffChange } from "@/lib/dsl/diff-display";
import { contextTint } from "@/lib/eventstorming/context-color";
import { ELEMENT_DEFINITIONS } from "@/lib/eventstorming/elements";
import type { ESNode } from "@/lib/store/types";
import { HANDLE_STYLE, HANDLES, ICONS } from "./element-node";

// Diff overlay (us-00023): unchanged elements recede; added/changed get a coloured
// ring so they read at a glance against the dimmed board.
const DIFF_STYLE: Record<DiffStatus, { boxShadow?: string; opacity?: number }> = {
  unchanged: { opacity: 0.35 },
  added: { boxShadow: "0 0 0 3px #16a34a" },
  changed: { boxShadow: "0 0 0 3px #f59e0b" },
  removed: {}, // removed elements are listed, not drawn on the target board
};

/** Read-only sticky for the Compare view (spec-00008): the visual of ElementNode
 *  without any editing wiring, so a snapshot board can never mutate the live model
 *  (us-00022-FR-3). Keeps ElementNode's four-sided handles so edges route the same
 *  way (routeHandles). */
export function SnapshotNode({ type, data }: NodeProps<ESNode>) {
  const def = ELEMENT_DEFINITIONS[type];
  const Icon = ICONS[type];
  const resolved = type === "hotspot" && data.state === "resolved";
  const tint = contextTint(data.context);
  const diff = (data as { diffStatus?: DiffStatus }).diffStatus;
  const change = (data as { diffChange?: DiffChange }).diffChange;

  return (
    <div
      // Full field-level detail on hover (us-00023 FR-9): native title, so no popover
      // positioning against the React Flow transform.
      title={change?.detail || undefined}
      className={`relative rounded-md px-3 py-2 text-sm text-zinc-900 shadow-sm ${
        type === "externalSystem" ? "min-w-[168px] max-w-[230px]" : "min-w-[120px] max-w-[200px]"
      }`}
      style={{
        background: def.color,
        opacity: resolved ? 0.55 : undefined,
        borderLeft: tint ? `5px solid ${tint}` : undefined,
        ...(diff ? DIFF_STYLE[diff] : {}),
      }}
    >
      {HANDLES.map(({ id, type, position }) => (
        <Handle key={id} id={id} type={type} position={position} style={HANDLE_STYLE} />
      ))}
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="shrink-0 opacity-70" />
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
          {def.label}
        </span>
        {type === "domainEvent" && data.pivotal && (
          <Star size={12} className="ml-auto fill-current opacity-80" aria-label="pivotal" />
        )}
      </div>
      <div className="mt-1 break-words font-medium">{data.label}</div>
      {change?.renamedFrom && (
        <div className="break-words text-xs text-rose-700/70 line-through" data-testid="diff-renamed-from">
          {change.renamedFrom}
        </div>
      )}
      {change && change.chips.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1" data-testid="diff-chips">
          {change.chips.map((c) => (
            <span
              key={c}
              className="rounded bg-white/60 px-1 text-[9px] font-semibold tracking-wide text-zinc-700"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
