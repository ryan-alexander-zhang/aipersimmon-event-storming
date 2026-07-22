---
id: us-00019-classify-subdomain
type: us
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# User Story: classify a Bounded Context as a subdomain type

As a Modeler,
I want to label each Bounded Context as core / supporting / generic,
so that I can see at a glance where the strategically important parts of the
business are and where to invest.

## Requirements (EARS)

- **us-00019-FR-1** (Event) When the Modeler sets a Bounded Context's
  classification to core, supporting, or generic, the system shall store it on the
  context.
- **us-00019-FR-2** (State) While a Bounded Context has a classification, the system
  shall show it on the context's legend chip (a labelled badge).
- **us-00019-FR-3** (Event) When the Modeler clears the classification, the system
  shall return the context to unclassified (no badge); classification is optional.
- **us-00019-FR-4** (Ubiquitous) The system shall round-trip the classification
  through the DSL (export/import) without loss.

## Acceptance (GWT)

- **us-00019-AC-1.1** (us-00019-FR-1/FR-2)
  Given a Bounded Context "Ordering"
  When the Modeler sets its classification to core
  Then the Ordering chip shows a "core" badge
- **us-00019-AC-2.1** (us-00019-FR-3)
  Given a Bounded Context classified as core
  When the Modeler clears the classification
  Then the chip shows no classification badge
- **us-00019-AC-3.1** (us-00019-FR-4)
  Given a model with a core-classified context
  When it is exported and re-imported
  Then the context is still classified core
- **us-00019-AC-4.1** (us-00019-FR-4)
  Given a pre-strategic-layer DSL file (no classification field)
  When it is imported
  Then every context loads as unclassified without error

## Links

- Spec: spec-00004-strategic-subdomains-context-map · Plan: plan-00014-strategic-layer
