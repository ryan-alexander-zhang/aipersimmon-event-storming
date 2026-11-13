---
id: record-00028-synonyms-integration-context-level-acceptance
type: record
role: main
status: active
parent: plan-00026-synonyms-integration-context-level
---

# Acceptance record: rejected synonyms, derived integration style, a level per context

Acceptance evidence for
[plan-00026](../plan/plan-00026-synonyms-integration-context-level.md), which
implements
[decision-00019](../decision/decision-00019-rejected-synonyms-derived-integration-per-context-level.md)
as amended during implementation. Verified 2026-11-13.

An independent subagent checked each AC against the docs, the tests and its own
validator runs on broken copies (CLAUDE.md §7). The issues it raised were
resolved in-session, as noted below.

## Gate results

- Unit: **433 passed** (`bunx vitest run`).
  - New file: `tests/validate-split-parity.test.ts`.
  - Added to: `health.test.ts`, `serialize.test.ts`, `split.test.ts`,
    `store.test.ts`.
- E2E: **104 passed** (`bunx playwright test`). New: the context-level menu
  test.
- `tsc --noEmit` and `bun run lint` are clean.
- `bun run build` is clean (checked before the last example edits, which change
  no code).
- Coverage, line / branch / function:
  - `health.ts`: 99.6 / 96.4 / 100.
  - `store.ts`: 97.7 / 85.1 / 97.2. Its uncovered lines predate this plan.
    `setContextLevel` is covered.
- DSL `5.2`. A `5.1` file migrates by its version alone.

## Two amendments made during implementation

Both are written into decision-00019 and marked there.

1. **A context above `meta.level` is capped, not an error.**
   - The editor's level switch writes `meta.level`.
   - With a ceiling error, viewing a model at Big Picture would make every
     model with a Process context invalid.
   - With the cap, a downward view loses nothing, and raising the view restores
     each context's level.
2. **`mutual-dependency`.** The user asked whether contexts should depend on
   each other at all.
   - DDD's answer to mutual reliance is a declared Partnership, or a Shared
     Kernel.
   - An undeclared cycle now warns.
   - A relationship in each direction no longer silences it.
   - This replaces the draft's rule that let a relationship each way pass.

## AC coverage

| AC | Evidence |
|---|---|
| AC-1 | `serialize.test.ts` "avoided words and a context's level": rejects an empty or blank avoided word, a word avoided twice in any case, and an avoided word that is a term. The validator errors on the same three (audit copies). |
| AC-2 | `serialize.test.ts` "migrates a 5.1 file by its version alone" and the import/export round-trip. `split.test.ts` round-trips a context with `avoid` and `level`. |
| AC-3 | Validator `INFO integration: ... api + events`, and "no seams yet" for a pair without seams. Commentary and actor edges give no style (audit copy). |
| AC-4 | `health.test.ts` "reversed-dependency" tests. Validator audit copies: reversed warns; correct direction, a second relationship pointing right, or a symmetric type stays silent. The editor agrees. |
| AC-4b | `health.test.ts` "mutual-dependency" tests. The validator warns `mutual dependency` and no `reversed dependency`; a relationship each way still warns; a partnership or shared kernel stays silent. |
| AC-5 | `health.test.ts` "judges design requirements by each context's own level". Validator: ERROR at design, WARN in a process-level context. |
| AC-6 | `serialize.test.ts` "keeps a context above the model's level"; `health.test.ts` "caps a context's level at the model's". |
| AC-7 | `health.test.ts` "warns on a node its context's declared level does not allow". The validator errors with "its context 'x' is at 'big-picture'", and an Ungrouped node is judged at `meta.level`. |
| AC-8 | `health.test.ts` covers this, including the editor's new `orphan-event` exemption at Big Picture. In validator audit copies, a big-picture context needs neither subdomain nor purpose, while its design neighbour still does. |
| AC-9 | `tests/validate-split-parity.test.ts` checks ride-hailing as is, and again with Billing set to `process`. Split and single-file output are identical, apart from the file prefix a split model's messages carry. |
| AC-10 | e2e "sets a context's own level from its menu, and clears it". |
| AC-11 | The skill documents `avoid`, `contexts[].level`, the derivation table, `reversed` and `mutual dependency`, and `execution` severity: `dsl.md` (new "Integration style" section), `context-map.md` steps 2 and 5 and the gate, `process.md` and `design.md` gates, and `SKILL.md`. No advice is left to add a relationship each way. |
| AC-12 | Every example, `template.json` and every e2e fixture is `5.2`, except the two deliberately legacy or invalid fixtures. Each has 0 errors and no reversed or mutual warnings. |

## How the examples' dependencies were resolved

| Example | Pair | Finding | Resolution |
|---|---|---|---|
| cargo | Booking / Routing | reversed | Routing reacts to `Cargo Booked`, so Booking is upstream. `cr-01` is flipped and retyped `publishedLanguage`, since the only seam is an event. |
| ftgo | Order / Kitchen, Order / Accounting | mutual | Straightened to orchestration, as in Richardson's FTGO. The two "on Order Approved" policies move into Order as saga steps. Kitchen and Accounting become upstream (`cr-01`, `cr-02` flipped). The restaurant's acceptance stays `manual`. |
| big | Payment / Invoicing | mutual | Genuine: Invoicing calls Payment and reacts to it, and Payment reacts to invoice outcomes. `cr-15` partnership is added and `cr-01` customerSupplier kept. |
| big | Connector / Payment | mutual | Genuine: Payment drives the adapter, which reports back, and either side cascades to the other. `cr-16` partnership is added and `cr-02` openHostService kept. |
| big | Invoicing / Notification, Dispute / Notification | mutual, reversed | `Collection Notifications` decides when to tell the customer, which is Invoicing's rule, so it moves to Invoicing (`invc-p-notify`). Notification only sends: `cr-10` and `cr-11` become Notification -> caller `openHostService`. `cr-09` (Payment -> Notification) lost its last seam and is removed. |
| big | Reconciliation / Ledger | reversed | Ledger books corrections from `Discrepancy Resolved`. `cr-08` is flipped. |
| big | Payment / Reconciliation | reversed | Caused by `ed-166`, where a Payment command produced a Reconciliation event. That seam is rewired: `Refund Completed` triggers Reconciliation's escalation, whose description and condition now name the excess refund. `cr-12` keeps Payment upstream. |

## Raised by the audit, and what was done

1. **`big.json` `cr-12` was flipped to fit one odd seam.** The seam was fixed
   instead, and `cr-12` kept its direction (above).
2. **The partnerships discarded the original types.** They are now added
   alongside: `cr-01` stays customerSupplier and `cr-02` stays openHostService.
3. **The editor accepted a blank `avoid` word.** The schema now rejects it, and
   a test covers it.
4. **The parity test did not exercise per-context level.** A second case sets
   Billing to `process`.
5. **Cosmetic issues fixed.**
   - A PEP8 blank line in `validate.py`.
   - The type of cargo's `cr-01`.

## Known, not done

- **`template.json` `cr-08` declares `separateWays` between Payment and
  Shipping, which share a seam** (`Payment Captured` triggers
  `Ship on Payment Policy`).
  - Separate Ways means not integrating, so the two contradict each other.
  - No check catches it: symmetric types are exempt from the direction checks,
    and the pair is backed by a relationship.
  - Retyping it would drop `separateWays` from the template that shows every
    type, since every pair of its four contexts is taken.
  - Left for the user, together with a possible `separate-ways-with-seams`
    finding.
- **`big.json`: "Committed Invoice only" (Invoicing) constrains two Payment
  commands.** That is a cross-context constraint (G6).
  - It predates this plan (record-00027).
  - The Payment / Invoicing pair is mutual without it, so the partnership
    does not rest on it.
- **The editor's whitespace-only `term`, `meaning` and `purpose` pass the
  schema, while the validator rejects them.**
  - This predates this plan (decision-00018).
  - It is the same class as the `avoid` fix and should get its own issue.
