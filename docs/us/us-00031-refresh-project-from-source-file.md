---
id: us-00031-refresh-project-from-source-file
type: us
role: main
status: active
parent: spec-00012-project-workspace
---

# User Story: import a file into a Project and refresh it when the file changes

As a Modeler,
I want a Project to remember the JSON file I imported and to reload it on demand,
so that a model I regenerate outside the tool is one click away from being on the
board again.

## Requirements (EARS)

- **us-00031-FR-1** (Event) When the Modeler imports a DSL JSON file into the
  active Project, the system shall validate it, replace that Project's Model, and
  record the file as the Project's source file where the browser can retain
  access to it.
- **us-00031-FR-2** (State) While a Project has a source file, the system shall
  show that file's name and the time of the last successful refresh, and offer
  Refresh.
- **us-00031-FR-3** (Event) When the Modeler refreshes a Project, the system
  shall re-read its source file, validate it, and replace the Project's Model
  with the file's contents.
- **us-00031-FR-4** (Complex) While the Project's Model has changed since it was
  last loaded from its source file, when the Modeler refreshes, the system shall
  state that those changes will be lost and require confirmation before replacing
  the Model.
- **us-00031-FR-5** (Unwanted) If reading the source file requires permission
  again, then the system shall request it as part of the refresh gesture, and on
  denial shall keep the current Model and report that the file was not read.
- **us-00031-FR-6** (Unwanted) If the source file is missing or no longer
  readable, then the system shall keep the current Model and report that the file
  could not be found.
- **us-00031-FR-7** (Optional) Where the browser cannot retain access to a chosen
  file, the system shall offer re-selecting the file in place of Refresh, with
  the same validation, confirmation, and replacement behaviour.

> Invalid-file handling on both import and refresh is the cross-cutting
> requirement spec-00001-XFR-2: the current Model is kept and the validation
> error surfaced.

## Acceptance (GWT)

- **us-00031-AC-1.1** (us-00031-FR-1, us-00031-FR-2)
  Given an empty Project on a browser that can retain file access
  When the Modeler imports `ordering.json`
  Then the Project's board shows that file's Model
  And the Project shows `ordering.json` as its source file
- **us-00031-AC-3.1** (us-00031-FR-3)
  Given a Project whose source file has since gained an element on disk
  When the Modeler refreshes
  Then the board shows the file's current contents including the new element
  And the last-refreshed time is updated
- **us-00031-AC-4.1** (us-00031-FR-4)
  Given a Project with a source file and an element added on the board since it
  was imported
  When the Modeler refreshes and confirms
  Then the board matches the file
  And the locally added element is gone
- **us-00031-AC-4.2** (us-00031-FR-4)
  Given the same Project
  When the Modeler refreshes and declines the confirmation
  Then the board is unchanged and still holds the locally added element
- **us-00031-AC-5.1** (us-00031-FR-5)
  Given a Project whose source file needs permission again
  When the Modeler refreshes and denies permission
  Then the Model is unchanged
  And the Project reports that the file was not read
- **us-00031-AC-6.1** (us-00031-FR-6)
  Given a Project whose source file has been deleted
  When the Modeler refreshes
  Then the Model is unchanged
  And the Project reports that the file could not be found
- **us-00031-AC-7.1** (us-00031-FR-7)
  Given a Project on a browser that cannot retain file access
  When the Modeler chooses to reload from file and picks the file again
  Then the Project's Model is replaced by that file's contents
  And no Refresh action was required to be present

## Links
- Spec: spec-00012-project-workspace · Plan: plan-00022-project-workspace
