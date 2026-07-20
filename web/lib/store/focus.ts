// Focus set: given the node under attention (hover or selection), the nodes and
// edges that make up its immediate neighbourhood. The board dims everything
// outside this set so a large model is read one chain at a time (design-00003
// §2/§3 Tier A). Pure — no store or React Flow dependency.

import type { ESEdge } from "./types";

export interface FocusSet {
  /** true when a node is focused; false means "show everything at full opacity". */
  active: boolean;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

const EMPTY: FocusSet = { active: false, nodeIds: new Set(), edgeIds: new Set() };

/** The node that drives the focus set: a hovered node takes precedence over the
 *  selected one, so pointing at a node previews its chain without changing the
 *  selection. */
export function focusSource(
  hoveredId: string | null | undefined,
  selectedId: string | null | undefined,
): string | null {
  return hoveredId ?? selectedId ?? null;
}

/** The focused node plus its direct neighbours, and the edges incident to it. */
export function computeFocus(focusId: string | null | undefined, edges: ESEdge[]): FocusSet {
  if (!focusId) return EMPTY;
  const nodeIds = new Set<string>([focusId]);
  const edgeIds = new Set<string>();
  for (const e of edges) {
    if (e.source === focusId || e.target === focusId) {
      edgeIds.add(e.id);
      nodeIds.add(e.source);
      nodeIds.add(e.target);
    }
  }
  return { active: true, nodeIds, edgeIds };
}
