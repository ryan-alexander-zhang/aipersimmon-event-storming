---
id: record-00023-hotspot-resolution-acceptance
type: record
role: main
status: active
parent: plan-00023-hotspot-resolution
---

# Acceptance record: a resolved Hotspot records how it was resolved

Acceptance evidence for [plan-00023](../plan/plan-00023-hotspot-resolution.md),
implementing [us-00033](../us/us-00033-hotspot-resolution.md) per
[spec-00003](../spec/spec-00003-hotspot-workflow-opportunity.md) §4.
Verified 2026-08-17.

Coverage was cross-checked assertion-by-assertion in-session rather than by an
independent subagent (CLAUDE.md §7), because this session was instructed not to
spawn agents. Read the mapping below as self-reported.

## Gate results

- Unit: **323 passed** (`bun run test`). New: 4 in `store.test.ts`, 3 in
  `health.test.ts`, 2 in `serialize.test.ts`.
- E2E: **90 passed, 1 failed** (`bun run test:e2e`). The failure is the
  pre-existing `[issue-00028]` wheel-zoom budget (3 ms assertion, ~7.8 ms on this
  machine), unrelated to this work and confirmed pre-existing in record-00022.
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.
- No DSL bump and no migration: `resolution` and `resolvedAt` are optional additive
  properties, the same footing as `state`/`kind`/`priority`.

## GWT coverage

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (resolution stored beside the description, never over it) | unit store.test "writes the resolution beside the description, never over it" | pass |
| AC-2.1 (resolving records when, and puts the resolution in reach) | unit store.test "stamps when it was resolved, and leaves the resolution text alone"; e2e "resolving a hotspot asks for the resolution and keeps it": the field is focused and the state is already resolved — the prompt never blocks | pass |
| AC-3.1 (set back to open → resolution and resolvedAt both stand) | unit store.test "keeps both when it is set back to open — it was resolved then"; e2e same test's tail: the text is still in the field and the stamp reads "Last resolved …" | pass |
| AC-3.2 (resolved twice → the later stamp wins) | unit store.test "records the latest resolving, not the first" | pass |
| AC-4.1 (resolution and time shown, open or resolved) | e2e "resolving a hotspot asks for the resolution and keeps it": `resolved-at` reads `/^Resolved /` while resolved and `/^Last resolved /` after being set back to open | pass |
| AC-5.1 (resolved with nothing written down is reported) | unit health.test "reports a resolved hotspot with nothing written down", "treats a blank resolution as none", "leaves open hotspots alone"; e2e "a hotspot resolved with nothing written down is reported", plus the negative case in the sibling test (the finding disappears once written) | pass |
| AC-6.1 (resolution survives export/import) | unit serialize.test "round-trips a Hotspot's resolution and when it was resolved" | pass |
| AC-6.2 (a Hotspot written before this story imports clean) | unit serialize.test "reads a Hotspot written before resolutions existed" | pass |

## Notes

- **An accessibility defect was found and fixed while building.** The resolved-at
  timestamp was first rendered inside the field's `<label>`, which made the
  field's accessible name "Resolution resolved 8/17/2026" — a screen reader would
  read the timestamp as part of the field's name, and it also made
  `getByLabel("Resolved")` match both the checkbox and the textarea. The timestamp
  now sits outside the label. Caught by this plan's own e2e before release, so no
  `docs/issue` record: it never existed outside this work.
- **Terminology.** "Reopen" was dropped from the docs, comments, and test names for
  this story. With Projects now openable (spec-00012) and a Hotspot state literally
  named `open`, "reopening" read as reopening a file. It is written as "set back to
  `open`" throughout, and `CONTEXT.md` says plainly that the Hotspot's state has
  nothing to do with opening a Project.
- **One flaky e2e observed.** `Isolate stays visible with nothing selected …`
  (design-00003) timed out once in a full parallel run and passed alone and on the
  next full run. Not touched by this work; noted rather than chased.
- **The authoring skill was out of sync and is now updated** (plan-00023 Phase 5,
  added after the fact). `skills/event-storming/scripts/validate.py` rejects any
  property outside its whitelist, so until this it would have reported a valid v4.0
  model carrying a `resolution` as an **error**. It now accepts both properties,
  warns on a resolved hotspot with none (mirroring `unrecorded-resolution`), the
  reference table and template carry them, and the skill body tells the agent to
  write the answer when it closes a hotspot. Verified both ways against
  `template.json`: clean as shipped, one warning with the resolution stripped.
- **Not built, per plan-00023 *Out of scope*:** linking a Hotspot to the elements
  that resolved it, promoting a resolution to a `docs/decision`, `resolvedBy`, and
  requiring a resolution before resolving.
