// The DSL is the single source of truth for the model shape. This Zod schema
// produces the TS types used across the app and validates both export (parse)
// and import (safeParse).

import { z } from "zod";
import { CONTEXT_RELATION_TYPES } from "@/lib/eventstorming/context-relations";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { LEVELS } from "@/lib/eventstorming/levels";
import { RELATION_TYPES } from "@/lib/eventstorming/relations";

export const DSL_VERSION = "4.0";

export const propertiesSchema = z.object({
  description: z.string().optional(),
  pivotal: z.boolean().optional(),
  // Hotspot workflow (spec-00003); all optional and additive — absent state = open.
  state: z.enum(["open", "resolved"]).optional(),
  kind: z.enum(["conflict", "question", "risk"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  // Structured rule expression (spec-00011); all optional and additive.
  // condition/execution/parameters are a Policy's; rule is a Constraint's.
  condition: z.string().optional(),
  execution: z.enum(["automatic", "manual"]).optional(),
  parameters: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  rule: z.string().optional(),
});

// A bounded context: a named region/attribute over the global timeline (decision-00005).
// classification is the optional strategic subdomain type (spec-00004 FR4).
export const contextSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  order: z.number(),
  classification: z.enum(["core", "supporting", "generic"]).optional(),
});

export const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ELEMENT_TYPES),
  label: z.string(),
  // bounded context membership (optional for global actors/systems)
  context: z.string().optional(),
  // global timeline index (Domain Events carry it; decision-00005)
  order: z.number().optional(),
  properties: propertiesSchema.default({}),
});

// A typed, directed relationship between two Bounded Contexts (spec-00004 FR5):
// source = upstream, target = downstream. A pair may carry more than one.
export const contextRelationshipSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(CONTEXT_RELATION_TYPES),
});

export const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.enum(RELATION_TYPES),
});

export const metaSchema = z.object({
  name: z.string(),
  level: z.enum(LEVELS).default("design"),
  createdAt: z.string(),
});

export const modelSchema = z.object({
  version: z.literal(DSL_VERSION),
  meta: metaSchema,
  contexts: z.array(contextSchema).default([]),
  contextRelationships: z.array(contextRelationshipSchema).default([]),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type NodeProperties = z.infer<typeof propertiesSchema>;
export type Context = z.infer<typeof contextSchema>;
export type ContextRelationship = z.infer<typeof contextRelationshipSchema>;
export type ModelNode = z.infer<typeof nodeSchema>;
export type ModelEdge = z.infer<typeof edgeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Model = z.infer<typeof modelSchema>;
