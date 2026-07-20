"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";
import { RELATION_STYLE } from "@/lib/eventstorming/edge-style";
import { offsetOrthogonalPath } from "@/lib/layout/edge-path";
import type { ESEdge } from "@/lib/store/types";

const DIM_OPACITY = 0.12;
const FOCUS_WIDTH_BOOST = 1.5;
const CORNER_RADIUS = 8;

/** Semantic edge: an orthogonal (right-angle, rounded-corner) connector coloured
 *  and weighted by relation type, dimmed when a focus set is active and this edge
 *  is outside it, and labelled only when it is in the focused set — so the
 *  un-focused board stays label-free (design-00003 Tier A/B). */
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
  // Edges sharing a corridor get a small center offset so they bump apart. A
  // straight/aligned smoothstep ignores a center offset, so offset edges use a
  // manually jogged orthogonal path instead (issue-00003).
  const offset = data?.pathOffset ?? 0;
  const vertical = sourcePosition === Position.Top || sourcePosition === Position.Bottom;
  const [path, labelX, labelY] =
    offset === 0
      ? getSmoothStepPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          borderRadius: CORNER_RADIUS,
        })
      : offsetOrthogonalPath(sourceX, sourceY, targetX, targetY, vertical, offset);

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
