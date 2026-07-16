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
};

export type ESNode = Node<ESNodeData, ElementType>;

export type ESEdgeData = {
  relation: RelationType;
};

export type ESEdge = Edge<ESEdgeData>;
