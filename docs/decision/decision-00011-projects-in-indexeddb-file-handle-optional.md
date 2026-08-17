---
id: decision-00011-projects-in-indexeddb-file-handle-optional
type: decision
role: main
status: active
parent: prd-00001-event-storming-tool
---

# Projects live in IndexedDB; the source file is an optional attachment

> Driven by [prd-00001](../prd/prd-00001-event-storming-tool.md) FR5 (export /
> import) and FR6 (autosave), which the tool outgrew: both are written for a
> single implicit model. **Narrows** [decision-00008](./decision-00008-snapshots-outside-dsl.md)
> §4 — Snapshots stop being "browser-local working model"-scoped and become
> Project-scoped. Shape owned by [spec-00012](../spec/spec-00012-project-workspace.md).

## Context

The tool holds exactly one implicit model. `persistence.ts` autosaves it under
three fixed `localStorage` keys — `event-storming:model`,
`event-storming:discovery`, `event-storming:snapshots` — and `importJSON`
replaces it in place. A Modeler who works on two domains has to export one and
import the other by hand, and the two share one snapshot collection.

The ask is a **Project**: create one, reopen it from a Recent list, import a
`.json` into it, and **refresh** it when that file changes on disk. Everything
stays browser-only — no account, no backend (prd-00001 *Goals*).

Two things have to be settled before any of it can be built.

### Where a project is stored

`localStorage` is string-only and holds ~5 MB per origin. The largest example
model in the repo is already 96 KB (`examples/big.json`); several projects, each
carrying its own snapshots (a snapshot is a *full* model copy, decision-00008),
reach that ceiling quickly — and the current failure mode is a silently swallowed
quota error.

### How "refresh from the file" can work at all

The browser does not give a web page a re-readable path. `<input type="file">`
reports `C:\fakepath\…`, and the `File` object it yields cannot be re-read after a
reload. Only the **File System Access API** can: `showOpenFilePicker()` returns a
`FileSystemFileHandle` that is *structured-cloneable*, so it can be stored and
retrieved later, and re-authorised with one click via
`queryPermission` / `requestPermission`. It is Chromium-desktop only — Firefox and
Safari do not implement it for user files.

So a design that makes the handle the *identity* of a project would be
non-functional on two of three engines.

## Decision

**A Project is a record in IndexedDB that owns a full copy of its content. A
source file handle is an optional attachment on that record, never its identity.**

1. **IndexedDB, not `localStorage`.** One database (`event-storming`), one object
   store keyed by project id. A record holds `{ id, name, createdAt, lastOpenedAt,
   model, discovery, snapshots, source? }`. Two reasons, and either alone is
   sufficient: the quota is orders of magnitude larger, and — decisively — a
   `FileSystemFileHandle` *cannot* be persisted in `localStorage` at all, because
   it survives structured cloning and not `JSON.stringify`.

2. **The stored copy is what "open a project" reads.** Never the file. This is
   what keeps Recent, reopen, and reload working identically on every browser, on
   a machine where the file was moved or deleted, and for a project that never had
   a file at all.

3. **`source` is optional and additive.** When the browser can retain file access,
   Import stores `{ handle, name, lastRefreshedAt }` on the project and Refresh
   becomes available. When it cannot, the project simply has no `source`, and the
   same operation is offered as re-selecting the file through the existing
   `<input type="file">`. Validate → confirm → replace is identical either way;
   the difference is one extra click, not a missing capability.

4. **Refresh is one-way and file-wins.** It re-reads, validates, and replaces the
   project's model. When the project has local changes made since it was last
   loaded from its file, it asks for confirmation first, then overwrites. The tool
   never writes back to the file — Export stays the only way out.

5. **Everything project-scoped moves together.** Model, discovery wall, and
   snapshots live on the record, so opening a project restores all three and shows
   no other project's. This retires the decision-00008 §4 boundary ("importing a
   different model leaves snapshots in place"), which was a documented wart that
   only existed because there was one implicit model to scope them to.

6. **One pre-project migration, then the old keys go.** On first load, existing
   `event-storming:*` `localStorage` data becomes one project; the keys are
   removed once the record is written. `localStorage` keeps exactly one job: the
   id of the last active project, so boot can reopen it synchronously.

## Consequences

- `persistence.ts` becomes async. Every caller — the `useAutosave` hydrate/subscribe
  cycle in `editor.tsx` — has to deal with a promise it did not deal with before.
  This is the main cost, and it is paid once.
- Snapshots stop leaking across imported models, without any change to
  `modelSchema` or `DSL_VERSION`. Decision-00008's core (snapshots outside the
  DSL) is untouched; only their *scope* is narrowed from the browser to a project.
- Refresh is a first-class feature on Chromium desktop and a two-click equivalent
  elsewhere. No feature is browser-gated away, so no user is told "your browser
  cannot do this".
- A project can outlive its file. That is deliberate (§2), and it means "Refresh"
  can fail on a moved file while the project still opens fine.
- Quota stops being a silent swallow: with several projects it becomes reachable
  enough to report. Handling belongs to spec-00012, not here.
- Not chosen: keying projects by file handle (breaks Firefox/Safari entirely);
  the Origin Private File System (a private sandbox the user cannot point at their
  own `.json`, so it answers neither Import nor Refresh); a backend (out of scope
  per prd-00001 *Goals*).
