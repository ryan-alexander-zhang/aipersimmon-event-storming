---
id: us-00004-export-import
type: us
role: main
status: active
parent: spec-00001-mvp-editor
---

# User Story: export and import the model as JSON

As a Modeler,
I want to export the model to a JSON file and import it back,
so that I can version, share, and reuse the model outside the app.

## Requirements (EARS)

- **us-00004-FR-1** (Event) When the Modeler exports the model, the system shall
  download a JSON file that satisfies the DSL schema and carries the DSL
  `version`.
- **us-00004-FR-2** (Event) When the Modeler imports a valid DSL JSON file, the
  system shall replace the current model with its contents, preserving nodes,
  edges, and positions.
- **us-00004-FR-3** (Complex) While a model has been exported, when it is
  re-imported, the system shall restore a model equal to the original.

> Invalid-import handling is a cross-cutting requirement: spec-00001-XFR-2.

## Acceptance (GWT)

- **us-00004-AC-1.1** (us-00004-FR-1)
  Given a model with elements and edges
  When the Modeler exports it
  Then a JSON file is downloaded
  And the file validates against the DSL schema and includes `version`
- **us-00004-AC-3.1** (us-00004-FR-2, us-00004-FR-3)
  Given a model that was exported to JSON
  When the Modeler imports that file
  Then the restored model equals the original in nodes, edges, and positions

## Links
- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor
