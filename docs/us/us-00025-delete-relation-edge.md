---
id: us-00025-delete-relation-edge
type: us
role: patch
status: active
parent: us-00002-connect-elements
---

# User Story: delete a relation edge on the board

> Patch to [us-00002](us-00002-connect-elements.md): that story covers creating a
> relation edge but gives no way to remove one. A wrong manual link (or a relation
> auto-created by a slice action) can only be undone today by deleting an endpoint
> element, which destroys more than intended. This patch adds direct edge removal,
> mirroring the delete affordance the Context Map already has for context
> relationships (us-00020-FR-4).

As a Modeler,
I want to delete a single relation edge on the board without touching its endpoints,
so that I can correct a wrong relation without losing the elements it connected.

## Requirements (EARS)

- **us-00025-FR-1** (Event) When the Modeler deletes a relation edge on the board,
  the system shall remove that edge from the model and leave both endpoint elements
  in place.
- **us-00025-FR-2** (Event) When the Modeler hovers a relation edge, the system shall
  reveal an inline delete control on that edge, so removal is discoverable in place.

## Acceptance (GWT)

- **us-00025-AC-1.1** (us-00025-FR-1)
  Given two elements connected by a relation edge
  When the Modeler deletes that edge
  Then no edge remains between the two elements
  And both elements are still on the board
- **us-00025-AC-2.1** (us-00025-FR-2)
  Given a relation edge on the board
  When the Modeler hovers over it
  Then an inline delete control appears on the edge

## Links

- Spec: spec-00001-mvp-editor · Plan: plan-00001-mvp-editor · Parent: us-00002-connect-elements
