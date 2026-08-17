import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DSL_VERSION } from "@/lib/dsl/schema";
import { CONTEXT_RELATION_TYPES } from "@/lib/eventstorming/context-relations";
import { ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { LEVEL_TYPES, LEVELS } from "@/lib/eventstorming/levels";
import { CONNECTION_RULES } from "@/lib/eventstorming/relations";

// The authoring skill runs on the user's machine, so it cannot import these tables —
// it ships its own copy in scripts/grammar.json and validate.py enforces that. Two
// copies is a consequence of shipping the skill; them disagreeing is not. When they
// drifted, the skill's validator rejected an edge the editor allows (issue-00037), so
// this compares data with data: the skill's JSON against the editor's own tables.
const GRAMMAR = path.join(__dirname, "../../skills/event-storming/scripts/grammar.json");

interface Grammar {
  dslVersion: string;
  elements: string[];
  levels: Record<string, string[]>;
  relations: Array<{ relation: string; sources: string[]; targets: string[] }>;
  contextRelations: string[];
}

const grammar: Grammar = JSON.parse(readFileSync(GRAMMAR, "utf8"));
const sorted = (v: readonly string[]): string[] => [...v].sort();
// "*" is the skill's shorthand for every element type — a Hotspot annotates anything.
const types = (names: string[]): string[] =>
  names.includes("*") ? [...ELEMENT_TYPES] : names;

describe("the authoring skill's grammar.json mirrors the editor (issue-00037)", () => {
  it("targets the DSL version the schema accepts", () => {
    expect(grammar.dslVersion).toBe(DSL_VERSION);
  });

  it("lists every element type, and no others", () => {
    expect(sorted(grammar.elements)).toEqual(sorted(ELEMENT_TYPES));
  });

  it.each(LEVELS)("allows the same types at %s", (level) => {
    expect(sorted(types(grammar.levels[level] ?? []))).toEqual(sorted(LEVEL_TYPES[level]));
  });

  it("gates exactly the levels the editor has", () => {
    expect(sorted(Object.keys(grammar.levels))).toEqual(sorted(LEVELS));
  });

  it("lists every relation the code allows, and no others", () => {
    // One rule per relation today; a second rule for the same relation would need this
    // guard (and grammar.json's one-entry-per-relation shape) revisited.
    const code = CONNECTION_RULES.map((r) => r.relation);
    expect(sorted(code)).toEqual(sorted([...new Set(code)]));
    expect(sorted(grammar.relations.map((r) => r.relation))).toEqual(sorted(code));
  });

  it.each(CONNECTION_RULES)("gives $relation the same sources and targets", (rule) => {
    const entry = grammar.relations.find((r) => r.relation === rule.relation);
    expect(entry, `no entry for ${rule.relation}`).toBeDefined();
    expect(sorted(types(entry!.sources))).toEqual(sorted(rule.sources));
    expect(sorted(types(entry!.targets))).toEqual(sorted(rule.targets));
  });

  it("lists every Context Relationship type, and no others", () => {
    expect(sorted(grammar.contextRelations)).toEqual(sorted(CONTEXT_RELATION_TYPES));
  });
});
