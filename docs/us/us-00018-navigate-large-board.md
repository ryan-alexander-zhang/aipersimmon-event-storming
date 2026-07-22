---
id: us-00018-navigate-large-board
type: us
role: main
status: active
parent: spec-00006-scale-navigation-nesting
---

# User Story: navigate a large board

As a Modeler,
I want to search elements by text, filter them by type and Bounded Context, and
navigate with a pan/zoom minimap,
so that I can find and move around a board with hundreds of elements.

## Requirements (EARS)

- **us-00018-FR-1** (Event) When the Modeler types a search query, the system shall
  highlight every element whose label or description matches (case-insensitive) and
  show a match count.
- **us-00018-FR-2** (Event) When the Modeler submits the search, the system shall
  fit the view to the matched elements.
- **us-00018-FR-3** (State) While a type filter is set, the system shall show only
  elements of the selected types (an empty selection means all types).
- **us-00018-FR-4** (State) While a Bounded Context filter is set, the system shall
  show only elements in the selected contexts, with Ungrouped selectable as one
  option (empty selection means all).
- **us-00018-FR-5** (Ubiquitous) The system shall treat search and filters as
  view-only state: they never change the Model or the exported DSL and reset on
  model load/clear.
- **us-00018-FR-6** (Ubiquitous) The system shall provide a minimap that supports
  pan and zoom to navigate large boards.
- **us-00018-FR-7** (Ubiquitous) The system shall apply search/filter on top of the
  Level and Isolate filters (intersection), never showing what those hide.

## Acceptance (GWT)

- **us-00018-AC-1.1** (us-00018-FR-1)
  Given a board with events "Order Placed" and "Payment Taken"
  When the Modeler searches "order"
  Then "Order Placed" is highlighted, "Payment Taken" is not, and the count reads 1
- **us-00018-AC-2.1** (us-00018-FR-2)
  Given a search matches two elements off-screen
  When the Modeler submits the search
  Then the view fits to those two elements
- **us-00018-AC-3.1** (us-00018-FR-3)
  Given a board with Commands and Domain Events at Design level
  When the Modeler filters to Domain Events only
  Then Commands are hidden and Domain Events remain
- **us-00018-AC-4.1** (us-00018-FR-4)
  Given elements in contexts Ordering and Payment
  When the Modeler filters to Ordering only
  Then only Ordering elements are shown
- **us-00018-AC-5.1** (us-00018-FR-5)
  Given an active query and filters
  When the model is exported
  Then the exported DSL is identical to the unfiltered export
- **us-00018-AC-6.1** (us-00018-FR-6)
  Given a large board
  When the Modeler drags/zooms in the minimap
  Then the main view pans/zooms accordingly
- **us-00018-AC-7.1** (us-00018-FR-7)
  Given the Level is Big Picture (Commands hidden)
  When a type filter includes Command
  Then no Command appears (Level still bounds the view)

## Links

- Spec: spec-00006-scale-navigation-nesting · Decision: decision-00006 · Plan: plan-00013-scale-navigation
