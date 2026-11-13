---
name: event-storming
description: Builds and edits Event Storming models as validated DSL v5.2 JSON for the event-storming editor. Runs the session phase by phase - Big Picture, then Process, then Design, plus the Context Map - interviews the user to fill gaps, and validates every write. Use when the user wants to model a domain, run an event storming, create or extend a board, or write, repair, or review an event storming model JSON.
---

# Event Storming

Build one model file the editor can import. Interview first, write second, validate always.

This is modelling **with EventStorming grammar**, not an EventStorming workshop - Brandolini reserves the name for the in-person format, and its main outcome (collective learning) does not fit in a file. What you produce is a **draft model**: something to learn from, review and code against. That is also why you interview instead of generating - the coherence has to be built in the user's head, question by question, and written down second.

## Read what you need

| Need | File |
| --- | --- |
| Grammar: every field, every enum, per-type properties | `reference/dsl.md` (read before the first write) |
| Phase 1 - events, hotspots | `reference/big-picture.md` |
| Phase 2 - commands, actors, policies, read models | `reference/process.md` |
| Phase 3 - aggregates, constraints | `reference/design.md` |
| Contexts, subdomains, context relationships | `reference/context-map.md` |
| Working example using every feature | `template.json` (copy, then edit) |

## Workflow

```
- [ ] 0 Scope: model name, domain, target level, output path
- [ ] 1 Big Picture  -> gate -> ask to continue
- [ ] 2 Process      -> gate -> ask to continue
- [ ] 3 Design       -> gate -> ask to continue
- [ ] 4 Context Map  -> gate
```

Stop at the level the user asked for. Big Picture always runs first - every level needs its ordered event spine, and the method makes a completed Big Picture Design's one prerequisite. Process and Design are otherwise independent formats: when the user asked for Design directly, run phases 2 and 3 as one combined pass - both gates still pass, in order, before `meta.level` rises. The Context Map can run any time after phase 1.

## Rules

1. **One model, grown in place.** Each phase edits the same model and raises `meta.level`. Never restart from scratch. It starts as one file; once the Context Map has cut the contexts, offer to split it into a `domain.json` plus one file per context (`reference/dsl.md`, Split models). From then on, edit only the files a change touches - usually one context file, plus `domain.json` for a seam. Contexts mature at their own pace: when one context goes on to Process or Design while another is still being discovered, raise `meta.level` and set the slower context's `level` (`reference/dsl.md`, Level gating) - it is then judged at its own level, not dragged to the model's.
2. **Validate every write:** `python3 <skill-dir>/scripts/validate.py <file>` - for a split model, pass its `domain.json`; the linked files are read with it. Fix all ERRORs, re-run until clean, report WARNs to the user. Python 3, no packages needed.
3. **Ask, don't invent.** A domain fact you cannot read from the repo or the brief is a question. Still unknown after asking? Write a `hotspot`, not a guess. If the user answers it later, set `state: "resolved"` **and** write the answer into `resolution` - a hotspot closed with nothing written down loses why it was closed.
4. **Use the user's words** as labels, in their language. Do not rename their concepts.
5. **Name the heuristic.** When you move a sticky to another type, draw a context boundary or split an aggregate, say which heuristic decided it: E1-E5 and P1 (`reference/big-picture.md`), B1-B6 and A1-A3 (`reference/context-map.md`), G1-G6 (`reference/design.md`). For example: "`Order Viewed` fails E3, so it becomes a read model." A call no heuristic supports is a question for the user, not a decision.
6. **Report after each phase:** counts per type, open hotspots, assumptions you made.

## Interview loop (every phase)

Repeat until the phase gate passes:

1. Draft from what you already have (the brief, repo code, docs, earlier phases).
2. Show the draft compactly - `order | Event | context` lists, never raw JSON.
3. Ask at most 4 questions per round. Give concrete options, mark one recommended, always allow a free answer. Never ask what the repo can answer. (Claude Code: use the AskUserQuestion tool. Other agents: plain numbered questions.)
4. Apply answers, write, validate.

Grill on: gaps in the story, unhappy paths, who acts, what triggers what, exact rules and numbers. Push back once on a vague answer ("it depends" -> on what?), then take the second answer and move on.

## Gates (the user confirms, not you)

- **Big Picture**: every event passes E1-E5 and every sticky that failed was moved, not deleted; ordered; story has no gap; pivotal events marked by P1; alternative outcomes of one moment share an `alternativeSet`, every unknown captured as a hotspot.
- **Process**: every event has a producing command or external system, or is marked `temporal` (raised by time); every command has an issuing actor or external system, or an invoking policy; every actor decision has a read model.
- **Design**: every command is handled by an aggregate or external system; every rule that can block a command is a constraint; every aggregate guards at least one constraint and its commands share a rule (G2), and rules across aggregates are policies (G5); every policy has `execution` (the validator errors otherwise at `design`), and `condition` and `parameters` where they exist; every context realises its own typed `subdomain` and has a `purpose` (the validator errors otherwise at `design`).
- **Context Map**: every boundary is backed by at least two of B1-B6 and no context is A1-A3; every context has a one-sentence `purpose`, and terms that drew a B1 boundary are in `language`; every context realises one named, typed subdomain, no two the same; every cross-context seam backed by a typed relationship whose direction the seams agree with (the validator warns `unbacked seam`, `reversed dependency` or `mutual dependency` otherwise); terms carry the words to `avoid` where people reach for a wrong one.

Then ask: "Move on to <next phase>?" Do not continue on your own.

## Output

Default path `<slug>.eventstorming.json` in the working directory; a split model is a folder `<slug>/` holding `domain.json` and `contexts/`. Load a file with **Import a model file…** and a folder with **Import a model folder…** in the editor's Projects.
