"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  Box,
  Eye,
  Flame,
  Lock,
  type LucideIcon,
  Server,
  Star,
  Terminal,
  User,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ELEMENT_DEFINITIONS, type ElementType } from "@/lib/eventstorming/elements";
import { useESStore } from "@/lib/store/store";
import type { ESNode } from "@/lib/store/types";

const ICONS: Record<ElementType, LucideIcon> = {
  domainEvent: Zap,
  command: Terminal,
  actor: User,
  constraint: Lock,
  aggregate: Box,
  policy: Workflow,
  readModel: Eye,
  externalSystem: Server,
  hotspot: Flame,
};

const HANDLE_STYLE = {
  width: 7,
  height: 7,
  background: "#94a3b8",
  border: "1px solid #fff",
  opacity: 0.5,
} as const;

const HANDLES = [
  { id: "s-top", type: "source", position: Position.Top },
  { id: "t-top", type: "target", position: Position.Top },
  { id: "s-bottom", type: "source", position: Position.Bottom },
  { id: "t-bottom", type: "target", position: Position.Bottom },
  { id: "s-left", type: "source", position: Position.Left },
  { id: "t-left", type: "target", position: Position.Left },
  { id: "s-right", type: "source", position: Position.Right },
  { id: "t-right", type: "target", position: Position.Right },
] as const;

/** Pick the handle pair matching the relation's geometry: vertical slice chains
 *  connect bottom↔top, timeline / cross-column relations connect left↔right. */
export function routeHandles(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0
      ? { sourceHandle: "s-bottom", targetHandle: "t-top" }
      : { sourceHandle: "s-top", targetHandle: "t-bottom" };
  }
  return dx >= 0
    ? { sourceHandle: "s-right", targetHandle: "t-left" }
    : { sourceHandle: "s-left", targetHandle: "t-right" };
}

export function ElementNode({ id, type, data, selected }: NodeProps<ESNode>) {
  const def = ELEMENT_DEFINITIONS[type];
  const Icon = ICONS[type];
  const updateNodeData = useESStore((s) => s.updateNodeData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setDraft(data.label);
    setEditing(true);
  };

  const commit = () => {
    updateNodeData(id, { label: draft.trim() || def.label });
    setEditing(false);
  };

  return (
    <div
      data-testid="node-body"
      className={`relative rounded-md px-3 py-2 text-sm text-zinc-900 shadow-sm ${
        type === "externalSystem" ? "min-w-[168px] max-w-[230px]" : "min-w-[120px] max-w-[200px]"
      }`}
      style={{ background: def.color, outline: selected ? "2px solid #111827" : "none" }}
    >
      {/* Anchor points on all four sides; edges pick the pair that matches the
          slice direction (vertical chain top↔bottom, timeline left↔right). */}
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
      {editing ? (
        <input
          ref={inputRef}
          className="mt-1 w-full rounded bg-white/60 px-1 text-sm outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <div className="mt-1 cursor-text break-words font-medium" onDoubleClick={startEditing}>
          {data.label}
        </div>
      )}
    </div>
  );
}
