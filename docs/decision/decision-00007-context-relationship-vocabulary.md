---
id: decision-00007-context-relationship-vocabulary
type: decision
role: main
status: active
parent: spec-00004-strategic-subdomains-context-map
---

# Context Map relationship vocabulary: the full canonical 8-pattern set

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

The Context Map supports the **full canonical 8-pattern set**, each a directed
relationship (source = upstream, target = downstream):

| Type | Meaning (plain) |
| --- | --- |
| **Partnership** | Two contexts succeed or fail together; tightly coordinated. *(symmetric)* |
| **Shared Kernel** | Two contexts share a small common model/code they co-own. *(symmetric)* |
| **Customer/Supplier** | Downstream can negotiate needs with a cooperative upstream. |
| **Conformist** | Downstream simply conforms to the upstream model (no leverage). |
| **Anticorruption Layer (ACL)** | Downstream isolates itself with a translation layer. |
| **Open Host Service (OHS)** | Upstream publishes a stable open interface for many downstreams. |
| **Published Language (PL)** | Integration speaks a well-documented shared language/schema (pairs with OHS). |
| **Separate Ways** | The two contexts deliberately do not integrate. *(symmetric)* |

Direction is modelled by the edge itself, not a separate type; symmetric patterns
(Partnership, Shared Kernel, Separate Ways) ignore the arrow's meaning.

> **Revision (2026-07-22):** originally a focused 5-pattern subset (Partnership,
> Shared Kernel, Customer/Supplier, Conformist, ACL). Expanded to all 8 at the
> modeller's request — OHS/PL cover the *upstream-provider* perspective the 5 (all
> downstream/symmetric) lacked, and are common in platform/microservice contexts;
> Separate Ways completes the set. The enum is a plain string, so the addition is a
> non-breaking DSL change.

## Consequences

- Only **Big Ball of Mud** remains out of scope (an anti-pattern label, rarely
  drawn as a typed relationship); addable later without a DSL break.
- The set lives in `web/lib/eventstorming/context-relations.ts` with a
  `CONTEXT_RELATION_STYLE` map (label + colour), parallel to element-level
  `RELATION_STYLE`.
- CONTEXT.md gains **Subdomain**, **Context Relationship**, **Context Map** terms at
  implementation time (plan-00014).
