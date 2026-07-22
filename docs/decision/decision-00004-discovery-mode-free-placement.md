---
id: decision-00004-discovery-mode-free-placement
type: decision
role: patch
status: active
parent: decision-00002-structured-board-not-free-canvas
---

# Discovery mode: bounded free placement at Big Picture, converging into the structured board

> Patch narrowing [decision-00002](./decision-00002-structured-board-not-free-canvas.md).
> Driven by [prd-00002](../prd/prd-00002-complex-business-analysis.md) FR1.

## Context

decision-00002 established that Event Storming is a **deterministic structured
board, not a free canvas**: position = f(model), no free positioning. That
decision was correct for the *design* half of Event Storming and remains
authoritative there.

prd-00002 introduces the *discovery* half. Real Event Storming for complex
business begins with **chaotic exploration**: participants dump hundreds of
unordered Domain Events on a wall, tolerating duplicates, wrong order, and unknown
causality, then progressively enforce a timeline. A board that forbids free
positioning and enforces grammar from the first sticky suppresses exactly the mess
where complexity is discovered. This is the tension analysis-00002 §2 flags for #1.

## Decision

Introduce a **Discovery Mode**, scoped narrowly so it does not reopen the
free-canvas problem decision-00002 solved:

1. **Only at Big Picture level.** Discovery Mode is unavailable at Process/Design
   levels; those remain fully structured.
2. **Only Domain Events, freely placed and unordered.** In Discovery Mode a
   modeller drops Domain Events at arbitrary positions with **no timeline order**
   and **relaxed grammar** (no connection required, no `isValidConnection` gate).
3. **Discovery positions are transient, never persisted.** Free x/y used during
   discovery is scratch state; it is **not** written into the structured model and
   **not** part of the exported DSL. This preserves decision-00002's invariant that
   the persisted model carries no hand-set positions.
4. **Convergence is one deliberate action.** A **converge** action assigns each
   discovered event a timeline `order` (and optional bounded context) and hands it
   to the structured board's layout engine. After convergence the event is a normal
   structured-board element; there is no going back to free coordinates for it.
5. **The structured board stays authoritative** for Process/Design and for the
   exported model. Discovery Mode is an *input funnel*, not a parallel editor.

## Consequences

- decision-00002 is **narrowed, not superseded**: "no free positioning" now reads
  "no free positioning in the *persisted structured model*; a transient
  Big-Picture Discovery Mode is permitted as an input funnel."
- The layout engine (`web/lib/layout/layout.ts`) gains no new persisted inputs; a
  separate discovery surface holds transient positions outside the structured
  layout.
- DSL is unaffected by discovery positions (FR1 invariant); only converged events
  enter the model.
- Detailed design (discovery surface, converge UX, order/context assignment) is
  owned by spec-00002 and its design doc; this decision only fixes the boundary.
