// Model-health analysis (spec-00007): derive advisory findings ("model smells")
// from the structured model. Pure — a function of nodes + edges only, no store,
// layout, or React Flow dependency. Findings are advisory and never block editing.

import type { ElementType } from "@/lib/eventstorming/elements";
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
  | "undeclared-branch";

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
export function analyzeModel(nodes: ESNode[], edges: ESEdge[]): Finding[] {
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

  // orphan-event: a Domain Event nothing produces or emits.
  for (const n of nodes) {
    if (n.type !== "domainEvent") continue;
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
        message: `Aggregate '${n.data.label}' handles ${handled} command(s) and emits ${emitted} event(s)`,
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

  // undeclared-branch: a Policy invoking several Commands says nothing about whether
  // they all happen or only one does. Every relation in this DSL reads as "and", so the
  // model currently claims "all of them" — advisory, because that is often what is
  // meant; `dispatch` is how the Modeler settles it either way (us-00034-FR-4).
  const undeclared = nodes.filter(
    (n) =>
      n.type === "policy" &&
      !n.data.dispatch &&
      (outgoing.get(n.id) ?? []).filter((e) => e.data?.relation === "invokes").length > 1,
  );
  if (undeclared.length > 0) {
    findings.push({
      id: "undeclared-branch",
      type: "undeclared-branch",
      severity: "info",
      message: `${undeclared.length} policy(s) invoking several commands with no dispatch — alternatives or all of them?`,
      elementIds: undeclared.map((p) => p.id),
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

  findings.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.type.localeCompare(b.type) ||
      a.id.localeCompare(b.id),
  );
  return findings;
}
