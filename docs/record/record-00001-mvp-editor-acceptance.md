---
id: record-00001-mvp-editor-acceptance
type: record
role: main
status: active
parent: plan-00001-mvp-editor
---

# Acceptance record: MVP Event Storming editor

Acceptance evidence for [plan-00001-mvp-editor](../plan/plan-00001-mvp-editor.md).
Verified 2026-07-17. An independent subagent cross-checked every GWT against the
tests; the model-only gaps it flagged were then closed with UI-level E2E tests.

## Gate results

- Unit: **41 passed** (`bun run test`), coverage on `lib/**` **100% stmts /
  97.8% branch / 100% funcs / 100% lines** (≥90% bar met).
- E2E: **12 passed** (`bun run test:e2e`, Playwright/chromium).
- `bunx tsc --noEmit`, `bun run lint`, `bun run build` all clean.

## GWT coverage

| GWT / requirement id | Test | Result | Evidence |
| --- | --- | --- | --- |
| us-00001-AC-1.1 (place + color) | E2E `places a typed node…`, `placed node shows its conventional color` | pass | editor.spec.ts; asserts node exists + `rgb(246,166,35)` |
| us-00001-AC-2.1 (edit label shows) | E2E `editing the label updates the node…`; unit `updates only the target node's data` | pass | editor.spec.ts; store.test.ts |
| us-00001-AC-3.1 (pivotal marker) | E2E `toggling pivotal shows the marker…`; unit store.test.ts | pass | editor.spec.ts (`[aria-label=pivotal]`); store.test.ts |
| us-00001-AC-4.1 (delete + edge cleanup) | unit `removes a node and its attached edges` | pass | store.test.ts |
| us-00002-AC-1.1 (connect valid → issues) | E2E `connects Actor -> Command…`; unit store + relations | pass | editor.spec.ts; store.test.ts; relations.test.ts |
| us-00002-AC-2.1 (reject invalid) | E2E `rejects Actor -> Domain Event`; unit store + relations | pass | editor.spec.ts (no edge); see note 1 on feedback |
| us-00003-AC-1.1 (hotspot + annotates edge) | E2E `attaches a hotspot…`; unit `attaches a hotspot via an annotates edge` | pass | editor.spec.ts; store.test.ts |
| us-00003-AC-2.1 (edit hotspot text shows) | E2E `editing hotspot text updates the node` | pass | editor.spec.ts |
| us-00004-AC-1.1 (export validates + version) | unit `stamps the DSL version`, `round-trips through JSON`; E2E export | pass | serialize.test.ts; editor.spec.ts |
| us-00004-AC-3.1 (round-trip equals) | E2E `import then export round-trips…`; unit serialize round-trip | pass | editor.spec.ts; serialize.test.ts |
| us-00005-AC-1.1 (reload restores) | E2E `autosaves and restores on reload`; unit `saves and restores` | pass | editor.spec.ts; persistence.test.ts |
| us-00005-AC-2.1 (corrupt → empty, no crash) | unit `returns null … for corrupt storage`, `… schema-invalid` | pass | persistence.test.ts |
| spec-00001-XAC-1.1 (no network carries model) | E2E `keeps the model local…` + source grep | pass | editor.spec.ts (no POST/PUT/PATCH); see note 2 |
| spec-00001-XAC-2.1 (invalid import → error, unchanged) | E2E `shows an error on invalid import…`; unit serialize reject | pass | editor.spec.ts; serialize.test.ts |
| spec-00001-XFR-3 (reject unknown version) | unit `rejects an unknown DSL version` | pass | schema.test.ts; serialize.test.ts |

### Notes

1. **us-00002-AC-2.1 feedback**: the deterministic clause (no edge created) is
   asserted in E2E + unit. The "indicates the connection is not allowed"
   feedback is React Flow's built-in invalid-connection styling during the drag,
   enabled by the `isValidConnection` prop wired in `editor.tsx`.
2. **spec-00001-XAC-1.1**: the E2E asserts no mutating request (POST/PUT/PATCH)
   during editing/autosave. This is reinforced structurally: a source grep for
   `fetch(`/`XMLHttpRequest`/`sendBeacon`/`WebSocket`/`axios`/`EventSource` over
   `lib/`, `components/`, `app/` returns nothing — the app makes no data-carrying
   requests by construction.

## Tasks

T1–T10 complete. T11 (auto-layout) intentionally skipped (optional; kept out of
MVP scope). Working tree clean.

## Verdict

**ACCEPTED** — every `us`/`spec` GWT maps to at least one passing test, no
requirement is unfinished. plan-00001 may move to `resolved`.
