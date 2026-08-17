import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { CONNECTION_RULES } from "@/lib/eventstorming/relations";

// Guard for issue-00037: decision-00003 declared `External System —issues→ Command`
// and only half of that line was implemented, because nothing compared the documented
// grammar with the code. `CONNECTION_RULES` is the source of truth; the design table
// and the glossary are its prose mirrors, and this fails when either drifts.
const DESIGN = path.join(__dirname, "../../docs/design/design-00002-structured-board.md");
const DESIGN_SECTION = "### Relations (connection-rule table)";
const GLOSSARY = path.join(__dirname, "../../CONTEXT.md");
const GLOSSARY_SECTION = "### Relations (canvas edges)";

type Table = Map<string, { sources: string[]; targets: string[] }>;

const sorted = (v: readonly string[]): string[] => [...v].sort();

function section(file: string, heading: string): string[] {
  const text = readFileSync(file, "utf8");
  const from = text.indexOf(heading);
  expect(from, `${heading} not found in ${path.basename(file)}`).toBeGreaterThan(-1);
  return text.slice(from).split("\n");
}

// "any element" stands for every element type — a Hotspot annotates anything.
const types = (text: string, byLabel = false): string[] => {
  const clean = text.replaceAll("`", "").replaceAll("*", "").trim();
  if (clean === "any element") return [...ELEMENT_TYPES];
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

const MIRRORS: Array<[name: string, read: () => Table]> = [
  ["design-00002 §3", designTable],
  ["CONTEXT.md glossary", glossaryTable],
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
