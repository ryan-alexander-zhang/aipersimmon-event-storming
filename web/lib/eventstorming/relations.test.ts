import { describe, expect, it } from "vitest";
import { ELEMENT_TYPES, type ElementType } from "./elements";
import { isValidConnection, resolveRelation } from "./relations";

// The single source of truth for the connection-rule table (design-00001 §2),
// expressed as valid (source, relation, target) triples.
const VALID: Array<[ElementType, string, ElementType]> = [
  ["actor", "issues", "command"],
  ["command", "handledBy", "aggregate"],
  ["command", "handledBy", "externalSystem"],
  ["aggregate", "emits", "domainEvent"],
  ["externalSystem", "emits", "domainEvent"],
  ["domainEvent", "triggers", "policy"],
  ["policy", "invokes", "command"],
  ["domainEvent", "updates", "readModel"],
  ["readModel", "informs", "actor"],
];

describe("connection rules", () => {
  it.each(VALID)("%s -> %s resolves to %s", (source, relation, target) => {
    expect(resolveRelation(source, target)).toBe(relation);
    expect(isValidConnection(source, target)).toBe(true);
  });

  it("lets a hotspot annotate any element type", () => {
    for (const target of ELEMENT_TYPES) {
      expect(resolveRelation("hotspot", target)).toBe("annotates");
    }
  });

  it("rejects connections not in the rule table", () => {
    // actor -> domainEvent (us-00002-AC-2.1), and other unlisted pairs
    expect(resolveRelation("actor", "domainEvent")).toBeNull();
    expect(isValidConnection("actor", "domainEvent")).toBe(false);
    expect(resolveRelation("command", "domainEvent")).toBeNull();
    expect(resolveRelation("domainEvent", "command")).toBeNull();
    expect(resolveRelation("readModel", "command")).toBeNull();
  });

  it("only allows the valid pairs (exhaustive over the type matrix)", () => {
    const allowed = new Set(VALID.map(([s, , t]) => `${s}->${t}`));
    for (const target of ELEMENT_TYPES) allowed.add(`hotspot->${target}`);

    for (const source of ELEMENT_TYPES) {
      for (const target of ELEMENT_TYPES) {
        const expected = allowed.has(`${source}->${target}`);
        expect(isValidConnection(source, target)).toBe(expected);
      }
    }
  });
});
