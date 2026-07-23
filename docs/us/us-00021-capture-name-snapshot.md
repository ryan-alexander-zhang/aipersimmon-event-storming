---
id: us-00021-capture-name-snapshot
type: us
role: main
status: active
parent: spec-00008-model-versioning-compare
---

# User Story: capture, name, and manage model snapshots

As a Modeler,
I want to capture named snapshots of my model and later restore or delete them,
so that I can save an *as-is* version, keep evolving toward *to-be*, and return to
any saved point.

## Requirements (EARS)

- **us-00021-FR-1** (Event) When the Modeler captures a snapshot with a name, the
  system shall store a named copy of the current model — its full DSL plus a
  creation timestamp — without altering the live model.
- **us-00021-FR-2** (Ubiquitous) The system shall list captured snapshots with
  their name and creation time.
- **us-00021-FR-3** (Event) When the Modeler renames a snapshot, the system shall
  update only that snapshot's name.
- **us-00021-FR-4** (Event) When the Modeler deletes a snapshot, the system shall
  remove it from the list and from local storage.
- **us-00021-FR-5** (Event) When the Modeler restores a snapshot and confirms, the
  system shall replace the live model with a copy of the snapshot's model.
- **us-00021-FR-6** (Ubiquitous) The system shall persist snapshots in local
  storage separately from the model DSL, so they survive reload and never appear in
  the current model's export ([decision-00008](../decision/decision-00008-snapshots-outside-dsl.md)).
- **us-00021-FR-7** (Unwanted) If a stored snapshot's DSL predates the current
  version, then the system shall migrate it on load; if it is invalid, the system
  shall drop it without crashing.

## Acceptance (GWT)

- **us-00021-AC-1.1** (us-00021-FR-1)
  Given a board with Domain Events "Order Placed" and "Order Shipped"
  When the Modeler captures a snapshot named "as-is"
  Then a snapshot "as-is" exists holding those events
  And the live board's nodes, edges, order, and contexts are unchanged
- **us-00021-AC-2.1** (us-00021-FR-2)
  Given snapshots "as-is" and "to-be"
  When the Modeler opens the versions list
  Then both names and their creation times are shown
- **us-00021-AC-3.1** (us-00021-FR-3)
  Given a snapshot "as-is"
  When the Modeler renames it to "baseline"
  Then the snapshot is named "baseline" and no other snapshot changes
- **us-00021-AC-4.1** (us-00021-FR-4)
  Given two snapshots
  When the Modeler deletes one
  Then only the other remains
- **us-00021-AC-5.1** (us-00021-FR-5)
  Given a snapshot "as-is" and a board that has changed since it was captured
  When the Modeler restores "as-is" and confirms
  Then the live board matches the snapshot's model
- **us-00021-AC-6.1** (us-00021-FR-6)
  Given one captured snapshot
  When the current model is exported
  Then the export JSON contains no snapshots
- **us-00021-AC-6.2** (us-00021-FR-6)
  Given one captured snapshot
  When the app reloads from local storage
  Then the snapshot is still listed
- **us-00021-AC-7.1** (us-00021-FR-7)
  Given a stored snapshot whose model carries an older DSL version
  When snapshots load
  Then it loads migrated to the current version, without error

## Links

- Spec: spec-00008-model-versioning-compare · Decision: decision-00008-snapshots-outside-dsl · Design: design-00008-versioning-compare-surface · Plan: plan-00015-model-versioning-compare
