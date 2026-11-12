---
id: record-00026-split-model-files-acceptance
type: record
role: main
status: active
parent: plan-00024-split-model-files
---

# Acceptance record: a model splits into one file per Bounded Context

Acceptance evidence for [plan-00024](../plan/plan-00024-split-model-files.md), which
implements [decision-00017](../decision/decision-00017-a-model-splits-into-one-file-per-bounded-context.md).
Verified 2026-11-12. The AC-by-AC check was done by an independent subagent reading the
docs and the tests (CLAUDE.md §7); its gaps were fixed and re-run in-session, as noted.

## Gate results

- Unit: **401 passed** (`bun run test`, 26 files). New: `lib/dsl/split.test.ts`,
  `lib/store/source-folder.test.ts`, `tests/split-example.test.ts`; added to
  `health.test.ts`, `serialize.test.ts`, `projects.test.ts`.
- E2E: **102 passed** (`bunx playwright test`). New: six folder tests in
  `e2e/editor.spec.ts`.
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.
- Coverage on new and changed logic: `split.ts` 98.4 / 96.3 / 100 (line / branch /
  function), `source-folder.ts` 100 / 97.2 / 100, `health.ts` 98.7 / 95.9 / 100,
  `serialize.ts` 100 / 98.5 / 100, `projects.ts` 98.9 / 96.3 / 100. The UI is covered by
  E2E, per `vitest.config.ts`.
- No DSL bump: `file` is an optional key, and a model without it is unchanged.

## AC coverage

| Id | Test(s) / check | Result |
| --- | --- | --- |
| AC-1 | `split.test.ts` "reads a domain file with no links exactly as a single-file import" | PASS |
| AC-2 | `split.test.ts` "puts each element where the decision says, and merges back unchanged" | PASS |
| AC-3 | same test (round trip; domain file holds exactly the crossing and inline edges) and "refuses an edge filed in the wrong place" | PASS |
| AC-4 | `split.test.ts` "refuses a node that names its context inside a context file", "refuses a domain-file node naming a linked context" | PASS |
| AC-5 | `split.test.ts` "refuses the link %s" (7 cases), "refuses a link that is not a string, shared, or missing" | PASS |
| AC-6 | `split.test.ts` "refuses an id used in two files", "refuses a context id reused as another context's or a node's id" | PASS - context ids added after the subagent found them unclaimed |
| AC-7 | `health.test.ts` "unbacked-seam" block, incl. "does not count an Actor's edge as a seam"; validator runs below | PASS |
| AC-8 | `editor.spec.ts` "imports a split model's folder as one board" | PASS - the example's `domain.json` holds no nodes, so domain-file elements are proven by AC-1..3 in unit, not here |
| AC-9 | `editor.spec.ts` "Save to folder writes a domain file and one file per context" (stubbed picker), "Save to folder is offered only where…", "…is in the File menu on Chromium"; `source-folder.test.ts` write; `split.test.ts` "never gives two contexts the same default file" | PASS - the end-to-end save test and the link dedupe were added after the subagent's GAP |
| AC-10 | `editor.spec.ts` "a folder Project re-reads its folder on Refresh" (stubbed picker); `projects.test.ts` folder source persists, old file sources load | PASS - the Refresh test was added after the subagent's GAP |
| AC-11 | `serialize.test.ts` "exports one file with no context links, which imports as a single file" | PASS |
| AC-12 | validator runs below | PASS - node and edge errors now name their file; added after the subagent's GAP |
| AC-13 | `tests/split-example.test.ts`; one-time comparison below | PASS |

## Validator runs (AC-12)

`python3 skills/event-storming/scripts/validate.py examples/ride-hailing/domain.json`:
56 nodes, 69 edges, 4 contexts, level design - 0 error(s), 4 warning(s).

Broken copies of `examples/ride-hailing`, one change each, one ERROR each, text identical
to the editor's:

| Case | ERROR |
| --- | --- |
| node carries `context` | `contexts/ord.json: node ord-rider carries context - the file is its context` |
| domain node names a linked context | `domain.json: node x names context dsp, whose elements live in contexts/dsp.json` |
| link escapes the folder | `context ord: file "../ord.json" must stay inside the model's folder` |
| link shared | `contexts ord and dsp both link "contexts/ord.json" - one file each` |
| linked file missing | `context bil: linked file "contexts/bil.json" is missing` |
| id in two files | `id ord-rider is used in both contexts/ord.json and contexts/dsp.json` |
| edge leaves its context file | `contexts/ord.json: edge zz leaves context ord - it belongs in domain.json` |
| bad node type / relation in a context file | `contexts/bil.json: node bil-rider: type 'nonsense' - …`, `contexts/bil.json: edge e-bil-01: relation 'nope' does not exist` |
| context id reused | `id ord is used in both domain.json and domain.json` |

The subagent repeated the AC-4/5/6 cases independently with the same results, and found
`unbacked seam` firing once per pair on both split and single files.

## AC-13 one-time comparison

When `examples/ride-hailing/` was produced, the merged folder was compared with
`examples/ride-hailing-event-storming.json` as imported: nodes, edges (by id), contexts
(ignoring `file`) and context relationships identical; 56 nodes, 69 edges. The subagent
repeated the comparison against `git show HEAD:examples/ride-hailing-event-storming.json`:
`version`, `meta`, `contexts`, `contextRelationships`, `nodes`, `edges` identical.

## Shipped-example seams

`unbacked-seam` found two unbacked pairs in `examples/big.json`:

- Connector -> Ledger (`Provider Onboarded` triggers `Account Provisioning`): a real
  integration; `cr-14` `customerSupplier` added, matching Connector's other downstreams.
- Dispute / Payment: an Operator acting in both. Resolved by the rule, not the example -
  an edge with an Actor at either end is not a seam (decision-00017, CONTEXT.md **Seam**),
  decided with the user.

## Decision vs. code

Checked by the subagent: membership-is-the-file, the edge-home rule, `domain.json`
naming, link rules, never deleting files, Save to folder only with the File System
Access API, directory input in every browser, folder Refresh, Export dropping `file`,
skill docs and glossary - all match. Its two mismatches (context ids unclaimed;
colliding default links) are fixed above. `contextFileSchema` was not added - see
plan-00024 P1.1.
