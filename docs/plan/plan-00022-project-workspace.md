---
id: plan-00022-project-workspace
type: plan
role: main
status: resolved
parent: spec-00012-project-workspace
---

# Plan: Projects — create, reopen from Recent, refresh from the source file

Implements [us-00030](../us/us-00030-create-and-open-project.md),
[us-00031](../us/us-00031-refresh-project-from-source-file.md), and
[us-00032](../us/us-00032-project-scoped-local-save.md) per
[spec-00012](../spec/spec-00012-project-workspace.md), on the storage boundary set
by [decision-00011](../decision/decision-00011-projects-in-indexeddb-file-handle-optional.md).
Terms follow [CONTEXT.md](../../CONTEXT.md).

The order matters: the storage layer has to be real before the store can own an
active Project, and the store has to own one before any surface can switch
Projects. The source file lands **last**, on purpose — it is the only part that is
browser-gated, and every phase before it ships a working multi-Project tool
without it.

Two things to hold onto while implementing:

- **`persistence.ts` goes async.** Its callers do not expect a promise today —
  `useAutosave` in `editor.tsx` hydrates synchronously on mount and writes from a
  `subscribe` callback. That hydrate/write cycle is the one genuinely fiddly edit
  in this plan; the rest is additive.
- **The board must not render without an active Project.** Otherwise the first
  autosave tick writes an empty Model into whatever record is active, or into
  none, and us-00030-FR-5 becomes a data-loss bug rather than an empty state.

## Phase 1 — the Project store on IndexedDB

| # | Task | Verify |
|---|---|---|
| P1.1 | `lib/store/projects-db.ts`: open/upgrade `event-storming` DB with one `projects` object store keyed by `id`; promise wrappers over the IDB request API. | unit: create → read back a record; a second open finds it |
| P1.2 | `lib/store/projects.ts`: `listProjects` / `createProject` / `loadProject` / `saveProject` / `deleteProject` over P1.1, **beside** the existing `persistence.ts` rather than replacing it — the legacy loaders still have callers until P2, and `migrateLegacy` reads their keys. `loadProject` runs `migrateToLatest` + `modelSchema.safeParse` on the Model and on every Snapshot, dropping invalid Snapshots as it does today. | unit: round-trip a record with Model + discovery + Snapshots; corrupt Model → empty board, no throw (us-00032-AC-3.1); corrupt Snapshot dropped, siblings kept |
| P1.3 | `listProjects` sorts by `lastOpenedAt` descending and skips records it cannot read. | unit: order is most-recent-first; one unreadable record omitted, rest listed (us-00030-AC-7.1) |
| P1.4 | `migrateLegacy()`: when `projects` is empty and any `event-storming:model\|discovery\|snapshots` key exists, write one record from them (name from `meta.name`, else `"Untitled"`), then remove the three keys. Runs once at boot. | unit: legacy keys → one Project holding all three, keys gone; second run is a no-op (us-00032-AC-4.1) |
| P1.5 | `deleteProject` removes the record and clears `event-storming:activeProject` when it pointed at it. | unit: deleted record gone, siblings intact (us-00030-AC-6.1) |

## Phase 2 — the store owns an active Project

| # | Task | Verify |
|---|---|---|
| P2.1 | `store.ts`: `activeProject: { id, name, source?, dirty } \| null`; `openProject(record)` loads Model + discovery + Snapshots through the existing `setModel` path and resets view-only state; `closeProject()`. | unit: opening a Project with a walkthrough running and a context focused leaves neither (spec-00012-XAC-2.1) |
| P2.2 | `store.ts`: `openProject` replaces Snapshots and the discovery wall rather than keeping them — the decision-00008 §4 carry-over is gone. | unit: A has a Snapshot, B has none → open B → none; back to A → A's Snapshot (us-00032-AC-2.1) |
| P2.3 | `store.ts`: `dirty` set by any Model mutation after hydration, cleared when the Model was loaded from a file. | unit: hydrate → not dirty; add a node → dirty; load from file → not dirty |
| P2.4 | `editor.tsx` `useAutosave`: hydrate from the active Project asynchronously, and debounce-write the Model, discovery, and Snapshots back to *that* Project's record. No write when no Project is active. | unit + e2e: edit → reload → restored (us-00032-AC-1.1); no active Project → nothing written |
| P2.5 | `editor.tsx`: render no board while `activeProject` is null. | e2e: fresh browser → no canvas (us-00030-AC-5.1) |
| P2.6 | Surface a save failure (quota / rejected write) instead of swallowing it; the session keeps working. | unit: rejecting write → state reports not-saved, edits still apply (us-00032-AC-5.1) |
| P2.7 | Delete the now-orphaned legacy functions in `persistence.ts` (`saveModel` / `loadModel` / `clearSaved` and the discovery + Snapshot pairs) once P2.4 and P3.5 have moved their callers; keep the three `STORAGE_KEY*` constants that `migrateLegacy` reads. | `tsc` + lint clean with no unused export; `persistence.test.ts` reduced to what still exists |

## Phase 3 — Recent, and the surface to create and open

| # | Task | Verify |
|---|---|---|
| P3.1 | `components/projects-dialog.tsx`: Recent list (name + last opened, most recent first), New, Open, Delete-with-confirm; empty state offering New and Import. | e2e: create "Ordering" → active, empty board, listed in Recent (us-00030-AC-1.1) |
| P3.2 | Boot: read `event-storming:activeProject`, run `migrateLegacy`, open that Project; if it is gone or none is set, open the dialog. | e2e: reload with a Project open → same Project restored (us-00030-AC-4.1) |
| P3.3 | Open from Recent swaps the whole Project, and stamps `lastOpenedAt`. | e2e: two Projects → open the other → its Model and Snapshots, none of the first's (us-00030-AC-3.1) |
| P3.4 | Delete from Recent, confirmed, and it stays gone across a reload. | e2e: delete one of two → gone after reload, the other still opens intact (us-00030-AC-6.1) |
| P3.5 | `file-menu.tsx`: "New" becomes "Projects…" — a Project needs a name, so it hands over to Recent rather than clearing the board in place. | e2e: the menu reaches the dialog |

## Phase 4 — the source file

| # | Task | Verify |
|---|---|---|
| P4.1 | `lib/store/source-file.ts`: capability probe for `window.showOpenFilePicker`; `pickFile()` returning `{ handle, name, text }`; `readHandle(handle)` doing query → request permission → `getFile().text()`, with typed `denied` / `not-found` / `unreadable` failures. | unit against a faked handle: granted reads; denied and missing return their own failure, never throw |
| P4.2 | Import into the active Project: via `pickFile` where supported (storing `source`), via the `<input type="file">` where not. Both validate with `importJSON`, replace the Model, and clear `dirty`. Import moves out of the File menu into `source-file.tsx` — it belongs with the source file, and one hidden file input in the board keeps the existing `setInputFiles("input[type=file]")` e2e selectors unambiguous. | e2e: import → board shows the file's Model; supported browser also shows the file name (us-00031-AC-1.1) |
| P4.3 | Toolbar shows the source file name and offers Refresh (last-refreshed on its tooltip); without a `source`, it offers "Reload from file…" instead. | e2e: Refresh present with the file name; with the picker taken away, the re-pick action instead (us-00031-AC-7.1) |
| P4.4 | Refresh: `readHandle` → `importJSON` → replace, stamp `lastRefreshedAt`, clear `dirty`. Invalid JSON keeps the Model and shows the error (spec-00001-XFR-2). | e2e: file gains an element on disk → refresh → the new element is on the board (us-00031-AC-3.1); invalid file → Model kept, error shown |
| P4.5 | Dirty confirmation: when `dirty`, refresh states the local changes will be lost and requires confirmation; declining changes nothing. | e2e: confirm → board matches the file, local element gone (us-00031-AC-4.1); decline → board unchanged (us-00031-AC-4.2) |
| P4.6 | Permission denied and missing-file both keep the Model and report which happened. | e2e/unit: denied → unchanged + "not read" (us-00031-AC-5.1); deleted file → unchanged + "not found" (us-00031-AC-6.1) |

## Phase 5 — the Project's name, and retiring what it replaces

| # | Task | Verify |
|---|---|---|
| P5.1 | Export uses the active Project's name for `meta.name` and the file name, replacing the hardcoded `"Event Storming"` (`file-menu.tsx:45`, `persistence.ts:34`, `store.ts:548`) and `event-storming.json`. | e2e: export from "Ordering" → file named for it, `meta.name` is "Ordering" (spec-00012-XAC-3.1) |
| P5.2 | `CONTEXT.md`: add **Project** and **Recent**; narrow **Snapshot** to Project-scoped and drop the decision-00008 §4 carry-over sentence. | review: no term in the glossary contradicts the code |
| P5.3 | Set `us-00005` to `archived` pointing at `us-00032`; update the spec-00001 story table; add the override note to decision-00008 §4. | review: one live main doc per topic (DOCUMENT.md) |

## Found while building

- **`dirty` cannot be the `nodes` array.** React Flow replaces node objects on size,
  position, and selection changes, and the layout engine rebuilds them on every
  reflow — so an array-identity check called a Project dirty seconds after opening
  it, and every Refresh then warned about changes nobody made. It compares the DSL
  fields instead (spec-00012 §4.1).
- **`dirty` has to be immediate, not debounced.** Setting it inside the 400 ms
  autosave meant a Refresh in the first moment after an edit discarded that edit
  without asking — the exact case us-00031-FR-4 exists for.
- **A load is not an edit.** Importing a file changes the Model, which would
  immediately mark the Project changed *against the file it just came from*. Hence
  `syncToken` and the autosave re-baseline.

## Out of scope

Carried from spec-00012 §5, and worth restating because each is a plausible next
step someone will reach for mid-implementation: no writing back to the file (no
`showSaveFilePicker`), no automatic change detection (no polling, no
`FileSystemObserver`), no Project rename, no cross-tab sync, no Snapshot movement
between Projects.

One adjacent defect found while scoping, deliberately **not** fixed here: the UI
labels the Snapshot feature "Versions" (`components/panel-rail.tsx:39`), which
`CONTEXT.md:212` explicitly lists as the term to avoid. It is a rename in a file
this plan does not otherwise touch — worth its own change, not a rider on this one.

## Acceptance path

`resolved` only when, per [DEVELOPMENT.md](../../DEVELOPMENT.md) and CLAUDE.md §7:

- All phases done; `tsc`, `bun run lint`, `bun run build` clean; unit + e2e green.
- Every us-00030 / us-00031 / us-00032 GWT and every spec-00012 XAC has a passing
  test, verified by a subagent from the docs and recorded in `docs/record/`.
- The refresh phase is verified on a Chromium browser **and** on one without the
  File System Access API, since P4.3's two branches cannot both run on one engine.
- Behavioural: create two Projects, import a different file into each, edit one,
  refresh it from its file and lose exactly the local edit, reload the page, and
  find the last Project open with its own Snapshots and nothing of the other's.
