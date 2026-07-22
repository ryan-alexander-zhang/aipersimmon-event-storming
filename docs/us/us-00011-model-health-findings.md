---
id: us-00011-model-health-findings
type: us
role: main
status: active
parent: spec-00007-model-health-analysis
---

# User Story: model-health findings

As a Modeler,
I want the tool to flag model smells and let me jump to the elements involved,
so that I can find gaps and quality problems in a complex model without hunting.

## Requirements (EARS)

- **us-00011-FR-1** (Ubiquitous) The system shall analyse the current model and
  produce a finding for each detected smell, across these types: orphan Domain
  Event (no producing Command/Aggregate), dangling Command (no resulting Domain
  Event), overloaded Aggregate (over the configured command/event threshold),
  Policy cycle, and an unresolved-Hotspot count.
- **us-00011-FR-2** (Event) When the model changes, the system shall recompute the
  findings.
- **us-00011-FR-3** (Event) When the Modeler selects a finding, the system shall
  select and focus the element(s) it references on the board.
- **us-00011-FR-4** (Unwanted) If the model has no smells, then the system shall
  show a healthy (empty) state, not an error and not a false finding.
- **us-00011-FR-5** (State) While findings are displayed, the system shall keep all
  editing enabled — findings are advisory and non-blocking.

## Acceptance (GWT)

- **us-00011-AC-1.1** (us-00011-FR-1)
  Given a Domain Event with no incoming `produces`/`emits` edge
  When the model is analysed
  Then an `orphan-event` finding names that event
- **us-00011-AC-1.2** (us-00011-FR-1)
  Given a Command with no path to any Domain Event
  When the model is analysed
  Then a `dangling-command` finding names that command
- **us-00011-AC-1.3** (us-00011-FR-1)
  Given an Aggregate handling more Commands than the configured threshold
  When the model is analysed
  Then an `overloaded-aggregate` finding names that aggregate
- **us-00011-AC-1.4** (us-00011-FR-1)
  Given a Policy whose triggers/invokes form a cycle
  When the model is analysed
  Then a `policy-cycle` finding names the elements in the cycle
- **us-00011-AC-2.1** (us-00011-FR-2)
  Given an `orphan-event` finding is shown
  When the Modeler adds the missing producing Command and connects it
  Then the finding disappears on recompute
- **us-00011-AC-3.1** (us-00011-FR-3)
  Given a finding referencing an element
  When the Modeler selects the finding
  Then that element is selected and focused on the board
- **us-00011-AC-4.1** (us-00011-FR-4)
  Given a model with no smells
  When the model is analysed
  Then the panel shows a healthy empty state and no findings
- **us-00011-AC-5.1** (us-00011-FR-5)
  Given findings are displayed
  When the Modeler edits any element
  Then the edit succeeds and nothing blocks it

## Links

- Spec: spec-00007-model-health-analysis · Plan: plan-00008-model-health-analysis
