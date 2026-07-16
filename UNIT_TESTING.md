# Unit Testing

Project-specific unit testing guide for this repo.

## Test Framework

Framework: **Vitest** + **React Testing Library** (`@testing-library/react`),
run in `web/`. Chosen because Vitest is fast, ESM/TypeScript-native, and the
standard fit for a Vite/Next + React 19 toolchain; RTL covers behavior of custom
node and panel components.

## Command

```bash
# from web/
bun run test            # run once
bun run test --watch    # watch mode
bun run test --coverage # with coverage
```

## Scope

- **In scope**: the DSL layer (Zod schema, export/import round-trip), the
  connection-rule logic (which relations are valid between which element types),
  Zustand store reducers, and pure component behavior (rendering, edit callbacks).
- **Out of scope**: full canvas drag/zoom interaction and multi-view flows —
  those belong to E2E (see [E2E_TESTING.md](E2E_TESTING.md)).

## Gate

`bun run test` exits 0 and meets the coverage bar in [TESTING.md](TESTING.md)
(90% line/branch/function for executable changes).

## Report

Vitest prints per-file results and coverage to the terminal; coverage HTML is
written under `web/coverage/`. CI publishes the same run.
