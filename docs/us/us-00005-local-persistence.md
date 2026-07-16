---
id: us-00005-local-persistence
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: local autosave and restore

As a Modeler,
I want my work to be saved locally and restored when I return,
so that a reload or accidental close does not lose the model.

## Requirements (EARS)

- **us-00005-FR-1** (Event) When the model changes, the system shall persist it
  to browser local storage (debounced).
- **us-00005-FR-2** (Unwanted) If local storage holds no model or a corrupt one
  on load, then the system shall start with an empty canvas and not crash.

## Acceptance (GWT)

- **us-00005-AC-1.1** (us-00005-FR-1)
  Given the Modeler has edited the model
  When the page is reloaded
  Then the last model is restored from local storage
- **us-00005-AC-2.1** (us-00005-FR-2)
  Given local storage holds corrupt model data
  When the app loads
  Then it starts with an empty canvas without error

## Links
- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor
