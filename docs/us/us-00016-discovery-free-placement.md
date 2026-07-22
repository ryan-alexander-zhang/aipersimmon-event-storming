---
id: us-00016-discovery-free-placement
type: us
role: main
status: active
parent: spec-00002-discovery-mode
---

# User Story: freely drop unordered events at Big Picture

As a Modeler,
I want to enter a Discovery Mode at Big Picture and dump Domain Events at any
position without order or grammar checks,
so that I can capture the messy, unordered reality of a complex domain before I
commit to a clean timeline.

## Requirements (EARS)

- **us-00016-FR-1** (State) While at Big Picture level, the system shall let the
  Modeler enter and leave Discovery Mode; the mode shall be unavailable at
  Process and Design levels.
- **us-00016-FR-2** (Event) When the Modeler adds an event in Discovery Mode, the
  system shall place it at a free x/y position with **no timeline order** and
  shall not run connection/grammar validation.
- **us-00016-FR-3** (Event) When the Modeler drags a discovery event, the system
  shall move it to the new free position and shall not reorder or re-lay-out any
  structured-board element.
- **us-00016-FR-4** (Event) When the Modeler renames or deletes a discovery event,
  the system shall update or remove it from the discovery wall only.
- **us-00016-FR-5** (Ubiquitous) The system shall keep discovery events and their
  free positions in scratch state that is **never written into the structured
  model and never part of the exported/imported DSL**.
- **us-00016-FR-6** (State) While a discovery wall exists, the system shall persist
  it locally so that reloading the page restores the wall (positions included),
  under storage separate from the model DSL.

## Acceptance (GWT)

- **us-00016-AC-1.1** (us-00016-FR-1)
  Given the board is at Process or Design level
  When the Modeler looks for the Discovery Mode control
  Then it is unavailable; switching to Big Picture makes it available
- **us-00016-AC-1.2** (us-00016-FR-1)
  Given the board is at Big Picture level and Discovery Mode is off
  When the Modeler toggles Discovery Mode on and then off
  Then the mode activates and deactivates without altering the structured model
- **us-00016-AC-2.1** (us-00016-FR-2)
  Given Discovery Mode is active
  When the Modeler adds two events at two different positions
  Then both appear at their given positions, neither carries a timeline order,
  and no validation error is raised
- **us-00016-AC-3.1** (us-00016-FR-3)
  Given a discovery event at position P1 and a structured board with ordered events
  When the Modeler drags the discovery event to P2
  Then it rests at P2 and the structured events' orders are unchanged
- **us-00016-AC-4.1** (us-00016-FR-4)
  Given a discovery wall of three events
  When the Modeler deletes one and renames another
  Then the wall shows two events with the new label, and the model DSL is unchanged
- **us-00016-AC-5.1** (us-00016-FR-5)
  Given a discovery wall of events with free positions
  When the model is exported to DSL
  Then the exported JSON contains none of the discovery events or positions
- **us-00016-AC-6.1** (us-00016-FR-6)
  Given a discovery wall of events at set positions
  When the page is reloaded
  Then the same events reappear at the same positions

## Links

- Spec: spec-00002-discovery-mode · Decision: decision-00004 · Plan: plan-00012-discovery-mode
