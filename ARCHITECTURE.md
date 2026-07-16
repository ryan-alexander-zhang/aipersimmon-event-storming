# Architecture Overview

Living reference for the Event Storming visual web tool. Update it as the
codebase evolves. See [docs/idea/idea-00001-visual-event-storming-web-tool.md](docs/idea/idea-00001-visual-event-storming-web-tool.md)
for product intent and [docs/analysis/analysis-00001-tech-stack-and-tooling.md](docs/analysis/analysis-00001-tech-stack-and-tooling.md)
for the tech-stack rationale.

## 1. What This Is

A single-user, browser-only web app for doing **Event Storming** (Process
Level) on an infinite canvas, and exporting the result as a structured,
validated **JSON DSL**. No collaboration, no accounts, no backend.

## 2. Project Structure

```
[Project Root]/
├── web/                     # The Next.js application (all runtime code)
│   ├── app/                 # Next.js App Router (pages, layout, entry)
│   ├── public/              # Static assets
│   ├── package.json         # App dependencies and scripts
│   ├── next.config.ts       # Next config (static export target)
│   └── tsconfig.json
├── docs/                    # Durable docs (idea, analysis, plan, ...) — see docs/README.md
├── <root workflow docs>     # ARCHITECTURE / DEVELOPMENT / TESTING / CONTEXT / ...
└── scripts/                 # Repo automation
```

Planned structure inside `web/` as the feature is built (kept flat, no `src/`):

```
web/app/
├── page.tsx                 # Editor shell (canvas + panels), client component
├── layout.tsx
└── globals.css
web/components/              # Canvas, custom nodes, element palette, property panel
web/lib/
├── dsl/                     # Zod schema (source of truth), export/import
├── store/                   # Zustand store (nodes, edges, selection)
└── eventstorming/           # Element/relation definitions, colors, connection rules
```

## 3. High-Level Flow

```
[User] ─┬─ drag/edit ─▶ [Zustand Store] ─derive─▶ [Zod DSL schema] ─┬─▶ [Export JSON]
        │                       │                                    └─▶ [Import JSON]
        └─ canvas (React Flow) ─┘
                                │ autosave (debounced)
                                ▼
                    [localStorage / IndexedDB]
```

All state lives in the browser. The Zod DSL schema is the single source of
truth shared by the store, the export format, and import validation.

## 4. Core Components

### 4.1 Frontend (the whole app)

- Name: Event Storming Editor (`web/`)
- Purpose: infinite canvas to place typed Event Storming elements, connect them
  with semantic relations, annotate hotspots, and export/import the model.
- Technologies: Next.js (App Router) + React 19 + TypeScript, React Flow
  (`@xyflow/react`) for the canvas, Zustand for state, Zod for the DSL schema
  and validation, Tailwind CSS + shadcn/ui, lucide-react icons.
- Deployment: static export (`next build`) to any static host (Vercel / GitHub
  Pages / etc.).

### 4.2 Backend

None. The app is frontend-only.

## 5. Data Stores

- **Browser local storage** (localStorage, or IndexedDB via `idb`/`Dexie` if the
  model grows): autosaves the current model so work is not lost on reload.
- **JSON files**: the DSL export/import is the portable, git-versionable
  artifact.

There is no database or server-side persistence.

## 6. Domain Model (Event Storming — Process Level)

Elements (nodes): Domain Event, Command, Actor/Agent, Aggregate, Policy,
Read Model/Query, External System, Hotspot, Pivotal Event. Relations (edges)
are **semantic**: `issues`, `handledBy`, `emits`, `triggers`, `invokes`,
`informs`, `annotates`. See the idea doc for the full grammar and the DSL draft;
canonical vocabulary lives in [CONTEXT.md](CONTEXT.md).

## 7. External Integrations

None in the first version. Roadmap: PlantUML/Mermaid and AsyncAPI export.

## 8. Deployment & Infrastructure

- Build: `next build` (static export).
- CI/CD: GitHub Actions (this repo ships a `frozen-docs` workflow for template
  hygiene; app build/test CI to be added with the implementation plan).
- Monitoring: none (client-only static app).

## 9. Security Considerations

- No auth, no server, no user data leaves the browser. The main surface is
  import: untrusted JSON is validated with Zod (`safeParse`) before it touches
  the store. See [SECURITY.md](SECURITY.md).

## 10. Development & Testing

- Local setup and commands: [DEVELOPMENT.md](DEVELOPMENT.md).
- Test levels and frameworks: [TESTING.md](TESTING.md) (Vitest + RTL for unit,
  Playwright for E2E; integration/API testing N/A — no backend).

## 11. Roadmap

See §8 of the idea doc: PlantUML/Mermaid + PNG/SVG export, Big Picture and
Software Design levels, File System Access API for local `.json` project files,
AsyncAPI/event-contract export, and (optional) a collaboration backend.
