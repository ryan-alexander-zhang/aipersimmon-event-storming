---
id: us-00012-hotspot-workflow
type: us
role: main
status: active
parent: spec-00003-hotspot-workflow-opportunity
---

# User Story: hotspot workflow

As a Modeler,
I want a Hotspot to carry a state, kind, and priority,
so that I can triage and resolve the uncertainties a complex model surfaces.

## Requirements (EARS)

- **us-00012-FR-1** (Event) When the Modeler sets a Hotspot's state to `resolved`
  (or back to `open`), the system shall store the state and render resolved
  Hotspots muted.
- **us-00012-FR-2** (Event) When the Modeler sets a Hotspot's kind
  (`conflict`/`question`/`risk`) or priority (`low`/`medium`/`high`), the system
  shall store it and show it on the Hotspot.
- **us-00012-FR-3** (State) While a Hotspot's state is not `resolved`, the system
  shall count it in the model-health `unresolved-hotspots` finding; resolved
  Hotspots shall be excluded.
- **us-00012-FR-4** (Ubiquitous) The system shall treat a Hotspot with no stored
  state as `open`.

## Acceptance (GWT)

- **us-00012-AC-1.1** (us-00012-FR-1)
  Given an open Hotspot
  When the Modeler sets its state to resolved
  Then the model stores `state = resolved`
  And the Hotspot renders muted
  And setting it back to open un-mutes it
- **us-00012-AC-2.1** (us-00012-FR-2)
  Given a Hotspot
  When the Modeler sets its kind to `question` and priority to `high`
  Then the model stores both
  And the Hotspot shows them
- **us-00012-AC-3.1** (us-00012-FR-3)
  Given two open Hotspots counted by model health
  When the Modeler resolves one
  Then the `unresolved-hotspots` finding counts one
- **us-00012-AC-4.1** (us-00012-FR-4)
  Given a Hotspot with no stored state
  When model health is analysed
  Then the Hotspot is counted as unresolved (open)

## Links

- Spec: spec-00003-hotspot-workflow-opportunity · Plan: plan-00009-hotspot-workflow-opportunity
