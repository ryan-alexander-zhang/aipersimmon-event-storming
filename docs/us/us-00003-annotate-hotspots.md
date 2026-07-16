---
id: us-00003-annotate-hotspots
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: annotate with hotspots

As a Modeler,
I want to attach hotspots to elements,
so that I can capture conflicts, questions, and risks in place.

## Requirements (EARS)

- **us-00003-FR-1** (Event) When the Modeler attaches a Hotspot to an element,
  the system shall create a `hotspot` node linked to that element by an
  `annotates` edge.
- **us-00003-FR-2** (Event) When the Modeler edits a Hotspot's text, the system
  shall update the hotspot node in the model.

## Acceptance (GWT)

- **us-00003-AC-1.1** (us-00003-FR-1)
  Given any element on the canvas
  When the Modeler attaches a Hotspot to it
  Then a hotspot node exists
  And an `annotates` edge links the hotspot to that element
- **us-00003-AC-2.1** (us-00003-FR-2)
  Given a hotspot node
  When the Modeler edits its text
  Then the hotspot shows the new text
  And the model holds the new text

## Links
- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor
