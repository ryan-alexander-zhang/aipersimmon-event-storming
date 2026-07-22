---
id: decision-00007-context-relationship-vocabulary
type: decision
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# Context Map relationship vocabulary: a focused 5-pattern subset

> Fixes the relationship type set for [spec-00004](../spec/spec-00004-strategic-subdomains-context-map.md)
> FR5. Terms are canonical DDD context-mapping patterns.

## Context

FR5 renders a Context Map with typed relationships between Bounded Contexts. DDD
context mapping (Eric Evans, *Domain-Driven Design*, 2003; codified by the
[ddd-crew context-mapping cheat sheet](https://github.com/ddd-crew/context-mapping))
defines a well-known set of relationship patterns: **Partnership, Shared Kernel,
Customer/Supplier, Conformist, Anticorruption Layer (ACL), Open Host Service (OHS),
Published Language, Separate Ways** (plus Big Ball of Mud). Every relationship also
carries an **upstream → downstream** direction.

## Decision

v1 supports a **focused 5-pattern subset**, each a directed relationship
(source = upstream, target = downstream):

| Type | Meaning (plain) |
| --- | --- |
| **Partnership** | Two contexts succeed or fail together; tightly coordinated. |
| **Shared Kernel** | Two contexts share a small common model/code they co-own. |
| **Customer/Supplier** | Downstream can negotiate needs with a cooperative upstream. |
| **Conformist** | Downstream simply conforms to the upstream model (no leverage). |
| **Anticorruption Layer (ACL)** | Downstream isolates itself with a translation layer. |

These are the PRD-named patterns (ACL, Conformist, Shared Kernel) plus the two most
common (Customer/Supplier, Partnership). The direction is modelled by the edge
itself, not a separate type; symmetric patterns (Partnership, Shared Kernel) ignore
the arrow's meaning.

## Consequences

- **Excluded from v1** (recorded, not gaps): Open Host Service, Published Language,
  Separate Ways, Big Ball of Mud. They can be added to the enum later without a DSL
  break (the type is a string enum on the relationship record).
- The set lives in `web/lib/eventstorming/context-relations.ts` with a
  `CONTEXT_RELATION_STYLE` map (label + colour), parallel to element-level
  `RELATION_STYLE`.
- CONTEXT.md gains **Subdomain**, **Context Relationship**, **Context Map** terms at
  implementation time (plan-00014).
