---
id: decision-00018-heuristics-decide-events-contexts-and-aggregates
type: decision
role: main
status: active
parent: spec-00007-model-health-analysis
---

# Named heuristics decide what is an event, where a context ends, and what an aggregate holds

## Context

Three calls carry most of a model's quality, and the skill made each of them on
a line or two of guidance:

- **Domain Event**: "past tense" and "pivotal = the business would notice if it
  stopped". Nothing says what is *not* an event, or where a rejected sticky goes.
- **Bounded Context**: one sentence in `context-map.md` (language, owner, pace,
  staleness). No anti-patterns, and no record of why a boundary is where it is.
- **Aggregate**: "who owns the decision", plus a 5-command / 5-event threshold
  that has no source.

There is no single official standard for any of the three. There are
established, citable heuristics, and this decision adopts them under stable ids
so the skill, the validator and the editor apply the same ones and can name
which one they apply.

Sources:

- Alberto Brandolini, *Introducing EventStorming* - the orange sticky, chaotic
  exploration before enforcing the timeline, pivotal events, and the hints for
  finding Bounded Contexts on a Big Picture board (pivotal events, swimlanes,
  people, language).
- Vaughn Vernon, *Implementing Domain-Driven Design*, ch. 8 - a Domain Event is
  something that happened that domain experts care about; listen for "when...",
  "if that happens...", "notify me if...".
- Vaughn Vernon, *Effective Aggregate Design* (parts I-III) - the four aggregate
  rules.
- ddd-crew, *Bounded Context Canvas* (Nick Tune et al.) - Purpose and Ubiquitous
  Language as the core of a context's description.
- ddd-crew, *Aggregate Design Canvas* - enforced invariants, corrective
  policies, concurrency.
- Eric Evans, *Domain-Driven Design* - Bounded Context as the boundary of one
  model and its language.

## Decision

### 1. Domain Event: five tests

A domain event stays a `domainEvent` only if it passes all five.

| Id | Test | Fails, for example |
|---|---|---|
| E1 | **A fact, in the past tense.** It has happened and cannot be undone, only compensated. | `Place Order`, `Ordering` |
| E2 | **In the domain's words.** A domain expert says it this way. No UI or technical vocabulary. | `Button Clicked`, `Row Saved`, `Message Published` |
| E3 | **It changes the state of the business.** Something the business cares about is different afterwards. | `Order Viewed`, `Report Searched` |
| E4 | **Someone cares.** A policy reacts, a read model shows it, another context consumes it, or the business must keep it (audit, law). Vernon's cue: someone would say "when that happens, ..." or "notify me if ...". | an internal step nobody reacts to and nobody records |
| E5 | **Specific, one fact.** It names which change happened and why. | `Order Updated` (say `Shipping Address Corrected`); `Order Placed and Paid` (two events) |

**When the tests apply.** During Big Picture exploration they do not apply:
Brandolini lets the chaos happen first, and filtering early silences people.
The tests run at the **Converge** step and form the Big Picture gate.

**Where a rejected sticky goes.** The skill never just deletes a rejected sticky.
It moves it to the type it describes and tells the user which test failed.

| The sticky is really | It becomes |
|---|---|
| a request or an intention (`Place Order`) | a `command`, held for Process |
| reading or looking something up (`Order Viewed`) | a `readModel` at Process, or dropped |
| another system acting (`Payment Gateway Called`) | an `externalSystem` with its own resulting event |
| a check that can refuse (`Check Credit`) | a `constraint` at Design |
| a "whenever X, then Y" rule | a `policy` |
| time passing (`Day Ended`) | a `domainEvent` with `temporal: true` (decision-00014) |
| UI or plumbing (`Button Clicked`) | dropped |
| unclear | a `hotspot` asking the question |

**Pivotal events (P1).** An event is pivotal when, after it, the work passes to
other people, other language, or another phase that is hard to undo. Pivotal
events are the first candidate boundaries for Bounded Contexts (B2).

### 2. Bounded Context: six signals, three anti-patterns

Draw a boundary where several signals agree. A boundary backed by one weak
signal alone is a hotspot, not a context.

| Id | Signal |
|---|---|
| B1 | **Language** - the same word means different things on either side, or the two sides use different words for one thing. This is the strongest signal. |
| B2 | **Pivotal events and swimlanes** - the business changes phase. |
| B3 | **People** - another actor, department or expert owns this part. |
| B4 | **Capability** - the part realises one subdomain, and no other context realises the same one (decision-00016). |
| B5 | **Autonomy** - a context decides its commands without synchronously asking another context. Two candidate contexts with many seams between them are probably one context. |
| B6 | **Pace and ownership** - the part changes at its own rate and one team can own it. |

| Id | Anti-pattern | Instead |
|---|---|---|
| A1 | **Entity context** - named after a noun that every process touches (`Customer`, `Product`). | Split it by the phase of the lifecycle. Each context keeps its own model of the noun. |
| A2 | **Technical context** - `Notification`, `Database`, `Gateway`. | An `externalSystem`, or a generic subdomain only if it has business language of its own. |
| A3 | **One context per aggregate**, or one context for the whole board. | Regroup by B1-B6. |

**Every context records why it exists.** It records its purpose and the terms that
mean something specific inside it.

```json
{ "id": "ord", "name": "Ordering", "order": 0,
  "subdomain": { "name": "Ordering", "type": "core" },
  "purpose": "Turn a customer's intent into a confirmed, payable order.",
  "language": [
    { "term": "Order", "meaning": "A confirmed basket the customer has committed to pay." }
  ] }
```

- `purpose` is one sentence: the business problem this context solves.
  - The validator errors when it is missing at `design`.
  - The editor's health panel warns, the same split as `missing-subdomain`.
- `language` is optional: a list of `{term, meaning}`. A term may appear only
  once in a context.
  - The same term in two contexts with different meanings is B1 made visible.
    That is the purpose of the field, not an error.

**Revisit from Design.** A `constraint` that needs state from two contexts means
the boundary is wrong, or the rule is really a policy that is eventually
consistent. The skill raises a hotspot. It does not force the rule into one
transaction.

### 3. Aggregate: find it from behaviour, bound it by invariants

| Id | Rule |
|---|---|
| G1 | **Behaviour first, name last.** Gather the commands, the events they produce and the constraints that can refuse them. Name the aggregate only once the group is stable. |
| G2 | **The boundary is a true invariant.** Two commands belong to one aggregate when one rule must hold across both, in the same moment. If they share no rule, they belong to separate aggregates. |
| G3 | **Small.** Split off a part that has its own lifecycle, or that two actors change at the same time. |
| G4 | **Reference by id.** An aggregate never contains another. |
| G5 | **Eventual consistency between aggregates.** A rule spanning two aggregates is a `policy` reacting to an event, which corrects things afterwards. Ask the business how soon the rule must be true. "Soon" means eventual consistency. |
| G6 | **One context.** An aggregate lives in exactly one context, as every node already does. |

- **An aggregate's invariants are the constraints on the commands it handles.**
  The model already records this as `command --constrainedBy--> constraint`,
  `command --handledBy--> aggregate`. No new field is needed.
- **No invariant warning (G2).** An aggregate none of whose commands has a
  constraint protects no invariant.
  - It is either a CRUD container or it is missing its rules.
  - Design-level warning: `unguarded-aggregate`.
- **The 5/5 threshold stays only as a size signal (G3).** `overloaded-aggregate`
  keeps firing. Its message and the skill's follow-up ask the G2 question ("which
  rule do these commands share?") instead of implying the number is a rule.

### 4. Where the heuristics live and how they are applied

- The skill's phase references carry the tables above, with the ids, a sources
  line, and one example and one counter-example per row:
  - `big-picture.md`: E, P;
  - `context-map.md`: B, A;
  - `design.md`: G.
- Each phase gate in `SKILL.md` checks its heuristics by id.
- When the skill moves a sticky, draws a boundary or splits an aggregate, it
  names the heuristic: "`Order Viewed` fails E3, so it becomes a read model."
- The validator and the editor's health panel check only what a machine can
  judge without false certainty. All of these are warnings, because each is a
  judgement call the user may overrule:

| Finding | Level | Rule |
|---|---|---|
| `technical-event` | any | event label's last word is one of `Created`, `Updated`, `Modified`, `Edited`, `Saved`, `Deleted`, `Clicked`, `Viewed`, `Fetched`, `Persisted` (E2, E5) |
| `missing-purpose` | design | a context without `purpose` (validator: error) |
| `unguarded-aggregate` | design | an aggregate none of whose handled commands is `constrainedBy` a constraint (G2) |

- **DSL `5.1`.** `purpose` and `language` are additive. A `5.0` model migrates by
  changing its version alone.

## Alternatives rejected

**A rationale field on every node and edge.** Most of the "why" is already in the
structure: the constraints an aggregate guards, the seams a context has. A
free-text field on everything would be noise that goes stale.

**Heuristics as errors.** They are judgements. `Account Created` is right in some
domains, and one shared rule across commands can be legitimate. An error would
block correct models. Only the missing `purpose` at design is an error, because
it is missing data, not a judgement.

**The full Bounded Context Canvas** (inbound and outbound communication,
business decisions, assumptions, metrics). Communication is already derivable
from the seams, and decisions from commands and policies. The rest is outside
what an EventStorming session produces.

**The full Aggregate Design Canvas** (throughput, event growth, lifetime).
Sessions rarely know these numbers. Concurrency becomes the G3 question instead.

**A check that splits an aggregate whose constraints form disjoint groups.**
This is Vernon's rule made mechanical, but authors routinely give each command
its own constraint node for what is one rule. The check would fire on correct
models. It stays a G2 interview question.

## Consequences

- **Schema.**
  - `contextSchema` gains `purpose: string(min 1)?` and
    `language: {term: string(min 1), meaning: string(min 1)}[]?`.
  - `DSL_VERSION` `5.1`, migration `5.0 -> 5.1`.
  - `grammar.json` follows.
- **Validator.**
  - `validate.py` adds the three findings above, duplicate-term errors, and
    `language` shape checks.
  - In `analyzeModel`: `technical-event`, `missing-purpose`, `unguarded-aggregate`.
- **Editor.**
  - The context's `⋯` menu edits `purpose`, the same way it edits the subdomain
    name.
  - The Context Map card shows the purpose and lists the context's terms.
  - Editing `language` in the editor is out of scope: the skill and the JSON
    write it, and the editor keeps it.
- **Skill.**
  - `SKILL.md` gates and rules;
  - `big-picture.md`, `context-map.md`, `design.md` and `dsl.md`;
  - `template.json`.
  - Every shipped example gains `purpose`, and `language` where B1 drew the
    boundary.
- **`CONTEXT.md`.**
  - New entries **Purpose** and **Ubiquitous Language**.
  - **Domain Event**, **Pivotal Event**, **Bounded Context** and **Aggregate**
    point to their heuristics.
