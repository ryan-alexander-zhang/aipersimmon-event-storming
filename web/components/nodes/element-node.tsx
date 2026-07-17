"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
  Box,
  Eye,
  Flame,
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
  aggregate: Box,
  policy: Workflow,
  readModel: Eye,
  externalSystem: Server,
  hotspot: Flame,
};

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
      className="relative min-w-[120px] max-w-[200px] rounded-md px-3 py-2 text-sm text-zinc-900 shadow-sm"
      style={{ background: def.color, outline: selected ? "2px solid #111827" : "none" }}
    >
      <Handle type="target" position={Position.Left} />
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
