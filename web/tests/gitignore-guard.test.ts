import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Regression guard for issue-00001: the Python-flavored root .gitignore rule
// `lib/` used to swallow the app's web/lib source directory. `git check-ignore`
// exits 0 when a path IS ignored; app source must NOT be ignored.
function isIgnored(pathFromWeb: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "-q", pathFromWeb], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("gitignore does not swallow app source (issue-00001)", () => {
  it("web/lib source is tracked, not ignored", () => {
    expect(isIgnored("lib/dsl/schema.ts")).toBe(false);
  });
});
