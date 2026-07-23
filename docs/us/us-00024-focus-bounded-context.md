---
id: us-00024-focus-bounded-context
type: us
role: main
status: active
parent: spec-00010-bounded-context-focus
---

# User Story: focus a bounded context

As a Modeler,
I want to click a Bounded Context and see only its slice stand out while the rest
of the board dims,
so that I can read what belongs to that context at a glance without losing the
global timeline or the context's connections.

## Requirements (EARS)

- **us-00024-FR-1** (Event) When the Modeler clicks a Bounded Context header, the
  system shall focus that context: keep its slice (member elements and their
  connected supporting elements) at full emphasis and dim every other element.
- **us-00024-FR-2** (Event) When the Modeler focuses a context while another is
  focused, the system shall focus only the newly clicked one (single-select).
- **us-00024-FR-3** (Event) When the Modeler clicks the focused context again,
  presses Esc, or clicks empty canvas, the system shall clear focus and restore
  all elements to full emphasis.
- **us-00024-FR-4** (State) While a context is focused, the system shall keep any
  relation that touches that context — including a relation to another context
  (a seam) — visible rather than dimmed.
- **us-00024-FR-5** (Ubiquitous) The system shall render the Bounded Context
  headers as a single fixed-height row whose height does not grow as contexts are
  added, showing each context's colour, name, and subdomain badge while keeping
  rename, classification, and delete behind progressive disclosure.
- **us-00024-FR-6** (Event) When the Modeler triggers "+ Event" from a context
  header, the system shall create a Domain Event in that context (unchanged
  entry point).

## Acceptance (GWT)

- **us-00024-AC-1.1** (us-00024-FR-1)
  Given a board with contexts A and B, each with events
  When the Modeler clicks context A's header
  Then A's events and their connected supporting elements render at full emphasis
  And B's elements render dimmed
- **us-00024-AC-2.1** (us-00024-FR-2)
  Given context A is focused
  When the Modeler clicks context B's header
  Then only B is focused and A's elements are now dimmed
- **us-00024-AC-3.1** (us-00024-FR-3)
  Given context A is focused
  When the Modeler clicks A's header again (or presses Esc)
  Then focus clears and every element returns to full emphasis
- **us-00024-AC-4.1** (us-00024-FR-4)
  Given a relation connects an element in context A to an element in context B
  When the Modeler focuses A
  Then that relation stays visible (not dimmed)
- **us-00024-AC-5.1** (us-00024-FR-5)
  Given a board with many (10+) contexts
  When the header renders
  Then the header occupies a single row and its height matches the one-context
  case (no vertical growth)
- **us-00024-AC-6.1** (us-00024-FR-6)
  Given context A exists
  When the Modeler triggers "+ Event" from A's header
  Then a new Domain Event is created with context A

## Links

- Spec: spec-00010-bounded-context-focus · Aligns with decision-00005 · Plan:
  plan-00018-bounded-context-focus
