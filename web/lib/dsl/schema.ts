// The DSL is the single source of truth for the model shape. This Zod schema
// produces the TS types used across the app and validates both export (parse)
// and import (safeParse).

import { z } from "zod";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { RELATION_TYPES } from "@/lib/eventstorming/relations";

export const DSL_VERSION = "1.0";

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const propertiesSchema = z.object({
  description: z.string().optional(),
  pivotal: z.boolean().optional(),
});

export const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ELEMENT_TYPES),
  label: z.string(),
  position: positionSchema,
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
  level: z.literal("process"),
  createdAt: z.string(),
});

export const modelSchema = z.object({
  version: z.literal(DSL_VERSION),
  meta: metaSchema,
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
});

export type Position = z.infer<typeof positionSchema>;
export type NodeProperties = z.infer<typeof propertiesSchema>;
export type ModelNode = z.infer<typeof nodeSchema>;
export type ModelEdge = z.infer<typeof edgeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Model = z.infer<typeof modelSchema>;
