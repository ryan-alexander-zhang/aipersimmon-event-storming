// The DSL is the single source of truth for the model shape. This Zod schema
// produces the TS types used across the app and validates both export (parse)
// and import (safeParse).

import { z } from "zod";
import { CONTEXT_RELATION_TYPES } from "@/lib/eventstorming/context-relations";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { LEVELS } from "@/lib/eventstorming/levels";
import { RELATION_TYPES } from "@/lib/eventstorming/relations";

export const DSL_VERSION = "5.2";

export const propertiesSchema = z.object({
  description: z.string().optional(),
  pivotal: z.boolean().optional(),
  // Raised by time passing (a deadline reached, a schedule fired) - the DSL's form
  // of the method's calendar icon. Exempt from the producer checks (decision-00014).
  temporal: z.boolean().optional(),
  // Hotspot workflow (spec-00003); all optional and additive — absent state = open.
  state: z.enum(["open", "resolved"]).optional(),
  kind: z.enum(["conflict", "question", "risk"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  // What closed the Hotspot, and when (us-00033). Kept apart from `description`,
  // which holds the uncertainty itself and has to survive being answered.
  // `resolvedAt` records a thing that happened, so reopening does not clear it.
  resolution: z.string().optional(),
  resolvedAt: z.string().optional(),
  // Structured rule expression (spec-00011); all optional and additive.
  // condition/execution/parameters are a Policy's; rule is a Constraint's.
  condition: z.string().optional(),
  execution: z.enum(["automatic", "manual"]).optional(),
  // Members of one Alternative Set happen instead of each other — at most one of them
  // does. Legal on Domain Event and Command only: they are the two elements that
  // represent something happening at a moment. Membership is this key alone, never
  // derived from edges or `order`, so a fork survives where the moment has no element
  // on the board at all — Big Picture, an outside fact, a deadline (decision-00013).
  alternativeSet: z.string().min(1).optional(),
  parameters: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  rule: z.string().optional(),
});

// Required written text - a name, a sentence, a word - has content, not just length.
// The one definition the editor uses; validate.py's is `.strip()` (issue-00041).
const text = () => z.string().refine((s) => s.trim().length > 0, "is blank");

export const SUBDOMAIN_TYPES = ["core", "supporting", "generic"] as const;

// The named business capability a context realises - one per context, never shared
// by two (decision-00016). Its name defaults to the context's; its type is the
// strategic classification (spec-00004 FR4). Required at design, optional before.
export const subdomainSchema = z.object({
  name: text(),
  type: z.enum(SUBDOMAIN_TYPES).optional(),
});

const lower = (xs: string[]) => xs.map((x) => x.trim().toLowerCase());
const unique = (xs: string[]) => new Set(lower(xs)).size === xs.length;

// A term whose meaning is specific to one context - its Ubiquitous Language
// (decision-00018 B1). The same term in two contexts may mean different things.
// `avoid` lists the words the context does not use for it (decision-00019).
export const termSchema = z.object({
  term: text(),
  meaning: text(),
  avoid: z
    .array(text())
    .refine(unique, "a word is avoided twice")
    .optional(),
});

// A bounded context: a named region/attribute over the global timeline (decision-00005).
export const contextSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  order: z.number(),
  subdomain: subdomainSchema.optional(),
  // Why the context exists: the business problem it solves, in one sentence.
  // Required at design (decision-00018).
  purpose: text().optional(),
  language: z
    .array(termSchema)
    .refine((ts) => unique(ts.map((t) => t.term)), "a term appears twice")
    // a context cannot both use a word and avoid it (decision-00019)
    .refine((ts) => {
      const terms = new Set(lower(ts.map((t) => t.term)));
      return ts.every((t) => lower(t.avoid ?? []).every((w) => !terms.has(w)));
    }, "an avoided word is a term of the same context")
    .optional(),
  // How far this context has been taken; absent = the model's level. The model's
  // level caps it: viewing the model lower must not make it invalid (decision-00019).
  level: z.enum(LEVELS).optional(),
  // Where this context's elements live when the model is split: a path relative to
  // the domain file (decision-00017). Absent = inline in the domain file.
  file: z.string().min(1).optional(),
  // Evans's Big Ball of Mud: the boundary is drawn around a recognised mess so its
  // model is not let propagate. A designation of the context itself, not a
  // relationship; orthogonal to its subdomain (decision-00015).
  bigBallOfMud: z.boolean().optional(),
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
export type Subdomain = z.infer<typeof subdomainSchema>;
export type Term = z.infer<typeof termSchema>;
export type SubdomainType = (typeof SUBDOMAIN_TYPES)[number];
export type Context = z.infer<typeof contextSchema>;
export type ContextRelationship = z.infer<typeof contextRelationshipSchema>;
export type ModelNode = z.infer<typeof nodeSchema>;
export type ModelEdge = z.infer<typeof edgeSchema>;
export type Meta = z.infer<typeof metaSchema>;
export type Model = z.infer<typeof modelSchema>;
