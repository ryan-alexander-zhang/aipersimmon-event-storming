---
id: us-00020-context-relationships-map
type: us
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# User Story: model context relationships and view them as a Context Map

As a Modeler,
I want to draw typed, directed relationships between Bounded Contexts and see them
as a bird's-eye Context Map,
so that I can reason about how my subsystems integrate and where the hard
boundaries are.

## Requirements (EARS)

- **us-00020-FR-1** (Event) When the Modeler opens the Context Map, the system shall
  render each Bounded Context as a node (its name, tint, and classification badge)
  and each context relationship as a directed edge.
- **us-00020-FR-2** (Event) When the Modeler connects one context to another in the
  Context Map, the system shall create a directed relationship (source = upstream,
  target = downstream) whose type defaults to Customer/Supplier.
- **us-00020-FR-3** (Event) When the Modeler changes a relationship's type, the
  system shall set it to one of: Partnership, Shared Kernel, Customer/Supplier,
  Conformist, Anticorruption Layer.
- **us-00020-FR-4** (Event) When the Modeler deletes a relationship, the system
  shall remove it from the model.
- **us-00020-FR-5** (Event) When a Bounded Context is removed, the system shall also
  remove every relationship that touches it.
- **us-00020-FR-6** (Ubiquitous) The system shall round-trip context relationships
  through the DSL (export/import) without loss.
- **us-00020-FR-7** (Ubiquitous) The system shall keep the Context Map a distinct
  view: entering/leaving it never mutates the timeline board or its elements.

## Acceptance (GWT)

- **us-00020-AC-1.1** (us-00020-FR-1)
  Given contexts Ordering and Payment and one relationship between them
  When the Modeler opens the Context Map
  Then two context nodes and one directed edge are shown
- **us-00020-AC-2.1** (us-00020-FR-2)
  Given the Context Map with Ordering and Payment
  When the Modeler connects Ordering → Payment
  Then a relationship exists with source Ordering, target Payment, type
  Customer/Supplier
- **us-00020-AC-3.1** (us-00020-FR-3)
  Given a relationship of type Customer/Supplier
  When the Modeler changes its type to Anticorruption Layer
  Then the relationship's type is Anticorruption Layer and the edge label updates
- **us-00020-AC-4.1** (us-00020-FR-4)
  Given a relationship between two contexts
  When the Modeler deletes it
  Then no relationship remains between those contexts
- **us-00020-AC-5.1** (us-00020-FR-5)
  Given Ordering has a relationship to Payment
  When the Modeler removes the Ordering context
  Then the relationship is gone too
- **us-00020-AC-6.1** (us-00020-FR-6)
  Given a model with a Conformist relationship
  When it is exported and re-imported
  Then the relationship (source, target, type) is preserved
- **us-00020-AC-7.1** (us-00020-FR-7)
  Given a timeline board with events
  When the Modeler opens and closes the Context Map
  Then the events, their order, and contexts are unchanged

## Links

- Spec: spec-00004-strategic-subdomains-context-map · Design: design-00007-context-map-surface · Plan: plan-00014-strategic-layer
