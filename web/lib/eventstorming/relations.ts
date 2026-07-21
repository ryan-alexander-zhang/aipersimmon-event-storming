// Semantic relation types (canvas edge types) and the connection-rule table.
// A connection is valid only if some rule matches (source type, target type);
// the resolved rule also names the relation the edge carries.

import { ELEMENT_TYPES, type ElementType } from "./elements";

export const RELATION_TYPES = [
  "issues",
  "produces",
  "constrainedBy",
  "handledBy",
  "emits",
  "triggers",
  "invokes",
  "updates",
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
  // Process-level causal spine: a Command produces the Domain Event it causes,
  // without needing an Aggregate (decision-00003).
  { relation: "produces", sources: ["command"], targets: ["domainEvent"] },
  // Design-level input: a Constraint restricts performing a Command.
  { relation: "constrainedBy", sources: ["command"], targets: ["constraint"] },
  // Design-level output: the Aggregate boundary handles the Command and emits.
  { relation: "handledBy", sources: ["command"], targets: ["aggregate", "externalSystem"] },
  { relation: "emits", sources: ["aggregate", "externalSystem"], targets: ["domainEvent"] },
  { relation: "triggers", sources: ["domainEvent"], targets: ["policy"] },
  { relation: "invokes", sources: ["policy"], targets: ["command"] },
  { relation: "updates", sources: ["domainEvent"], targets: ["readModel"] },
  { relation: "informs", sources: ["readModel"], targets: ["actor"] },
  { relation: "annotates", sources: ["hotspot"], targets: [...ELEMENT_TYPES] },
];

/** The relation an edge from `source` to `target` would carry, or null if the
 *  connection is not allowed. Rules are mutually exclusive on the (source,
 *  target) pair (a Command has several rules, one per target), so at most one
 *  matches. */
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
