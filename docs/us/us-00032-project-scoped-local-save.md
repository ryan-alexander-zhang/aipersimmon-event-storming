---
id: us-00032-project-scoped-local-save
type: us
role: main
status: active
parent: spec-00012-project-workspace
---

# User Story: each Project saves and restores its own work

As a Modeler,
I want every Project to autosave its own board, discovery wall, and Snapshots,
so that switching Projects or reloading the page never mixes or loses work.

> Supersedes [us-00005](./us-00005-local-persistence.md), which autosaves one
> implicit model to fixed `localStorage` keys.

## Requirements (EARS)

- **us-00032-FR-1** (Event) When the active Project's Model, discovery wall, or
  Snapshots change, the system shall persist them to that Project's local record
  (debounced).
- **us-00032-FR-2** (Event) When a Project becomes active, the system shall
  restore its Model, discovery wall, and Snapshots, and shall carry over nothing
  from the previously active Project.
- **us-00032-FR-3** (Unwanted) If a Project's stored Model is absent or corrupt,
  then the system shall open that Project with an empty board and not error.
- **us-00032-FR-4** (Event) When the app loads and finds pre-Project local data
  and no Projects, the system shall migrate that data into one Project without
  loss and stop using the pre-Project keys.
- **us-00032-FR-5** (Unwanted) If local storage rejects a save, then the system
  shall keep the session working and report that the Project was not saved.

## Acceptance (GWT)

- **us-00032-AC-1.1** (us-00032-FR-1)
  Given a Project with elements, discovery items, and a Snapshot
  When the page is reloaded
  Then all three are restored in that Project
- **us-00032-AC-2.1** (us-00032-FR-2)
  Given Project A has a Snapshot and Project B has none
  When the Modeler switches from A to B
  Then B shows no Snapshots and an empty discovery wall
  And switching back to A shows A's Snapshot again
- **us-00032-AC-3.1** (us-00032-FR-3)
  Given a Project whose stored Model is corrupt
  When the Modeler opens it
  Then it opens with an empty board without error
- **us-00032-AC-4.1** (us-00032-FR-4)
  Given pre-Project local data holding a model, discovery items, and Snapshots
  When the app loads for the first time after the upgrade
  Then one Project holds that model, those discovery items, and those Snapshots
  And a further reload restores it from the Project record
- **us-00032-AC-5.1** (us-00032-FR-5)
  Given local storage rejects writes
  When the Modeler edits the board
  Then the board keeps working
  And the Modeler is told the Project was not saved

## Links
- Spec: spec-00012-project-workspace · Plan: plan-00022-project-workspace
