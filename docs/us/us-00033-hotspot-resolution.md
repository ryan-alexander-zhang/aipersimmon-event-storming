---
id: us-00033-hotspot-resolution
type: us
role: main
status: active
parent: spec-00003-hotspot-workflow-opportunity
---

# User Story: a resolved Hotspot records how it was resolved

As a Modeler,
I want a Hotspot to carry the resolution that closed it,
so that months later the board still says what was decided, not just that
something once was.

> Extends [us-00012](./us-00012-hotspot-workflow.md), which gave a Hotspot its
> lifecycle. Resolving currently only mutes the sticky and drops it from the health
> count: the answer to a `question`, the decision on a `conflict`, the mitigation
> of a `risk` — none of it has anywhere to live. Writing it into the Hotspot's
> `description` would overwrite the uncertainty it recorded, losing the question in
> the act of answering it.

## Requirements (EARS)

- **us-00033-FR-1** (Event) When the Modeler writes a Hotspot's **resolution**,
  the system shall store it alongside — never in place of — the Hotspot's
  description.
- **us-00033-FR-2** (Event) When the Modeler sets a Hotspot's state to
  `resolved`, the system shall record the moment it was resolved, replacing any
  earlier one, and put the resolution within reach without blocking the state
  change.
- **us-00033-FR-3** (Event) When the Modeler sets a resolved Hotspot back to
  `open`, the system shall change nothing but the state: the resolution and the
  moment it was resolved both stand, because it *was* resolved then.
- **us-00033-FR-4** (Ubiquitous) The system shall show a Hotspot's resolution and
  the moment it was resolved wherever they are recorded, whether it is currently
  open or resolved.
- **us-00033-FR-5** (Unwanted) If a Hotspot is resolved with no resolution
  recorded, then the system shall raise it as a model-health finding.
- **us-00033-FR-6** (Ubiquitous) The system shall carry the resolution through
  export and import with the rest of the Model, and shall read a Hotspot with no
  resolution — every Hotspot written before this story — without error.

## Acceptance (GWT)

- **us-00033-AC-1.1** (us-00033-FR-1)
  Given a Hotspot describing a conflict
  When the Modeler writes a resolution for it
  Then the Model holds both the description and the resolution
  And the description is unchanged
- **us-00033-AC-2.1** (us-00033-FR-2)
  Given an open Hotspot
  When the Modeler sets its state to resolved
  Then the Model records when it was resolved
  And the resolution can be written without a further step
- **us-00033-AC-3.1** (us-00033-FR-3)
  Given a resolved Hotspot with a resolution
  When the Modeler sets it back to open
  Then the resolution and the moment it was resolved are both still there
  And only the state has changed
- **us-00033-AC-3.2** (us-00033-FR-2)
  Given a Hotspot that was resolved, set back to open, and resolved again
  When the Model is read
  Then it says it was resolved the second time, not the first
- **us-00033-AC-4.1** (us-00033-FR-4)
  Given a resolved Hotspot with a resolution
  When the Modeler selects it
  Then its resolution and the time it was resolved are shown
  And they are still shown after it is set back to open
- **us-00033-AC-5.1** (us-00033-FR-5)
  Given two resolved Hotspots, one with a resolution and one without
  When model health is analysed
  Then the one without is reported
  And the one with is not
- **us-00033-AC-6.1** (us-00033-FR-6)
  Given a Model whose Hotspot carries a resolution
  When it is exported and imported again
  Then the resolution survives unchanged
- **us-00033-AC-6.2** (us-00033-FR-6)
  Given a Model exported before this story, whose Hotspots have no resolution
  When the Modeler imports it
  Then it loads without error
  And those Hotspots simply have no resolution

## Links
- Spec: spec-00003-hotspot-workflow-opportunity · Plan: plan-00023-hotspot-resolution
