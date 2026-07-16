---
id: issue-00001-gitignore-swallows-web-lib
type: issue
role: main
status: resolved
parent: plan-00001-mvp-editor
---

# Root .gitignore swallows web/lib app source

## Problem

Committing T1's source (`web/lib/**`) failed: `git add web/lib` reported
"The following paths are ignored by one of your .gitignore files". The DSL
schema and element/relation modules were silently untracked.

## Context / Trigger

Found while committing T1 (DSL schema + connection rules) of
[plan-00001-mvp-editor](../plan/plan-00001-mvp-editor.md). The app lives in
`web/` (a TypeScript/Next project) with source under `web/lib/`.

## Root Cause (first principles)

1. **Observed**: `web/lib/dsl/schema.ts` is ignored. **Expected**: app source
   is tracked.
2. **Mechanism**: `git check-ignore -v web/lib/dsl/schema.ts` points at
   `.gitignore:79:lib/`. The template ships a **Python-flavored** root
   `.gitignore`; its `lib/` rule (for Python build output) matches a `lib`
   directory at any depth, including `web/lib`.
3. **True root cause**: a language mismatch — a Python `.gitignore` applied to a
   TypeScript project, where `lib/` is a legitimate source directory. It is not
   a bug in the app code, the path alias, or git itself.

## Reproduction (test-first)

`web/tests/gitignore-guard.test.ts` asserts `git check-ignore` does NOT ignore
`lib/dsl/schema.ts`. Before the fix it failed (`expected true to be false` — the
path was ignored).

## Fix

Append a negation to the root `.gitignore` so the Python `lib/` rule does not
swallow the app source:

```gitignore
!web/lib/
```

Scoped to `web/lib/` only — the general `lib/` rule still applies elsewhere.

## Verification

- `git check-ignore -v web/lib/dsl/schema.ts` → no match (not ignored).
- `web/tests/gitignore-guard.test.ts` passes (regression guard).
- `web/lib/**` now stages normally.
