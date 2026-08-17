---
name: event-storming
description: Builds and edits Event Storming models as validated DSL v4.0 JSON for the event-storming editor. Runs the session phase by phase - Big Picture, then Process, then Design, plus the Context Map - interviews the user to fill gaps, and validates every write. Use when the user wants to model a domain, run an event storming, create or extend a board, or write, repair, or review an event storming model JSON.
---

# Event Storming

Build one model file the editor can import. Interview first, write second, validate always.

## Read what you need

| Need | File |
| --- | --- |
| Grammar: every field, every enum, per-type properties | `reference/dsl.md` (read before the first write) |
| Phase 1 - events, hotspots | `reference/big-picture.md` |
| Phase 2 - commands, actors, policies, read models | `reference/process.md` |
| Phase 3 - aggregates, constraints | `reference/design.md` |
| Contexts, classification, context relationships | `reference/context-map.md` |
| Working example using every feature | `template.json` (copy, then edit) |

## Workflow

```
- [ ] 0 Scope: model name, domain, target level, output path
- [ ] 1 Big Picture  -> gate -> ask to continue
- [ ] 2 Process      -> gate -> ask to continue
- [ ] 3 Design       -> gate -> ask to continue
- [ ] 4 Context Map  -> gate
```

Stop at the level the user asked for. Never skip a phase: a Design board needs a Process pass first. The Context Map can run any time after phase 1.

## Rules

1. **One file, grown in place.** Each phase edits the same JSON and raises `meta.level`. Never restart from scratch.
2. **Validate every write:** `python3 <skill-dir>/scripts/validate.py <file>`. Fix all ERRORs, re-run until clean, report WARNs to the user. Python 3, no packages needed.
3. **Ask, don't invent.** A domain fact you cannot read from the repo or the brief is a question. Still unknown after asking? Write a `hotspot`, not a guess.
4. **Use the user's words** as labels, in their language. Do not rename their concepts.
5. **Report after each phase:** counts per type, open hotspots, assumptions you made.

## Interview loop (every phase)

Repeat until the phase gate passes:

1. Draft from what you already have (the brief, repo code, docs, earlier phases).
2. Show the draft compactly - `order | Event | context` lists, never raw JSON.
3. Ask at most 4 questions per round. Give concrete options, mark one recommended, always allow a free answer. Never ask what the repo can answer. (Claude Code: use the AskUserQuestion tool. Other agents: plain numbered questions.)
4. Apply answers, write, validate.

Grill on: gaps in the story, unhappy paths, who acts, what triggers what, exact rules and numbers. Push back once on a vague answer ("it depends" -> on what?), then take the second answer and move on.

## Gates (the user confirms, not you)

- **Big Picture**: events past tense, ordered, story has no gap, pivotal events marked, every unknown captured as a hotspot.
- **Process**: every event has a producing command or external system; every command has an issuing actor or invoking policy; every actor decision has a read model.
- **Design**: every command is handled by an aggregate or external system; every rule that can block a command is a constraint; every policy has `condition`, `execution`, and `parameters` where they exist.
- **Context Map**: every context classified; every cross-context seam typed.

Then ask: "Move on to <next phase>?" Do not continue on your own.

## Output

Default path `<slug>.eventstorming.json` in the working directory. Load it with **File > Import** in the editor.
