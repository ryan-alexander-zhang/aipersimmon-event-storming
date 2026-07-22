// Strategic context-mapping relationship types (spec-00004 FR5). These are the
// canonical DDD context-map patterns (Eric Evans; ddd-crew), a focused 5-pattern
// subset (decision-00007). Every relationship is directed source → target, read
// as upstream → downstream; symmetric patterns ignore the arrow's meaning. Pure
// data — no rendering here (parallels edge-style.ts for element relations).

export const CONTEXT_RELATION_TYPES = [
  "partnership",
  "sharedKernel",
  "customerSupplier",
  "conformist",
  "acl",
] as const;

export type ContextRelationType = (typeof CONTEXT_RELATION_TYPES)[number];

export interface ContextRelationStyle {
  /** Short label shown on the map edge. */
  label: string;
  color: string;
  /** Symmetric patterns (arrow direction is not meaningful). */
  symmetric: boolean;
}

export const CONTEXT_RELATION_STYLE: Record<ContextRelationType, ContextRelationStyle> = {
  partnership: { label: "Partnership", color: "#0891b2", symmetric: true },
  sharedKernel: { label: "Shared Kernel", color: "#7c3aed", symmetric: true },
  customerSupplier: { label: "Customer/Supplier", color: "#2563eb", symmetric: false },
  conformist: { label: "Conformist", color: "#b45309", symmetric: false },
  acl: { label: "Anticorruption Layer", color: "#dc2626", symmetric: false },
};

/** The default type for a freshly drawn relationship (us-00020-FR-2). */
export const DEFAULT_CONTEXT_RELATION: ContextRelationType = "customerSupplier";
