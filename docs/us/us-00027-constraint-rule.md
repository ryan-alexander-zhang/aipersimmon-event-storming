---
id: us-00027-constraint-rule
type: us
role: main
status: active
parent: spec-00011-structured-rule-expression
---

# User Story: constraint rule

As a Modeler,
I want a Constraint to carry its invariant rule,
so that the "must hold" assertion is expressed explicitly, not buried in a prose
description.

## Requirements (EARS)

- **us-00027-FR-1** (Event) When the Modeler sets a Constraint's `rule` (the
  invariant/assertion), the system shall store it and show it distinctly from the
  Constraint's `description`.
- **us-00027-FR-2** (Ubiquitous) The `rule` attribute shall be optional; a
  Constraint with none set shall behave and render as it does today.

## Acceptance (GWT)

- **us-00027-AC-1.1** (us-00027-FR-1)
  Given a Constraint with a description "credit limit check"
  When the Modeler sets its rule to "order.total <= account.creditLimit"
  Then the model stores the rule
  And the Constraint shows the rule separately from the description
- **us-00027-AC-2.1** (us-00027-FR-2)
  Given a Constraint with no rule
  When the model is exported and re-imported
  Then the Constraint loads without error
  And renders as before

## Links

- Spec: spec-00011-structured-rule-expression
