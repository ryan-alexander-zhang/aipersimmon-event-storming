---
id: issue-00041-blank-text-passes-the-editor
type: issue
role: main
status: resolved
parent: decision-00018-heuristics-decide-events-contexts-and-aggregates
---

# Blank purpose, term, meaning or subdomain name passes the editor but fails the validator

## Problem

Each of these fields imports into the editor when it holds only spaces:

- a context's `purpose`;
- a language entry's `term` or `meaning`;
- a subdomain's `name`.

`validate.py` rejects the same file. The editor and the skill disagree on
whether the model is valid. A blank `purpose` also silences the requirement it
exists for: `missing-purpose` sees a string and stays quiet.

## Context

The plan-00026 audit found it for `avoid`, which was fixed there. The same
pattern predates that plan in the decision-00016 and decision-00018 fields.

## Root cause

- **Expected.** These fields are written content: a sentence, a word, a name.
  "Non-empty" means "has content".
- **Observed.** There are two definitions of non-empty, one on each side:
  - `web/lib/dsl/schema.ts` uses `z.string().min(1)`, which checks *length*
    (`purpose`, `term`, `meaning`, `subdomainSchema.name`).
  - `skills/event-storming/scripts/validate.py` uses `.strip()`, which checks
    *content* (`check_contexts`, `check_language`).
- **Root cause.** The rule "required text has content" is restated per field
  in two languages, with two meanings. Each new field picks one by habit. The
  `avoid` fix patched one field and left the rule duplicated.
- **Not the cause.** It is not any one field's definition. Fixing the four
  fields one by one would leave the next field to repeat the bug.

## Fix

- `schema.ts` defines required written text once: a `text()` schema that
  rejects blank strings.
  - `purpose`, `term`, `meaning`, `avoid` words and `subdomain.name` use it.
  - The editor's `missing-purpose` relies on the same definition.
- `validate.py` keeps its one definition (`.strip()`).
- A test pins the shared definition per field: every field the validator
  strips is rejected blank by the schema.

Out of scope, noted: a node's `label` is allowed blank in the schema while the
validator requires one. The editor creates nodes before they are named, so that
divergence is a separate question.

## Reproduction

`web/lib/dsl/serialize.test.ts`, "rejects %s, as the validator does
[issue-00041]". It has one case per field: blank `purpose`, `term`, `meaning`,
`avoid` word and subdomain `name`.

Before the fix, four of the five cases failed and the file imported. `avoid`
was already patched in plan-00026.

## Verification

- `text()` in `schema.ts` is the one definition, and all five fields use it.
  The five cases pass.
- The full unit suite passes: 438 tests. `tsc` is clean.
