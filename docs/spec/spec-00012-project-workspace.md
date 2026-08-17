---
id: spec-00012-project-workspace
type: spec
role: main
status: active
parent: prd-00001-event-storming-tool
---

# Spec: Projects — create, reopen from Recent, refresh from the source file

> The shippable capability: a **Project** — a named, browser-local workspace that
> owns one Model, its discovery wall, and its Snapshots. The Modeler creates
> Projects, reopens one from **Recent**, imports a `.json` into it, and
> **refreshes** it when that file changes on disk. Still no account, no backend.

## 1. Context

Terms follow [CONTEXT.md](../../CONTEXT.md). This spec introduces **Project** and
**Recent**, and narrows **Snapshot** from browser-scoped to Project-scoped; both
land in `CONTEXT.md` with the implementation (plan-00022).

Today there is exactly one implicit model. `lib/store/persistence.ts` autosaves it
to three fixed `localStorage` keys, and `FileMenu` → Import (`components/file-menu.tsx`)
replaces it in place. Working on a second domain means exporting the first by
hand; the two would share one Snapshot collection either way.

The storage shape and the source-file boundary are settled in
[decision-00011](../decision/decision-00011-projects-in-indexeddb-file-handle-optional.md):
a Project is an **IndexedDB record that owns a full copy of its content**, and a
`FileSystemFileHandle` is an **optional attachment**, never the Project's
identity. The two facts that force it: the browser gives a page no re-readable
path (`<input type="file">` reports `C:\fakepath\…`, and its `File` cannot be
re-read after a reload), and a handle cannot be stored in `localStorage` because
it survives structured cloning, not `JSON.stringify`.

This spec revises prd-00001 FR5/FR6, which are written for one implicit model,
and supersedes [us-00005](../us/us-00005-local-persistence.md).

## 2. User Stories

| Story | Doc | Status | Summary |
| --- | --- | --- | --- |
| US30 | [us-00030-create-and-open-project](../us/us-00030-create-and-open-project.md) | active | Create a Project, reopen one from Recent, delete one; reopen the last active on load |
| US31 | [us-00031-refresh-project-from-source-file](../us/us-00031-refresh-project-from-source-file.md) | active | Import a file into a Project, remember it, and refresh the Project from it on demand |
| US32 | [us-00032-project-scoped-local-save](../us/us-00032-project-scoped-local-save.md) | active | Each Project autosaves and restores its own Model, discovery wall, and Snapshots |

## 3. Cross-cutting requirements

- **spec-00012-XFR-1** (Ubiquitous) The system shall keep every Project in the
  browser; it shall never upload a Project, its Model, or its source file.
- **spec-00012-XFR-2** (Event) When a Project becomes active, the system shall
  reset all view-only state — selection, focus, isolate, walkthrough, filter,
  compare — as replacing the Model already does.
- **spec-00012-XFR-3** (Ubiquitous) The system shall use the active Project's
  name as the exported Model's `meta.name` and as the exported file's name,
  replacing the hardcoded `"Event Storming"` / `event-storming.json`.
- **spec-00012-XFR-4** (Unwanted) If a Project's stored record is unreadable or
  fails DSL validation, then the system shall degrade to an empty board or omit
  that Project, and shall never fail the app.

**Acceptance (GWT)**

- **spec-00012-XAC-2.1** (spec-00012-XFR-2)
  Given a Project open with a walkthrough running and a context focused
  When the Modeler opens another Project
  Then the walkthrough is not running and no context is focused
- **spec-00012-XAC-3.1** (spec-00012-XFR-3)
  Given the Project "Ordering" is active
  When the Modeler exports it
  Then the downloaded file is named for "Ordering"
  And its `meta.name` is "Ordering"

> Invalid-import handling is inherited, not restated: **spec-00001-XFR-2** — an
> import or refresh that fails DSL validation keeps the current Model and surfaces
> the error. It now covers the refresh path too.

## 4. Technical Design

Small-spec exception: the design is inline. It is a storage-layer change plus one
new dialog, not a new canvas surface, so it does not warrant its own `design/` doc.

### 4.1 Storage

One IndexedDB database `event-storming`, one object store `projects` keyed by
`id`:

```ts
type ProjectRecord = {
  id: string;                    // nanoid
  name: string;
  createdAt: string;
  lastOpenedAt: string;
  model: Model;                  // validated DSL, migrated on load
  discovery: DiscoveryItem[];
  snapshots: Snapshot[];
  source?: {
    handle: FileSystemFileHandle; // structured-cloned into IDB; Chromium desktop
    name: string;                 // shown in the UI
    lastRefreshedAt: string;
  };
  dirty: boolean;                // model changed since it was last loaded from `source`
};
```

`localStorage` keeps exactly one key, `event-storming:activeProject`, holding the
active Project's id so boot can read it synchronously.

**Migration (us-00032-FR-4).** On first load, if `projects` is empty and any
`event-storming:model|discovery|snapshots` key exists, write one record from them
(name from the model's `meta.name`, else `"Untitled"`), then remove the three
keys. Per-record load still runs `migrateToLatest` + `modelSchema.safeParse` on
the Model and on every Snapshot, exactly as `persistence.ts` does now.

**Dirty (us-00031-FR-4).** `dirty` is set by the autosave subscription the moment
the Model changes, and cleared whenever the Model is loaded from the source file
(import or refresh). A boolean, not a content diff: `exportJSON` stamps a fresh
`meta.createdAt` on every call, so comparing serialised output would report a
change that is not one.

Two things that shape it:

- **What counts as a Model change.** Not the `nodes` array — React Flow hands back
  new node objects for size, position, and selection changes, and the layout engine
  rebuilds them on every reflow, none of which a file holds. The subscription
  compares only what reaches the DSL: each element's id, type, and `data` reference,
  plus edges, contexts, and level. Element `data` keeps its identity through all the
  churn above, so the comparison stays a walk of references.
- **`syncToken`.** Loading a file *is* a Model change, so without a marker an import
  would immediately count as a change against the file it just came from.
  `markSynced` bumps `syncToken`; autosave treats a change in it as a new baseline
  rather than an edit.

### 4.2 Modules

| Module | Change |
| --- | --- |
| `lib/store/projects-db.ts` | New. Promise wrappers over the one IndexedDB object store; reads return `unknown`, writes reject rather than swallow |
| `lib/store/projects.ts` | New. `listProjects` / `createProject` / `loadProject` / `saveProject` / `deleteProject` / `migrateLegacy`, the active-Project id, and the pre-Project keys. Replaces `lib/store/persistence.ts`, which is deleted with its last caller |
| `lib/store/source-file.ts` | New. Capability probe, `pickFile`, `readHandle` (query → request permission → `getFile().text()`), typed failures |
| `lib/store/store.ts` | `activeProject: {id, name, createdAt, lastOpenedAt, source?, dirty, syncToken}`; `openProject` / `closeProject` / `markDirty` / `markSynced` / `setSaveError` / `openProjects` / `closeProjects` |
| `components/editor.tsx` | `useAutosave` opens the last Project and writes per Project; no board until one is active |
| `components/projects-dialog.tsx` | New. Recent list, Create, Open, Delete, Import into a new Project; doubles as the empty state |
| `components/source-file.tsx` | New. The Project's source file: Import / Reload from file / Refresh, the file name, and the read errors. Sits in the toolbar next to the File menu |
| `components/file-menu.tsx` | "New" → "Projects…"; Import moves to `source-file.tsx`; Export uses the Project name |
| `components/toolbar.tsx` | Shows the Project name in place of the fixed title, and the "Not saved" chip |

### 4.3 Refresh

`Refresh` → `queryPermission({mode:"read"})` → if not `granted`,
`requestPermission` on the click gesture → `getFile()` → `text()` →
`importJSON` → if `dirty`, confirm → `setModel`, stamp `lastRefreshedAt`, clear
`dirty`. Read-only in one direction: nothing is ever written back to the file;
Export stays the only way out. No polling and no file watching — refresh is a
deliberate gesture.

Where `window.showOpenFilePicker` is absent (Firefox, Safari), the Project has no
`source`; the action reads "Reload from file…" and opens the existing
`<input type="file">`. Validation, the dirty confirmation, and replacement are the
same code path — the only difference is one extra click (us-00031-FR-7).

### 4.4 Error handling

| Error | Handling | Requirement |
| --- | --- | --- |
| invalid JSON on import or refresh | keep Model, show validation error | spec-00001-XFR-2 |
| refresh permission denied | keep Model, report the file was not read | us-00031-FR-5 |
| source file missing / unreadable | keep Model, report not found; Project still opens | us-00031-FR-6 |
| corrupt stored Model | open that Project empty | us-00032-FR-3 |
| unreadable Project record | omit from Recent, list the rest | us-00030-FR-7 |
| IndexedDB write rejected / over quota | keep session working, report not saved | us-00032-FR-5 |

## 5. Out of Scope

- **Writing back to the source file.** No "Save to file" and no overwrite in
  place, so `showSaveFilePicker` is not used. Refresh is one-way.
- **Automatic detection of file changes.** No polling, no `FileSystemObserver`.
- **Renaming a Project.** A Project is named at creation. Not asked for; delete
  and recreate covers it until it is.
- **Snapshots crossing Projects**, and exporting a Snapshot on its own — both
  stay as decision-00008 left them.
- **Sync across tabs.** Two tabs on the same Project can overwrite each other's
  autosave, exactly as they can today.
- **Any server component.** Unchanged: no accounts, no backend (prd-00001).

## 6. Non-Functional

- Opening a Project reads one IndexedDB record; the board must render without a
  visible stall for the 96 KB `examples/big.json` class of Model.
- A Project's stored bytes stay linear in its own content — no Project's record
  can grow because another exists.

## Links
- Design: inline (§4)
- Decision: decision-00011-projects-in-indexeddb-file-handle-optional
- Plan: plan-00022-project-workspace
- Supersedes: us-00005-local-persistence
