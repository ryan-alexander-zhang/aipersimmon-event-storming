// Model-health analysis (spec-00007): derive advisory findings ("model smells")
// from the structured model. Pure — a function of nodes + edges only, no store,
// layout, or React Flow dependency. Findings are advisory and never block editing.

import type { Context, ContextRelationship } from "@/lib/dsl/schema";
import { CONTEXT_RELATION_STYLE } from "@/lib/eventstorming/context-relations";
import type { ElementType } from "@/lib/eventstorming/elements";
import { type Level, LEVEL_TYPES, LEVELS } from "@/lib/eventstorming/levels";
import type { RelationType } from "@/lib/eventstorming/relations";
import type { ESEdge, ESNode } from "@/lib/store/types";

export type Severity = "warning" | "info";

export type SmellType =
  | "orphan-event"
  | "dangling-command"
  | "overloaded-aggregate"
  | "policy-cycle"
  | "unresolved-hotspots"
  | "unrecorded-resolution"
  | "lone-alternative"
  | "duplicate-subdomain"
  | "missing-subdomain"
  | "unbacked-seam"
  | "technical-event"
  | "missing-purpose"
  | "unguarded-aggregate"
  | "missing-execution"
  | "type-above-level"
  | "reversed-dependency"
  | "mutual-dependency"
  | "contradicted-separate-ways";

export interface Finding {
  id: string;
  type: SmellType;
  severity: Severity;
  message: string;
  elementIds: string[];
}

// Thresholds for `overloaded-aggregate` (an Aggregate doing too much).
export const AGG_MAX_COMMANDS = 5;
export const AGG_MAX_EVENTS = 5;

// Last words that mark an event as CRUD or UI plumbing rather than a business fact
// (decision-00018 E2, E5). `Loaded`, `Removed` and the like are left out: they are
// real business verbs in some domains (`Cargo Loaded`).
export const TECHNICAL_VERBS = [
  "Created",
  "Updated",
  "Modified",
  "Edited",
  "Saved",
  "Deleted",
  "Clicked",
  "Viewed",
  "Fetched",
  "Persisted",
];

// Forward causal relations a Command follows to reach the Domain Event it causes.
const CAUSAL_FWD: RelationType[] = ["produces", "handledBy", "emits"];
// Relations that form the directed flow a reaction cycle can run around.
const CYCLE_RELS: RelationType[] = ["produces", "emits", "handledBy", "triggers", "invokes"];

const SEVERITY_RANK: Record<Severity, number> = { warning: 0, info: 1 };

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** Analyse the model and return advisory findings, ordered warning→info then by
 *  type and id so the output is deterministic. */
export function analyzeModel(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[] = [],
  level?: Level,
  contextRelationships: ContextRelationship[] = [],
): Finding[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const label = (id: string): string => byId.get(id)?.data.label ?? id;
  const typeOf = (id: string): ElementType | undefined => byId.get(id)?.type;

  const incoming = new Map<string, ESEdge[]>();
  const outgoing = new Map<string, ESEdge[]>();
  for (const e of edges) {
    push(outgoing, e.source, e);
    push(incoming, e.target, e);
  }

  const findings: Finding[] = [];

  // Every level-dependent check judges an element by its own context's level,
  // capped by the model's (decision-00019). Without a model level (a bare call)
  // only a context's declared level applies.
  const ctxById = new Map(contexts.map((c) => [c.id, c]));
  const ctxLevel = (cid?: string): Level | undefined => {
    const own = cid === undefined ? undefined : ctxById.get(cid)?.level;
    if (!own) return level;
    if (!level) return own;
    return LEVELS.indexOf(own) < LEVELS.indexOf(level) ? own : level;
  };
  const levelOf = (n: ESNode): Level | undefined => ctxLevel(n.data.context);

  // orphan-event: a Domain Event nothing produces or emits. A temporal event is
  // raised by time passing and needs no producer (decision-00014). At Big Picture
  // nothing produces events yet, so none is an orphan there.
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
    if (n.data.temporal || levelOf(n) === "big-picture") continue;
    const produced = (incoming.get(n.id) ?? []).some(
      (e) => e.data?.relation === "produces" || e.data?.relation === "emits",
    );
    if (!produced) {
      findings.push({
        id: `orphan-event:${n.id}`,
        type: "orphan-event",
        severity: "warning",
        message: `Domain Event '${n.data.label}' has no producing Command or Aggregate`,
        elementIds: [n.id],
      });
    }
  }

  // dangling-command: a Command with no forward path to any Domain Event.
  const reachesEvent = (startId: string): boolean => {
    const seen = new Set<string>([startId]);
    const queue = [startId];
    while (queue.length) {
      const cur = queue.shift() as string;
      for (const e of outgoing.get(cur) ?? []) {
        const r = e.data?.relation;
        if (!r || !CAUSAL_FWD.includes(r)) continue;
        if (typeOf(e.target) === "domainEvent") return true;
        if (!seen.has(e.target)) {
          seen.add(e.target);
          queue.push(e.target);
        }
      }
    }
    return false;
  };
  for (const n of nodes) {
    if (n.type !== "command") continue;
    if (!reachesEvent(n.id)) {
      findings.push({
        id: `dangling-command:${n.id}`,
        type: "dangling-command",
        severity: "warning",
        message: `Command '${n.data.label}' produces no Domain Event`,
        elementIds: [n.id],
      });
    }
  }

  // overloaded-aggregate: an Aggregate handling or emitting too much.
  for (const n of nodes) {
    if (n.type !== "aggregate") continue;
    const handled = (incoming.get(n.id) ?? []).filter((e) => e.data?.relation === "handledBy").length;
    const emitted = (outgoing.get(n.id) ?? []).filter((e) => e.data?.relation === "emits").length;
    if (handled > AGG_MAX_COMMANDS || emitted > AGG_MAX_EVENTS) {
      findings.push({
        id: `overloaded-aggregate:${n.id}`,
        type: "overloaded-aggregate",
        severity: "info",
        message: `Aggregate '${n.data.label}' handles ${handled} command(s) and emits ${emitted} event(s) - which rule do they all share? If none, it is two aggregates`,
        elementIds: [n.id],
      });
    }
  }

  // policy-cycle: a directed cycle in the causal flow that involves a Policy.
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const r = e.data?.relation;
    if (r && CYCLE_RELS.includes(r)) push(adj, e.source, e.target);
  }
  const color = new Map<string, 1 | 2>(); // 1 = on stack (gray), 2 = done (black)
  const stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (u: string): void => {
    color.set(u, 1);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      const c = color.get(v);
      if (!c) visit(v);
      else if (c === 1) {
        const i = stack.indexOf(v);
        if (i >= 0) cycles.push(stack.slice(i));
      }
    }
    stack.pop();
    color.set(u, 2);
  };
  for (const n of nodes) {
    if (!color.get(n.id)) visit(n.id);
  }
  const seenCycle = new Set<string>();
  for (const cyc of cycles) {
    if (!cyc.some((id) => typeOf(id) === "policy")) continue;
    const key = [...cyc].sort().join(",");
    if (seenCycle.has(key)) continue;
    seenCycle.add(key);
    findings.push({
      id: `policy-cycle:${key}`,
      type: "policy-cycle",
      severity: "warning",
      message: `Reaction cycle: ${cyc.map(label).join(" -> ")}`,
      elementIds: [...cyc],
    });
  }

  // lone-alternative: nothing happens instead of itself, so a one-member set is either
  // an unfinished thought or a typo in the key (us-00035-FR-7).
  const sets = new Map<string, string[]>();
  for (const n of nodes) if (n.data.alternativeSet) push(sets, n.data.alternativeSet, n.id);
  const lone = [...sets].filter(([, ids]) => ids.length < 2);
  if (lone.length > 0) {
    findings.push({
      id: "lone-alternative",
      type: "lone-alternative",
      severity: "info",
      message: `alternative set(s) with one member: ${lone.map(([set]) => set).join(", ")}`,
      elementIds: lone.flatMap(([, ids]) => ids),
    });
  }

  // unresolved-hotspots: a single summary of open Hotspots (absent state = open).
  const hotspots = nodes.filter((n) => n.type === "hotspot" && n.data.state !== "resolved");
  if (hotspots.length > 0) {
    findings.push({
      id: "unresolved-hotspots",
      type: "unresolved-hotspots",
      severity: "info",
      message: `${hotspots.length} unresolved hotspot(s)`,
      elementIds: hotspots.map((h) => h.id),
    });
  }

  // unrecorded-resolution: a Hotspot ticked off with nothing written down — the
  // "we agreed in the room" case, which is the one that loses the reasoning
  // (us-00033-FR-5). A warning, not info: the trace is already gone by the time
  // anyone reads this.
  const undocumented = nodes.filter(
    (n) => n.type === "hotspot" && n.data.state === "resolved" && !n.data.resolution?.trim(),
  );
  if (undocumented.length > 0) {
    findings.push({
      id: "unrecorded-resolution",
      type: "unrecorded-resolution",
      severity: "warning",
      message: `${undocumented.length} resolved hotspot(s) with no resolution recorded`,
      elementIds: undocumented.map((h) => h.id),
    });
  }

  // technical-event: a label naming a CRUD or UI step, not what happened (E2, E5).
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
    const last = n.data.label.trim().split(/\s+/).pop() ?? "";
    if (!TECHNICAL_VERBS.includes(last)) continue;
    findings.push({
      id: `technical-event:${n.id}`,
      type: "technical-event",
      severity: "warning",
      message: `Domain Event '${n.data.label}' names a technical step - what happened in business terms?`,
      elementIds: [n.id],
    });
  }

  // type-above-level: a node its context's declared level does not allow - a
  // Command in a context still at Big Picture. A type above the model's level is
  // the view's business: it is hidden, not reported.
  for (const n of nodes) {
    const declared = n.data.context ? ctxById.get(n.data.context)?.level : undefined;
    if (!declared || LEVEL_TYPES[declared].includes(n.type)) continue;
    findings.push({
      id: `type-above-level:${n.id}`,
      type: "type-above-level",
      severity: "warning",
      message: `'${n.data.label}' is a ${n.type}, but its context is at ${declared}`,
      elementIds: [n.id],
    });
  }

  // missing-execution: at design "automatic or manual" is required data (decision-00019).
  for (const n of nodes) {
    if (n.type !== "policy" || n.data.execution || levelOf(n) !== "design") continue;
    findings.push({
      id: `missing-execution:${n.id}`,
      type: "missing-execution",
      severity: "warning",
      message: `Policy '${n.data.label}' has no execution - automatic or manual?`,
      elementIds: [n.id],
    });
  }

  {
    // unguarded-aggregate: its boundary is the invariants it protects - the
    // Constraints on the Commands it handles (G2). None means no boundary.
    const guarded = new Set(
      edges.filter((e) => e.data?.relation === "constrainedBy").map((e) => e.source),
    );
    for (const n of nodes) {
      if (n.type !== "aggregate" || levelOf(n) !== "design") continue;
      const commands = (incoming.get(n.id) ?? []).filter((e) => e.data?.relation === "handledBy");
      if (commands.some((e) => guarded.has(e.source))) continue;
      findings.push({
        id: `unguarded-aggregate:${n.id}`,
        type: "unguarded-aggregate",
        severity: "warning",
        message: `Aggregate '${n.data.label}' protects no invariant - which rule can refuse its commands?`,
        elementIds: [n.id],
      });
    }

    // missing-purpose: every context says why it exists (decision-00018).
    for (const c of contexts) {
      if (c.purpose?.trim() || ctxLevel(c.id) !== "design") continue;
      findings.push({
        id: `missing-purpose:${c.id}`,
        type: "missing-purpose",
        severity: "warning",
        message: `Bounded Context '${c.name}' has no purpose - which business problem does it solve?`,
        elementIds: [],
      });
    }
  }

  findings.push(...subdomainFindings(contexts, ctxLevel));
  findings.push(...seamFindings(nodes, edges, contexts, contextRelationships));

  findings.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.type.localeCompare(b.type) ||
      a.id.localeCompare(b.id),
  );
  return findings;
}

// One context, one Subdomain, never shared (decision-00016). A shared name is wrong
// at any level; a missing subdomain or type only once the boundaries are designed.
function subdomainFindings(contexts: Context[], levelOf: (cid: string) => Level | undefined): Finding[] {
  const out: Finding[] = [];
  const byName = new Map<string, Context[]>();
  for (const c of contexts) {
    if (c.subdomain) push(byName, c.subdomain.name.trim().toLowerCase(), c);
    else if (levelOf(c.id) === "design") {
      out.push({
        id: `missing-subdomain:${c.id}`,
        type: "missing-subdomain",
        severity: "warning",
        message: `Bounded Context '${c.name}' realises no Subdomain`,
        elementIds: [],
      });
    }
    if (c.subdomain && !c.subdomain.type && levelOf(c.id) === "design") {
      out.push({
        id: `missing-subdomain:${c.id}`,
        type: "missing-subdomain",
        severity: "warning",
        message: `Subdomain '${c.subdomain.name}' of '${c.name}' has no type - core, supporting or generic?`,
        elementIds: [],
      });
    }
  }
  for (const [, shared] of byName) {
    if (shared.length < 2) continue;
    out.push({
      id: `duplicate-subdomain:${shared[0].subdomain!.name}`,
      type: "duplicate-subdomain",
      severity: "warning",
      message: `Subdomain '${shared[0].subdomain!.name}' is realised by ${shared.map((c) => `'${c.name}'`).join(", ")} - one context each`,
      elementIds: [],
    });
  }
  return out;
}

// Every edge crossing two contexts is a seam, and every seam is backed by a Context
// Relationship between the pair, in either direction (decision-00017) - the Context
// Map gate's rule, checked. An Actor's edge is not one: a person using two contexts
// is not the contexts integrating. Nor is commentary: a Hotspot or Opportunity
// pointing across marks an element, it does not integrate anything (issue-00040).
// One finding per pair, pointing at its elements.
const COMMENTARY: RelationType[] = ["annotates", "highlights"];

// How a seam integrates, and which side depends on which (decision-00019). An event
// flowing across makes the reacting side downstream; a command or a synchronous
// read across makes the calling side downstream.
const EVENT_RELATIONS: RelationType[] = ["triggers", "updates", "emits"];
export type IntegrationStyle = "events" | "api";
export function seamStyle(relation: RelationType): { style: IntegrationStyle; upstream: "source" | "target" } {
  return EVENT_RELATIONS.includes(relation)
    ? { style: "events", upstream: "source" }
    : { style: "api", upstream: "target" };
}

function seamFindings(
  nodes: ESNode[],
  edges: ESEdge[],
  contexts: Context[],
  relationships: ContextRelationship[],
): Finding[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ctxOf = new Map(nodes.filter((n) => n.type !== "actor").map((n) => [n.id, n.data.context]));
  const nameOf = (id: string) => contexts.find((c) => c.id === id)?.name ?? id;
  const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const relsOf = new Map<string, ContextRelationship[]>();
  for (const r of relationships) push(relsOf, pair(r.source, r.target), r);
  const unbacked = new Map<string, Set<string>>();
  const reversed = new Map<string, { ids: Set<string>; first: string }>();
  // per pair, the contexts its seams make upstream, and every element on a seam
  const uppers = new Map<string, Set<string>>();
  const seamIds = new Map<string, Set<string>>();
  for (const e of edges) {
    const relation = e.data?.relation;
    if (!relation || COMMENTARY.includes(relation)) continue;
    const s = ctxOf.get(e.source);
    const t = ctxOf.get(e.target);
    if (!s || !t || s === t) continue;
    const key = pair(s, t);
    const rels = relsOf.get(key);
    if (!rels) {
      const ids = unbacked.get(key) ?? new Set<string>();
      unbacked.set(key, ids.add(e.source).add(e.target));
      continue;
    }
    // A pair passes when any relationship is symmetric or points the derived way.
    const up = seamStyle(relation).upstream === "source" ? s : t;
    uppers.set(key, (uppers.get(key) ?? new Set<string>()).add(up));
    seamIds.set(key, (seamIds.get(key) ?? new Set<string>()).add(e.source).add(e.target));
    if (rels.some((r) => CONTEXT_RELATION_STYLE[r.type].symmetric || r.source === up)) continue;
    const down = up === s ? t : s;
    const hit = reversed.get(key) ?? {
      ids: new Set<string>(),
      first: `'${nameOf(down)}' depends on '${nameOf(up)}' (${relation} '${byId.get(e.source)?.data.label}' -> '${byId.get(e.target)?.data.label}'), but the Context Relationship makes '${nameOf(down)}' upstream`,
    };
    hit.ids.add(e.source).add(e.target);
    reversed.set(key, hit);
  }
  // A pair depending both ways is a cycle: declared openly as a Partnership or a
  // Shared Kernel, or a sign the direction or the boundary is wrong. It replaces
  // reversed-dependency, whose fix (flip the arrow) would not resolve it.
  const accepted = (key: string) =>
    (relsOf.get(key) ?? []).some((r) => r.type === "partnership" || r.type === "sharedKernel");
  // Separate Ways says the pair does not integrate: a seam or any other relationship
  // on it says it does (decision-00020). That contradiction is the finding; the
  // direction findings on the same pair would only restate it.
  const contradicted = [...relsOf]
    .filter(([key, rels]) => rels.some((r) => r.type === "separateWays") && (seamIds.has(key) || rels.length > 1))
    .map(([key, rels]) => ({ key, others: rels.filter((r) => r.type !== "separateWays").map((r) => r.type) }));
  const settled = new Set(contradicted.map((c) => c.key));
  const mutual = [...uppers]
    .filter(([key, ups]) => ups.size === 2 && !accepted(key) && !settled.has(key))
    .map(([key]) => key);
  for (const key of mutual) reversed.delete(key);
  return [
    ...contradicted.map(({ key, others }) => {
      const [a, b] = key.split("|").map(nameOf);
      const why = [seamIds.has(key) && "an edge joins them", others.length > 0 && `they are also ${others.join(", ")}`]
        .filter(Boolean)
        .join(", and ");
      return {
        id: `contradicted-separate-ways:${key}`,
        type: "contradicted-separate-ways" as const,
        severity: "warning" as const,
        message: `'${a}' and '${b}' go Separate Ways, but ${why}`,
        elementIds: [...(seamIds.get(key) ?? [])],
      };
    }),
    ...mutual.map((key) => {
      const [a, b] = key.split("|").map(nameOf);
      return {
        id: `mutual-dependency:${key}`,
        type: "mutual-dependency" as const,
        severity: "warning" as const,
        message: `'${a}' and '${b}' depend on each other - straighten one direction, declare a Partnership, or merge them`,
        elementIds: [...(seamIds.get(key) ?? [])],
      };
    }),
    ...[...unbacked].map(([key, ids]) => {
      const [a, b] = key.split("|").map(nameOf);
      return {
        id: `unbacked-seam:${key}`,
        type: "unbacked-seam" as const,
        severity: "warning" as const,
        message: `'${a}' and '${b}' are joined by an edge but have no Context Relationship`,
        elementIds: [...ids],
      };
    }),
    ...[...reversed].map(([key, { ids, first }]) => ({
      id: `reversed-dependency:${key}`,
      type: "reversed-dependency" as const,
      severity: "warning" as const,
      message: first,
      elementIds: [...ids],
    })),
  ];
}
