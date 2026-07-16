// Semantic relation types (canvas edge types) and the connection-rule table.
// A connection is valid only if some rule matches (source type, target type);
// the resolved rule also names the relation the edge carries.

import { ELEMENT_TYPES, type ElementType } from "./elements";

export const RELATION_TYPES = [
  "issues",
  "handledBy",
  "emits",
  "triggers",
  "invokes",
  "informs",
  "annotates",
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

export interface ConnectionRule {
  relation: RelationType;
  sources: ElementType[];
  targets: ElementType[];
}

export const CONNECTION_RULES: ConnectionRule[] = [
  { relation: "issues", sources: ["actor"], targets: ["command"] },
  { relation: "handledBy", sources: ["command"], targets: ["aggregate", "externalSystem"] },
  { relation: "emits", sources: ["aggregate", "externalSystem"], targets: ["domainEvent"] },
  { relation: "triggers", sources: ["domainEvent"], targets: ["policy"] },
  { relation: "invokes", sources: ["policy"], targets: ["command"] },
  { relation: "informs", sources: ["readModel"], targets: ["actor"] },
  { relation: "annotates", sources: ["hotspot"], targets: [...ELEMENT_TYPES] },
];

/** The relation an edge from `source` to `target` would carry, or null if the
 *  connection is not allowed. Rules are mutually exclusive on source type, so
 *  at most one matches. */
export function resolveRelation(
  source: ElementType,
  target: ElementType,
): RelationType | null {
  const rule = CONNECTION_RULES.find(
    (r) => r.sources.includes(source) && r.targets.includes(target),
  );
  return rule ? rule.relation : null;
}

export function isValidConnection(source: ElementType, target: ElementType): boolean {
  return resolveRelation(source, target) !== null;
}
