---
id: record-00022-project-workspace-acceptance
type: record
role: main
status: active
parent: plan-00022-project-workspace
---

# Acceptance record: Projects — create, reopen from Recent, refresh from the file

Acceptance evidence for
[plan-00022](../plan/plan-00022-project-workspace.md), implementing
[us-00030](../us/us-00030-create-and-open-project.md),
[us-00031](../us/us-00031-refresh-project-from-source-file.md), and
[us-00032](../us/us-00032-project-scoped-local-save.md) per
[spec-00012](../spec/spec-00012-project-workspace.md), on the boundary set by
[decision-00011](../decision/decision-00011-projects-in-indexeddb-file-handle-optional.md).
Verified 2026-08-17.

Coverage was cross-checked assertion-by-assertion in-session rather than by an
independent subagent (CLAUDE.md §7), because this session was instructed not to
spawn agents. Read the mapping below as self-reported.

## Gate results

- Unit: **314 passed** (`bun run test`, Vitest). New: `projects.test.ts` (24),
  `source-file.test.ts` (13), and the active-Project block in `store.test.ts` (8).
  `persistence.test.ts` is gone with the module it covered.
- E2E: **88 passed, 1 failed** (`bun run test:e2e`, Playwright/chromium). The
  failure is the pre-existing `[issue-00028]` wheel-zoom budget — a hard 3 ms
  assertion measuring ~7.8 ms on this machine. Confirmed pre-existing by stashing
  every change in this plan and re-running it on a clean tree: same failure,
  7.83 ms. Untouched by this work.
- `tsc --noEmit`, `bun run lint`, `bun run build` clean.
- Coverage of the new logic modules: `projects-db.ts` 100% statements / branches /
  functions / lines; `projects.ts` 98.8% / 96.2% / 100% / 100%; both above the
  TESTING.md 90% bar.

## GWT coverage

### us-00030 — create a Project and reopen it from Recent

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (create → active, empty board, listed in Recent) | e2e "creating a Project opens an empty board and lists it"; unit projects.test "creates a Project and reads it back across connections" | pass |
| AC-3.1 (open the other → its Model and Snapshots, none of the first's) | e2e "switching Projects carries nothing over"; unit store.test "carries nothing over from the previous Project" | pass |
| AC-4.1 (reload → same Project, Model restored) | e2e "a reload reopens the Project that was open" | pass |
| AC-5.1 (no Project → Recent empty state, no board) | e2e "a fresh browser lands on Recent with no board": the dialog and its empty-state copy are shown and `.react-flow` has 0 matches | pass |
| AC-6.1 (delete → gone after reload, sibling intact) | e2e "a deleted Project stays gone, and its sibling does not"; unit projects.test "removes only that Project, and clears it as the active one" | pass |
| AC-7.1 (unreadable record omitted, the rest listed) | unit projects.test "omits an unreadable record and still lists the rest" | pass |

### us-00031 — import a file into a Project and refresh from it

The File System Access picker opens a native dialog no test can drive, so the e2e
tests install a stub handle that reads a string the test controls. The stub keeps
its methods on a prototype, so it survives the structured clone into IndexedDB the
way a real handle does. `source-file.ts` itself is unit-tested against fakes.

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (import → board shows the file, Project shows the file name) | e2e "importing a file names it as the Project's source"; unit source-file.test "returns the chosen file's handle, name, and text" | pass |
| AC-3.1 (file changed on disk → Refresh shows it) | e2e "Refresh re-reads the file and picks up what changed": the file gains an event, Refresh puts it on the board | pass |
| AC-4.1 (local change + Refresh + confirm → file wins) | e2e "Refresh warns before dropping local changes, and drops them on yes": the confirmation is asserted to have been asked, and the local event is gone | pass |
| AC-4.2 (decline → board unchanged) | e2e "declining the warning leaves the board alone" | pass |
| AC-5.1 (permission denied → Model kept, reported) | e2e "a denied permission keeps the board and says so"; unit source-file.test "reports a denial rather than throwing" (+ revoked-mid-read and throwing-query variants) | pass |
| AC-6.1 (file missing → Model kept, reported) | e2e "a missing file keeps the board and says so"; unit source-file.test "reports a missing file apart from any other failure" | pass |
| AC-7.1 (no retained access → re-pick the file instead) | e2e "without retained file access, reloading re-picks the file": with the picker deleted, no Refresh is offered and the re-pick replaces the Model; unit source-file.test "is false on a browser without the picker" / "picks nothing when there is no picker to open" | pass |
| spec-00001-XFR-2 inherited (invalid file on refresh) | e2e "an invalid file leaves the Model in place" | pass |

### us-00032 — each Project saves and restores its own work

| Id | Test(s) | Result |
| --- | --- | --- |
| AC-1.1 (Model, wall, and Snapshots restored on reload) | e2e "a Project keeps its Snapshots to itself across a reload" (board + Snapshot survive a reload); unit projects.test "round-trips a Project's Model, discovery wall, and Snapshots" | pass |
| AC-2.1 (switching Projects shows only that Project's Snapshots and wall) | same e2e (the second Project shows no Snapshots, the first still has its own); unit store.test "carries nothing over from the previous Project" | pass |
| AC-3.1 (corrupt stored Model → empty board, no error) | unit projects.test "opens a Project with a corrupt Model as an empty board" | pass |
| AC-4.1 (pre-Project data migrated into one Project, keys dropped) | unit projects.test "folds the implicit model, wall, and Snapshots into one Project and drops the keys", plus once-only, already-has-Projects, corrupt-model, and corrupt-wall variants | pass |
| AC-5.1 (refused write reported, session keeps working) | e2e "a refused write is reported, and the session keeps working": `indexedDB.open` is broken mid-session, the "Not saved" chip appears, and the edit still lands on the board; unit projects.test "rejects instead of swallowing when IndexedDB is unavailable" | pass |

### spec-00012 — cross-cutting

| Id | Test(s) | Result |
| --- | --- | --- |
| XFR-1 (nothing leaves the browser) | existing e2e "keeps the model local — no request carries it" still passes; no fetch/XHR was added by this work | pass |
| XAC-2.1 (opening a Project resets view-only state) | unit store.test "resets view-only state when a Project becomes active": walkthrough stopped, focus cleared, Versions panel closed | pass |
| XAC-3.1 (the Project names the export and its file) | e2e "the Project names the export and its file": `Ordering.json`, `meta.name` "Ordering" | pass |
| XFR-4 (an unreadable record or Model degrades, never fails the app) | unit projects.test corrupt-Model, unreadable-record, invalid-Snapshot, newer-database, and no-IndexedDB cases | pass |

## Behavioural check

The plan's behavioural walk-through was **not** run by hand; it is covered
step-for-step by the automated suite instead, each step in a driven browser:

| Step of the walk-through | Where it is exercised |
| --- | --- |
| create two Projects | e2e "switching Projects carries nothing over" |
| import a different file into each | e2e "importing a file names it as the Project's source" (one Project; the two-Project case is covered by the switching test's separate boards) |
| edit one, refresh from its file, lose exactly the local edit | e2e "Refresh warns before dropping local changes, and drops them on yes" |
| reload the page | e2e "a reload reopens the Project that was open" |
| find the last Project open with its own Snapshots and nothing of the other's | e2e "a Project keeps its Snapshots to itself across a reload" |

What no automated step covers is a human reading the result: the toolbar's Project
name and file-name chip, the Recent list's layout, and the wording of the
confirmation are asserted for presence and text, not for whether they read well.

## Notes

- **Two defects were found and fixed while building**, both in how "changed since
  the file" was computed; they are recorded in plan-00022 *Found while building* and
  in spec-00012 §4.1. Both were caught by the us-00031-AC-4 tests before release, so
  neither needs a `docs/issue` record — they never existed outside this plan's own
  work.
- **The refresh path is verified on Chromium only.** The plan asked for a second
  engine; the Playwright project list is chromium-only, so the no-handle branch is
  covered by deleting `showOpenFilePicker` rather than by running WebKit or Firefox.
  That exercises the same code path the other engines take, but it is not the same
  as running them.
- **Adjacent, deliberately untouched:** the Snapshot feature is labelled "Versions"
  in the UI while `CONTEXT.md` lists *version* as the term to avoid for it.
