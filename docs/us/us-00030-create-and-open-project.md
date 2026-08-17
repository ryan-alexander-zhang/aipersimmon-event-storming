---
id: us-00030-create-and-open-project
type: us
role: main
status: active
parent: spec-00012-project-workspace
---

# User Story: create a Project and reopen it from Recent

As a Modeler,
I want to create named Projects and reopen a recent one,
so that I can keep several models side by side instead of overwriting one.

## Requirements (EARS)

- **us-00030-FR-1** (Event) When the Modeler creates a Project with a name, the
  system shall create it with an empty board, make it the active Project, and add
  it to Recent.
- **us-00030-FR-2** (Ubiquitous) The system shall list every stored Project in
  Recent, most-recently-opened first, each showing its name and when it was last
  opened.
- **us-00030-FR-3** (Event) When the Modeler opens a Project from Recent, the
  system shall make it active and load its Model, discovery wall, and Snapshots.
- **us-00030-FR-4** (Event) When the app loads, the system shall reopen the
  Project that was active when it was last used.
- **us-00030-FR-5** (Unwanted) If no Project exists, then the system shall show
  Recent in its empty state offering create and import, and shall not open a
  board.
- **us-00030-FR-6** (Event) When the Modeler deletes a Project, the system shall
  confirm first, then remove that Project's Model, discovery wall, Snapshots, and
  source link, leaving other Projects untouched.
- **us-00030-FR-7** (Unwanted) If a stored Project cannot be read, then the
  system shall omit it from Recent and still list the others.

## Acceptance (GWT)

- **us-00030-AC-1.1** (us-00030-FR-1, us-00030-FR-2)
  Given no Project is open
  When the Modeler creates a Project named "Ordering"
  Then "Ordering" is the active Project with an empty board
  And Recent lists "Ordering"
- **us-00030-AC-3.1** (us-00030-FR-3)
  Given two Projects, each with a different Model and its own Snapshots
  When the Modeler opens the other one from Recent
  Then its Model and Snapshots are shown
  And none of the first Project's elements or Snapshots remain
- **us-00030-AC-4.1** (us-00030-FR-4)
  Given the Modeler has a Project open
  When the page is reloaded
  Then that same Project is active with its Model restored
- **us-00030-AC-5.1** (us-00030-FR-5)
  Given no Project has ever been created
  When the app loads
  Then Recent is shown empty with create and import offered
  And no board is rendered
- **us-00030-AC-6.1** (us-00030-FR-6)
  Given two Projects
  When the Modeler deletes one and confirms
  Then it is gone from Recent after a reload
  And the other Project still opens with its Model and Snapshots
- **us-00030-AC-7.1** (us-00030-FR-7)
  Given one stored Project holds a corrupt Model and another is valid
  When the app loads
  Then Recent lists the valid Project
  And the app does not error

## Links
- Spec: spec-00012-project-workspace · Plan: plan-00022-project-workspace
