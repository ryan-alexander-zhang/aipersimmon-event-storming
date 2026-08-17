import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { type Level, LEVEL_TYPES, LEVELS } from "@/lib/eventstorming/levels";
import { CONNECTION_RULES } from "@/lib/eventstorming/relations";

// Guard for issue-00037: decision-00003 declared `External System —issues→ Command`
// and only half of that line was implemented, because nothing compared the documented
// grammar with the code. `CONNECTION_RULES` is the source of truth; the design table
// and the glossary are its prose mirrors, and this fails when either drifts.
const DESIGN = path.join(__dirname, "../../docs/design/design-00002-structured-board.md");
const DESIGN_SECTION = "### Relations (connection-rule table)";
const GLOSSARY = path.join(__dirname, "../../CONTEXT.md");
const GLOSSARY_SECTION = "### Relations (canvas edges)";
const SKILL = path.join(__dirname, "../../skills/event-storming");
const SKILL_DSL = path.join(SKILL, "reference/dsl.md");
const SKILL_SECTION = "## Relations";
const SKILL_TYPE_SECTION = "## Element types";
const SKILL_LEVEL_SECTION = "## Level gating";
const VALIDATOR = path.join(SKILL, "scripts/validate.py");

type Table = Map<string, { sources: string[]; targets: string[] }>;

const sorted = (v: readonly string[]): string[] => [...v].sort();

function section(file: string, heading: string): string[] {
  const text = readFileSync(file, "utf8");
  const from = text.indexOf(heading);
  expect(from, `${heading} not found in ${path.basename(file)}`).toBeGreaterThan(-1);
  return text.slice(from).split("\n");
}

// "any element" / "any type" stands for every element type — a Hotspot annotates anything.
const types = (text: string, byLabel = false): string[] => {
  const clean = text.replaceAll("`", "").replaceAll("*", "").trim();
  if (clean === "any element" || clean === "any type") return [...ELEMENT_TYPES];
  return clean.split(",").map((part) => {
    const name = part.trim();
    if (!byLabel) return name;
    const type = ELEMENT_TYPES.find((t) => ELEMENT_DEFINITIONS[t].label === name);
    expect(type, `"${name}" is not an element label`).toBeDefined();
    return type!;
  });
};

/** design-00002 §3: one markdown row per relation, `| relation | source | target |`. */
function designTable(): Table {
  const lines = section(DESIGN, DESIGN_SECTION);
  // the first run of table lines after the heading; prose in between is allowed
  const start = lines.findIndex((l) => l.startsWith("|"));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith("|"));
  const table: Table = new Map();
  for (const row of lines.slice(start, end)) {
    if (row.includes("---") || row.includes("relation |")) continue;
    const [, relation, sources, targets] = row.split("|").map((c) => c.trim());
    table.set(types(relation)[0], { sources: types(sources), targets: types(targets) });
  }
  return table;
}

/** CONTEXT.md: one line per relation, `**name**: Source[, Source] → Target[, Target].`
 *  Element *labels* here, not type ids — it is the glossary. Prose may follow the
 *  period. */
function glossaryTable(): Table {
  const table: Table = new Map();
  for (const line of section(GLOSSARY, GLOSSARY_SECTION)) {
    const match = /^\*\*(\w+)\*\*:\s*([^.]+)\./.exec(line);
    if (!match) continue;
    const [source, target] = match[2].split("→");
    expect(target, `no arrow in "${line}"`).toBeDefined();
    table.set(match[1], { sources: types(source, true), targets: types(target, true) });
  }
  return table;
}

/** The authoring skill's own table: `| relation | source -> target, source -> target |`,
 *  a row of pairs rather than two cells. */
function skillTable(): Table {
  const lines = section(SKILL_DSL, SKILL_SECTION);
  const start = lines.findIndex((l) => l.startsWith("|"));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith("|"));
  const table: Table = new Map();
  for (const row of lines.slice(start, end)) {
    if (row.includes("---") || row.includes("relation |")) continue;
    const [, relation, pairs] = row.split("|").map((c) => c.trim());
    const sources = new Set<string>();
    const targets = new Set<string>();
    for (const pair of pairs.split(",")) {
      const [source, target] = pair.split("->");
      expect(target, `no arrow in "${row}"`).toBeDefined();
      for (const t of types(source)) sources.add(t);
      for (const t of types(target)) targets.add(t);
    }
    table.set(types(relation)[0], { sources: [...sources], targets: [...targets] });
  }
  return table;
}

const validator = (): string => readFileSync(VALIDATOR, "utf8");
// A Python literal of element types: `{"a", "b"}`, `["a", "b"]`, or `set(ELEMENTS)`.
const pyTypes = (raw: string): string[] =>
  raw.includes("set(ELEMENTS)")
    ? [...ELEMENT_TYPES]
    : raw
        .replaceAll(/[{}[\]"\n]/g, " ")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

/** The skill's validator enforces the same grammar in Python: a RULES list of
 *  `(relation, {sources}, {targets})`. A model the app accepts must not be rejected
 *  by the script the authoring skill runs on every write. */
function validatorRules(): Table {
  const table: Table = new Map();
  const rule = /\("(\w+)",\s*\{([^}]*)\},\s*(\{[^}]*\}|set\(ELEMENTS\))\)/g;
  for (const [, relation, sources, targets] of validator().matchAll(rule)) {
    table.set(relation, { sources: pyTypes(sources), targets: pyTypes(targets) });
  }
  return table;
}

/** The first column of a `| type | … |` table under `heading`. */
function firstColumn(file: string, heading: string): string[] {
  const lines = section(file, heading);
  const start = lines.findIndex((l) => l.startsWith("|"));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith("|"));
  return lines
    .slice(start, end)
    .filter((l) => !l.includes("---") && !l.includes("| type |") && !l.includes("| level |"))
    .map((l) => types(l.split("|")[1])[0]);
}

/** The skill's level table is cumulative: `big-picture` lists its types, the levels
 *  below it add to the one above with `+ command, policy, …`. */
function skillLevels(): Record<Level, string[]> {
  const lines = section(SKILL_DSL, SKILL_LEVEL_SECTION);
  const start = lines.findIndex((l) => l.startsWith("|"));
  const end = lines.findIndex((l, i) => i > start && !l.startsWith("|"));
  const levels = {} as Record<Level, string[]>;
  let running: string[] = [];
  for (const row of lines.slice(start, end)) {
    if (row.includes("---") || row.includes("| level |")) continue;
    const [, level, allowed] = row.split("|").map((c) => c.trim());
    running = [...running, ...types(allowed.replace("+", ""))];
    levels[types(level)[0] as Level] = running;
  }
  return levels;
}

/** `LEVEL_TYPES = { "big-picture": {…}, … }` in the validator. */
function validatorLevels(): Record<Level, string[]> {
  const levels = {} as Record<Level, string[]>;
  const entry = /"(big-picture|process|design)":\s*(\{[^}]*\}|set\(ELEMENTS\))/g;
  for (const [, level, allowed] of validator().matchAll(entry)) {
    levels[level as Level] = pyTypes(allowed);
  }
  return levels;
}

const MIRRORS: Array<[name: string, read: () => Table]> = [
  ["design-00002 §3", designTable],
  ["CONTEXT.md glossary", glossaryTable],
  ["the authoring skill's reference/dsl.md", skillTable],
  ["the authoring skill's validate.py", validatorRules],
];

describe.each(MIRRORS)("%s mirrors CONNECTION_RULES (issue-00037)", (_name, read) => {
  it("lists every relation the code allows, and no others", () => {
    // One rule per relation today; a second rule for the same relation would need
    // this guard (and the docs' one-row-per-relation shape) revisited.
    const code = CONNECTION_RULES.map((r) => r.relation);
    expect(sorted(code)).toEqual(sorted([...new Set(code)]));
    expect(sorted([...read().keys()])).toEqual(sorted(code));
  });

  it.each(CONNECTION_RULES)("gives $relation the same sources and targets", (rule) => {
    const row = read().get(rule.relation);
    expect(row, `no entry for ${rule.relation}`).toBeDefined();
    expect(sorted(row!.sources)).toEqual(sorted(rule.sources));
    expect(sorted(row!.targets)).toEqual(sorted(rule.targets));
  });
});

// The same drift is possible on the two other lists the skill keeps its own copy of:
// a new element type, or a type moving between levels, would leave the validator
// rejecting what the app allows exactly as the `issues` rule did.
describe.each([
  ["the authoring skill's reference/dsl.md", () => firstColumn(SKILL_DSL, SKILL_TYPE_SECTION)],
  ["the authoring skill's validate.py", () => pyTypes(/ELEMENTS = (\[[^\]]*\])/.exec(validator())![1])],
])("%s mirrors ELEMENT_TYPES", (_name, read) => {
  it("lists every element type, and no others", () => {
    expect(sorted(read())).toEqual(sorted(ELEMENT_TYPES));
  });
});

describe.each([
  ["the authoring skill's reference/dsl.md", skillLevels],
  ["the authoring skill's validate.py", validatorLevels],
])("%s mirrors LEVEL_TYPES", (_name, read) => {
  it.each(LEVELS)("allows the same types at %s", (level) => {
    expect(sorted(read()[level] ?? [])).toEqual(sorted(LEVEL_TYPES[level]));
  });
});
