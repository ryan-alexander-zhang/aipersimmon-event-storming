---
id: decision-00021-a-folder-imports-like-a-file
type: decision
role: main
status: active
parent: spec-00012-project-workspace
---

# A folder imports like a file, and an import names a Project after its model

## Context

A Project is the Modeler's unit of work, named by the Modeler (spec-00012). A
source file or folder is attached to it. Decision-00017 added the split model,
but gave the folder only one way in: **Import a model folder…** in the Projects
dialog, which always creates a new Project named after the folder. The two
kinds of source are therefore not symmetric:

- **A single file.** It can be imported into the current Project from the
  toolbar (**Import**, or **Reload from file…** once the board has work on it),
  keeping the Project's name. It can also be imported as a new Project from the
  Projects dialog.
- **A folder.** It can only become a new Project, named after the folder.

So "create a Project, then import its model" works for a file and not for a
folder. A folder's name (`model`, `domain`, `ride-hailing`) is a poor Project
name anyway. Importing a file as a new Project has the same flaw: it is named
after the file. In both cases the model carries its own name in `meta.name`,
and Export writes the Project's name there. Naming the new Project from it is
what makes export, then import, a round trip.

Confirmed with the user, 2026-11-13.

## Decision

1. **The toolbar imports a folder into the current Project, as it imports a
   file.** Beside **Import** (or **Reload from file…**) sits **Import folder…**
   (or **Reload from folder…** once the board has work on it). The Project's
   name is kept.
   - Before replacing work, the same confirmation applies as for a file.
   - Where the browser can keep the folder (Chromium, decision-00017), it
     becomes the Project's source, so **Refresh** and **Save to folder** act
     on it.
   - Elsewhere the folder is read once, through a directory input, and the
     Project keeps no source.
   - Once a Project has a source, the toolbar shows that source and
     **Refresh**, as today; the import buttons give way to it.
2. **Importing as a new Project names it after the model.** In the Projects
   dialog, both **Import a model file…** and **Import a model folder…** name
   the new Project from the model's `meta.name`. When that is blank they fall
   back to the file or folder name.

## Alternatives rejected

**One Import button that accepts a file or a folder.** No native picker offers
both: a directory input selects only folders, and a file input only files. A
menu behind one button would hide the more common action behind a click.

**Asking for a name on every import as a new Project.** It is one more prompt,
and it is redundant: the model already states its name, and the Project can be
renamed later.

## Consequences

- `components/source-file.tsx` gains the folder import and reload.
  - Chromium path: `pickFolder` + `readFolder` + `mergeFiles`.
  - Elsewhere: a hidden `webkitdirectory` input + `readFolderInput`.
  - It shares `apply` with the file path.
- `components/projects-dialog.tsx` names a new Project from `meta.name` first.
- E2E covers four things:
  - the toolbar folder import keeps the Project name, and offers
    **Reload from folder…** once the board has work;
  - a Chromium folder import becomes the source;
  - a folder with no domain file is refused from the toolbar;
  - the naming of a new Project from a file and from a folder.
- The confirmation needs no new test. It runs in the same code path as for a
  file, before **Refresh** of an existing source, and the Refresh tests already
  cover that.
