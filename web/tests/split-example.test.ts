import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergeFiles, splitModel } from "@/lib/dsl/split";

// The shipped split example (decision-00017) must open, and must be exactly what the
// editor would write for it - so hand edits that break the layout rules show up here.
const DIR = path.join(__dirname, "../../examples/ride-hailing");

const read = (rel: string) => readFileSync(path.join(DIR, rel), "utf8");
const onDisk: Record<string, string> = Object.fromEntries([
  ["domain.json", read("domain.json")],
  ...readdirSync(path.join(DIR, "contexts")).map((f) => [`contexts/${f}`, read(`contexts/${f}`)]),
]);

describe("the split ride-hailing example [plan-00024-AC-13]", () => {
  it("merges into the whole model", () => {
    const merged = mergeFiles(onDisk["domain.json"], onDisk);
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.model.contexts).toHaveLength(4);
    expect(merged.model.nodes).toHaveLength(56);
    expect(merged.model.edges).toHaveLength(69);
  });

  it("is what splitting that model writes, file for file", () => {
    const merged = mergeFiles(onDisk["domain.json"], onDisk);
    if (!merged.ok) throw new Error(merged.error);
    expect(splitModel(merged.model)).toEqual(onDisk);
  });
});
