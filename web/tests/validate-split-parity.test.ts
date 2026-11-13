import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@/lib/dsl/schema";
import { mergeFiles, splitModel } from "@/lib/dsl/split";

// A split model is merged before any check runs (decision-00017), so the validator
// must say exactly the same about it as about the same model in one file
// (decision-00019, plan-00026-AC-9).
const ROOT = path.join(__dirname, "../..");
const VALIDATE = path.join(ROOT, "skills/event-storming/scripts/validate.py");
const DIR = path.join(ROOT, "examples/ride-hailing");

const run = (file: string): string[] => {
  let out: string;
  try {
    out = execFileSync("python3", [VALIDATE, file], { encoding: "utf8" });
  } catch (e) {
    out = (e as { stdout: string }).stdout; // exit 1 on errors still prints the report
  }
  // the last line names the file; a split model's messages name the file they are in
  return out
    .trim()
    .split("\n")
    .slice(0, -1)
    .map((l) => l.replace(/^(ERROR|WARN) {1,2}(domain\.json|contexts\/[\w-]+\.json): /, "$1 "));
};

const rideHailing = (): Model => {
  const read = (rel: string) => readFileSync(path.join(DIR, rel), "utf8");
  const files = Object.fromEntries(
    readdirSync(path.join(DIR, "contexts")).map((f) => [`contexts/${f}`, read(`contexts/${f}`)]),
  );
  const merged = mergeFiles(read("domain.json"), files);
  if (!merged.ok) throw new Error(merged.error);
  return merged.model;
};

const writeBoth = (model: Model) => {
  const dir = mkdtempSync(path.join(tmpdir(), "es-parity-"));
  const single = path.join(dir, "model.json");
  writeFileSync(single, JSON.stringify({ ...model, contexts: model.contexts.map((c) => ({ ...c, file: undefined })) }));
  const splitDir = path.join(dir, "split");
  for (const [rel, text] of Object.entries(splitModel(model))) {
    mkdirSync(path.dirname(path.join(splitDir, rel)), { recursive: true });
    writeFileSync(path.join(splitDir, rel), text);
  }
  return { single, domain: path.join(splitDir, "domain.json") };
};

describe("validate.py on a split model and on the same model in one file", () => {
  it("reports the same errors, warnings and integration lines", () => {
    const { single, domain } = writeBoth(rideHailing());
    const split = run(domain);
    expect(split.length).toBeGreaterThan(0);
    expect(run(single)).toEqual(split);
  });

  it("judges a context at its own level the same way in both", () => {
    const model = rideHailing();
    // Billing still at Process: its aggregate becomes an error, its policies' execution a warning
    model.contexts = model.contexts.map((c) => (c.id === "bil" ? { ...c, level: "process" as const } : c));
    const { single, domain } = writeBoth(model);
    const split = run(domain);
    expect(split.some((l) => l.includes("its context 'bil' is at 'process'"))).toBe(true);
    expect(run(single)).toEqual(split);
  });
});
