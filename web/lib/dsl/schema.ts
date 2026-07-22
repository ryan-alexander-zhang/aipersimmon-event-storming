// The DSL is the single source of truth for the model shape. This Zod schema
// produces the TS types used across the app and validates both export (parse)
// and import (safeParse).

import { z } from "zod";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { LEVELS } from "@/lib/eventstorming/levels";
import { RELATION_TYPES } from "@/lib/eventstorming/relations";

export const DSL_VERSION = "2.0";

export const propertiesSchema = z.object({
  description: z.string().optional(),
  pivotal: z.boolean().optional(),
  // Hotspot workflow (spec-00003); all optional and additive — absent state = open.
  state: z.enum(["open", "resolved"]).optional(),
  kind: z.enum(["conflict", "question", "risk"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// A bounded context: a column group along the timeline.
export const contextSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  order: z.number(),
});

export const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ELEMENT_TYPES),
  label: z.string(),
  // bounded context membership (optional for global actors/systems)
  context: z.string().optional(),
  // timeline index within the context (Domain Events carry it)
  order: z.number().optional(),
  properties: propertiesSchema.default({}),
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
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type NodeProperties = z.infer<typeof propertiesSchema>;
export type Context = z.infer<typeof contextSchema>;
export type ModelNode = z.infer<typeof nodeSchema>;
export type ModelEdge = z.infer<typeof edgeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Model = z.infer<typeof modelSchema>;
