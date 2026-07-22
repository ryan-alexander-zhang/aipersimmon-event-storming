// Bounded Context is shown as a sticky colour (decision-00005): a deterministic
// tint per context id, so a context keeps its colour across renames. Shared by
// the element sticky (a left stripe) and the context legend. Ungrouped (no
// context) has no tint.

const CONTEXT_TINTS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
  "#14b8a6",
  "#ec4899",
];

export function contextTint(ctx?: string): string | undefined {
  if (!ctx) return undefined;
  let h = 0;
  for (let i = 0; i < ctx.length; i++) h = (h * 31 + ctx.charCodeAt(i)) >>> 0;
  return CONTEXT_TINTS[h % CONTEXT_TINTS.length];
}
