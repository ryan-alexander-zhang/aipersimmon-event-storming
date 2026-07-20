"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import type { ESEdge } from "@/lib/store/types";

const DIM_OPACITY = 0.12;
const FOCUS_WIDTH_BOOST = 1.5;

/** Semantic edge: coloured/weighted by relation type, dimmed when a focus set is
 *  active and this edge is outside it, and labelled only when it is in the
 *  focused set — so the un-focused board stays label-free (design-00003 Tier A). */
export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps<ESEdge>) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    ...(data?.curvature !== undefined ? { curvature: data.curvature } : {}),
  });

  const relation = data?.relation;
  const style = relation ? RELATION_STYLE[relation] : undefined;
  const focusState = data?.focusState ?? "none";
  const dimmed = focusState === "off";
  const focused = focusState === "on";
  const baseWidth = style?.width ?? 1.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: style?.color ?? "#94a3b8",
          // Focused edges thicken; the flowing dashes come from the `animated`
          // flag set on the edge (React Flow's stroke-dashoffset animation).
          strokeWidth: focused ? baseWidth + FOCUS_WIDTH_BOOST : baseWidth,
          opacity: dimmed ? DIM_OPACITY : 1,
        }}
      />
      {focused && relation && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded bg-white/85 px-1 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {relation}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
