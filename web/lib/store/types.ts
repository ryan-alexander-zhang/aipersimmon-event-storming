// React Flow-facing node/edge types for the canvas. Kept as `type` aliases (not
// interfaces) so their data satisfies React Flow's `Record<string, unknown>`
// data constraint.

import type { Edge, Node } from "@xyflow/react";
import type { ElementType } from "@/lib/eventstorming/elements";
import type { RelationType } from "@/lib/eventstorming/relations";

export type ESNodeData = {
  label: string;
  description?: string;
  pivotal?: boolean;
  // bounded context membership; timeline index (Domain Events carry order).
  context?: string;
  order?: number;
};

export type ESNode = Node<ESNodeData, ElementType>;

export type ESEdgeData = {
  relation: RelationType;
  // View-only focus state injected at render time (never serialized):
  //   "none" = no focus active · "on" = in the focused set · "off" = dimmed.
  focusState?: "none" | "on" | "off";
  // View-only center offset (px) for parallel-edge separation of the orthogonal
  // path; siblings in one corridor bump apart. Never serialized.
  pathOffset?: number;
};

export type ESEdge = Edge<ESEdgeData>;
