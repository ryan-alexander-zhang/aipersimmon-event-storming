# E2E Testing

Project-specific E2E testing guide for this repo.

## Test Framework

Framework: **Playwright**, run in `web/`. Chosen because it drives real browsers
against the running app, which is what an infinite-canvas editor needs (drag,
zoom, keyboard, download/upload for export/import), and it has first-class
Next.js support and CI reporters.

## Command

```bash
# from web/
bun run test:e2e            # headless
bun run test:e2e --ui       # interactive UI mode
bun run test:e2e --headed   # watch the browser
```

## Scope

- **In scope**: critical happy-path flows — drag an element onto the canvas,
  connect two elements with a valid relation, annotate a hotspot, export the
  model to JSON and re-import it (round-trip), and autosave surviving a reload.
- **Out of scope**: exhaustive per-element/per-relation permutations (unit
  tests) and pixel-level styling.

## Environment

- Browsers: Chromium (add Firefox/WebKit only if a bug warrants it).
- Playwright starts the app via `webServer` (`bun run dev` / preview build). No
  external services, database, or network — the app is client-only.
- Test data is created in-test on a fresh browser context (empty local storage).

## Gate

`bun run test:e2e` exits 0 — all critical-flow specs green — before merging a
change to a critical user flow (per the [TESTING.md](TESTING.md) matrix).

## Report

Playwright HTML report under `web/playwright-report/`; traces/screenshots/videos
on failure under `web/test-results/`. CI publishes the HTML report as an artifact.
