"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from "@xyflow/react";
import { X } from "lucide-react";
import {
  CONTEXT_RELATION_STYLE,
  CONTEXT_RELATION_TYPES,
  type ContextRelationType,
} from "@/lib/eventstorming/context-relations";
import { useESStore } from "@/lib/store/store";

// A context relationship as a directed, typed edge on the Context Map. Its label
// is an inline type picker + delete, so a relationship is retyped/removed in place
// (us-00020-FR-3/FR-4).
export function ContextRelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const type = (data?.type as ContextRelationType) ?? "customerSupplier";
  const style = CONTEXT_RELATION_STYLE[type];
  const setType = useESStore((s) => s.setContextRelationshipType);
  const remove = useESStore((s) => s.removeContextRelationship);

  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: style.color, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute flex items-center gap-1 rounded bg-white/95 px-1 py-0.5 text-[10px] shadow-sm"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          data-testid="context-relation-label"
        >
          <select
            aria-label="Relationship type"
            className="bg-transparent font-semibold outline-none"
            style={{ color: style.color }}
            value={type}
            onChange={(e) => setType(id, e.target.value as ContextRelationType)}
          >
            {CONTEXT_RELATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTEXT_RELATION_STYLE[t].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Delete relationship"
            className="text-zinc-400 hover:text-red-600"
            onClick={() => remove(id)}
          >
            <X size={11} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
