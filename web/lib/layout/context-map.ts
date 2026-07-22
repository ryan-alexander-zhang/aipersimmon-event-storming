// Geometry-based handle routing for Context Map edges (issue-00012). An edge
// leaves the source on the side facing the target and enters the target on the
// facing side, so relationships read cleanly instead of always binding to the
// first (left) handle. Handle ids match ContextNode. Pure — mirrors the board's
// routeHandles for element edges.

export interface XY {
  x: number;
  y: number;
}

export function contextEdgeHandles(a: XY, b: XY): { sourceHandle: string; targetHandle: string } {
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
