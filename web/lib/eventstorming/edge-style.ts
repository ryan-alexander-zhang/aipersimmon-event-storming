// Visual styling for semantic edges, by relation type. Two tiers let the eye
// follow a chain by weight and colour instead of untangling geometry: the
// causal chain (actor→command→…→event→policy) renders heavier and saturated;
// secondary relations (read-side updates/informs and hotspot annotations)
// render thinner and lighter. Pure data — no rendering here (design-00003 §3).

import type { RelationType } from "./relations";

export type RelationTier = "chain" | "secondary";

export interface RelationStyle {
  color: string;
  width: number;
  tier: RelationTier;
}

const CHAIN_W = 2;
const SECONDARY_W = 1.25;

export const RELATION_STYLE: Record<RelationType, RelationStyle> = {
  issues: { tier: "chain", color: "#2563eb", width: CHAIN_W },
  produces: { tier: "chain", color: "#b45309", width: CHAIN_W },
  constrainedBy: { tier: "secondary", color: "#0d9488", width: SECONDARY_W },
  handledBy: { tier: "chain", color: "#7c3aed", width: CHAIN_W },
  emits: { tier: "chain", color: "#ea580c", width: CHAIN_W },
  triggers: { tier: "chain", color: "#9333ea", width: CHAIN_W },
  invokes: { tier: "chain", color: "#0891b2", width: CHAIN_W },
  updates: { tier: "secondary", color: "#16a34a", width: SECONDARY_W },
  informs: { tier: "secondary", color: "#65a30d", width: SECONDARY_W },
  annotates: { tier: "secondary", color: "#db2777", width: SECONDARY_W },
};
