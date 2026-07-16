---
id: decision-00001-no-backend-testing-scope
type: decision
role: main
status: active
parent: idea-00001-visual-event-storming-web-tool
---

# Integration and API testing are N/A for the first version

## Context

The tool is a single-user, browser-only app with no backend, no HTTP API, and
no server-side persistence (see [analysis-00001](../analysis/analysis-00001-tech-stack-and-tooling.md)
and [ARCHITECTURE.md](../../ARCHITECTURE.md)). Data persists in browser local
storage; the portable artifact is a JSON file.

The template pins **Testcontainers** for integration testing and **Bruno** for
API testing. Both assume real service boundaries (database, messaging, HTTP
endpoints) that this project does not have.

## Decision

For the first version, **integration testing (Testcontainers) and API testing
(Bruno) are Not Applicable**. Testing is covered at two levels only:

- **Unit** — Vitest + React Testing Library (DSL schema/round-trip, connection
  rules, store, component behavior). See [UNIT_TESTING.md](../../UNIT_TESTING.md).
- **E2E** — Playwright (critical canvas flows, export/import round-trip,
  autosave). See [E2E_TESTING.md](../../E2E_TESTING.md).

## Consequences

- The N/A scope is recorded here only. `INTEGRATION_TESTING.md` (Testcontainers)
  and `API_TESTING.md` (Bruno) are kept as their template originals — no backend
  work uses them in v1, but the guidance is preserved for later, not deleted.
- If the roadmap later adds a backend (e.g. a collaboration server) or HTTP
  endpoints, revisit this decision: adopt the pinned Testcontainers/Bruno
  defaults from those guides and record the change as a patch or superseding
  decision.
