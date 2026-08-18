#!/usr/bin/env python3
"""Validate an Event Storming DSL v4.0 file.

Usage: python3 scripts/validate.py <model.json>

ERROR = the editor rejects it, or the grammar forbids it. Must be fixed.
WARN  = a model smell. Report it to the user; fix only if they agree.
Exit code 1 when there is at least one ERROR.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

# The grammar is data, not code: grammar.json next to this script is the one copy the
# skill keeps, and the editor's test suite checks it against the editor's own tables.
# Duplicating it here in Python is what let the two drift apart (issue-00037).
GRAMMAR_PATH = Path(__file__).resolve().parent / "grammar.json"
try:
    with open(GRAMMAR_PATH, encoding="utf-8") as f:
        GRAMMAR = json.load(f)
except OSError as e:
    sys.exit(f"cannot read the grammar next to this script ({GRAMMAR_PATH}): {e}")
except json.JSONDecodeError as e:
    sys.exit(f"{GRAMMAR_PATH} is not valid JSON: {e}")

DSL_VERSION = GRAMMAR["dslVersion"]
ELEMENTS = GRAMMAR["elements"]


def _types(names):
    """Expand the grammar's "*" (every element type) into a set of type names."""
    return set(ELEMENTS) if "*" in names else set(names)


LEVEL_TYPES = {level: _types(names) for level, names in GRAMMAR["levels"].items()}

# (relation, allowed source types, allowed target types)
RULES = [(r["relation"], _types(r["sources"]), _types(r["targets"]))
         for r in GRAMMAR["relations"]]
RELATIONS = [r[0] for r in RULES]

CTX_RELS = GRAMMAR["contextRelations"]

# property -> the node types allowed to carry it (None = any type)
PROPS = {"description": None, "pivotal": {"domainEvent"}, "state": {"hotspot"},
         "kind": {"hotspot"}, "priority": {"hotspot"}, "resolution": {"hotspot"},
         "resolvedAt": {"hotspot"}, "condition": {"policy"},
         "execution": {"policy"}, "parameters": {"policy"}, "dispatch": {"policy"},
         "rule": {"constraint"}}

ENUMS = {"state": ["open", "resolved"], "kind": ["conflict", "question", "risk"],
         "priority": ["low", "medium", "high"], "execution": ["automatic", "manual"],
         "dispatch": ["parallel", "exclusive"]}

# An aggregate over these is doing too much (matches the editor's health check).
AGG_MAX_COMMANDS = 5
AGG_MAX_EVENTS = 5

errors, warns = [], []


def err(msg):
    errors.append(msg)


def warn(msg):
    warns.append(msg)


def as_list(model, key):
    v = model.get(key, [])
    if not isinstance(v, list):
        err(f"{key}: must be an array")
        return []
    return [x for x in v if isinstance(x, dict)]


def check_contexts(model):
    ids = set()
    for c in as_list(model, "contexts"):
        cid = c.get("id")
        if not cid or not isinstance(cid, str):
            err(f"context {c}: id is required")
            continue
        if cid in ids:
            err(f"context {cid}: duplicate id")
        ids.add(cid)
        if not isinstance(c.get("name"), str):
            err(f"context {cid}: name is required")
        if not isinstance(c.get("order"), (int, float)):
            err(f"context {cid}: order must be a number")
        cls = c.get("classification")
        if cls is not None and cls not in ("core", "supporting", "generic"):
            err(f"context {cid}: classification '{cls}' - use core|supporting|generic")
    return ids


def check_context_relationships(model, ctx_ids):
    seen = set()
    for r in as_list(model, "contextRelationships"):
        rid = r.get("id", "?")
        if rid in seen:
            err(f"contextRelationship {rid}: duplicate id")
        seen.add(rid)
        for side in ("source", "target"):
            if r.get(side) not in ctx_ids:
                err(f"contextRelationship {rid}: {side} '{r.get(side)}' is not a declared context")
        if r.get("type") not in CTX_RELS:
            err(f"contextRelationship {rid}: type '{r.get('type')}' - use one of {', '.join(CTX_RELS)}")
        if r.get("source") == r.get("target"):
            err(f"contextRelationship {rid}: source and target are the same context")


def check_nodes(model, ctx_ids, level):
    nodes = {}
    for n in as_list(model, "nodes"):
        nid = n.get("id")
        if not nid or not isinstance(nid, str):
            err(f"node {n}: id is required")
            continue
        if nid in nodes:
            err(f"node {nid}: duplicate id")
        t = n.get("type")
        if t not in ELEMENTS:
            err(f"node {nid}: type '{t}' - use one of {', '.join(ELEMENTS)}")
            continue
        nodes[nid] = n
        if not n.get("label"):
            err(f"node {nid}: label is required")
        if level in LEVEL_TYPES and t not in LEVEL_TYPES[level]:
            err(f"node {nid}: type '{t}' is not allowed at level '{level}'")
        ctx = n.get("context")
        if ctx is not None and ctx not in ctx_ids:
            err(f"node {nid}: context '{ctx}' is not declared in contexts")
        if "order" in n:
            if t != "domainEvent":
                err(f"node {nid}: order is only allowed on domainEvent")
            elif not isinstance(n["order"], int) or isinstance(n["order"], bool):
                err(f"node {nid}: order must be an integer")
        elif t == "domainEvent":
            warn(f"node {nid}: domainEvent without order - it has no place on the timeline")
        check_properties(nid, t, n.get("properties", {}))
    return nodes


def check_properties(nid, t, props):
    if not isinstance(props, dict):
        err(f"node {nid}: properties must be an object")
        return
    for k, v in props.items():
        if k not in PROPS:
            err(f"node {nid}: unknown property '{k}'")
            continue
        allowed = PROPS[k]
        if allowed is not None and t not in allowed:
            err(f"node {nid}: property '{k}' is only allowed on {'/'.join(sorted(allowed))}, not {t}")
        if k in ENUMS and v not in ENUMS[k]:
            err(f"node {nid}: {k} '{v}' - use {'|'.join(ENUMS[k])}")
        if k == "pivotal" and not isinstance(v, bool):
            err(f"node {nid}: pivotal must be true or false")
        if k == "parameters":
            if not isinstance(v, list):
                err(f"node {nid}: parameters must be an array")
                continue
            for p in v:
                if not isinstance(p, dict) or not isinstance(p.get("name"), str) \
                        or not isinstance(p.get("value"), str):
                    err(f"node {nid}: each parameter must be {{\"name\": \"...\", \"value\": \"...\"}} with string values")


def check_edges(model, nodes):
    ids, pairs = set(), set()
    edges = []
    for e in as_list(model, "edges"):
        eid = e.get("id", "?")
        if eid in ids:
            err(f"edge {eid}: duplicate id")
        ids.add(eid)
        s, t, rel = e.get("source"), e.get("target"), e.get("relation")
        if s not in nodes or t not in nodes:
            missing = s if s not in nodes else t
            err(f"edge {eid}: '{missing}' is not a node id")
            continue
        st, tt = nodes[s]["type"], nodes[t]["type"]
        legal = [r for r, ss, ts in RULES if st in ss and tt in ts]
        if rel not in RELATIONS:
            err(f"edge {eid}: relation '{rel}' does not exist")
        elif not legal:
            err(f"edge {eid}: {st} -> {tt} is not a legal connection")
        elif rel not in legal:
            err(f"edge {eid}: {st} -> {tt} must be '{legal[0]}', not '{rel}'")
        key = (s, t, rel)
        if key in pairs:
            warn(f"edge {eid}: duplicate of an existing {rel} edge")
        pairs.add(key)
        edges.append((s, t, rel))
    return edges


def check_health(nodes, edges, level, ctx_ids):
    out, inc = defaultdict(list), defaultdict(list)
    for s, t, rel in edges:
        out[s].append((t, rel))
        inc[t].append((s, rel))

    used_ctx = {n.get("context") for n in nodes.values()}
    for cid in ctx_ids - used_ctx:
        warn(f"context {cid}: declared but empty")

    events = [n for n in nodes.values() if n["type"] == "domainEvent"]
    if events and not any(n.get("properties", {}).get("pivotal") for n in events):
        warn("no pivotal events - mark the few that change the state of the business")

    for nid, n in nodes.items():
        t = n["type"]
        if t == "domainEvent" and level != "big-picture":
            if not any(r in ("produces", "emits") for _, r in inc[nid]):
                warn(f"orphan event '{n['label']}': nothing produces or emits it")
        if t == "command":
            if not reaches_event(nid, out, nodes):
                warn(f"dangling command '{n['label']}': it produces no domain event")
            if not any(r in ("issues", "invokes") for _, r in inc[nid]):
                warn(f"command '{n['label']}': nothing issues it and no policy invokes it")
        if t == "aggregate":
            c = sum(1 for _, r in inc[nid] if r == "handledBy")
            ev = sum(1 for _, r in out[nid] if r == "emits")
            if c > AGG_MAX_COMMANDS or ev > AGG_MAX_EVENTS:
                warn(f"overloaded aggregate '{n['label']}': {c} command(s), {ev} event(s) - split it?")
        if t == "policy":
            if not any(r == "triggers" for _, r in inc[nid]):
                warn(f"policy '{n['label']}': no domain event triggers it")
            if not any(r == "invokes" for _, r in out[nid]):
                warn(f"policy '{n['label']}': it invokes no command")
            invoked = sum(1 for _, r in out[nid] if r == "invokes")
            if invoked > 1 and not n.get("properties", {}).get("dispatch"):
                warn(f"policy '{n['label']}': invokes {invoked} commands with no dispatch "
                     "- alternatives (exclusive) or all of them (parallel)?")
            if "execution" not in n.get("properties", {}):
                warn(f"policy '{n['label']}': no execution - automatic or manual?")

    open_hs = [n for n in nodes.values()
               if n["type"] == "hotspot" and n.get("properties", {}).get("state") != "resolved"]
    if open_hs:
        warn(f"{len(open_hs)} open hotspot(s): " + "; ".join(n["label"] for n in open_hs))

    # A hotspot ticked off with nothing written down loses why it was closed.
    closed_blank = [n for n in nodes.values()
                    if n["type"] == "hotspot"
                    and n.get("properties", {}).get("state") == "resolved"
                    and not (n.get("properties", {}).get("resolution") or "").strip()]
    if closed_blank:
        warn(f"{len(closed_blank)} resolved hotspot(s) with no resolution: "
             + "; ".join(n["label"] for n in closed_blank))

    for cyc in policy_cycles(nodes, edges):
        warn("reaction cycle: " + " -> ".join(nodes[i]["label"] for i in cyc))


def reaches_event(start, out, nodes):
    fwd = ("produces", "handledBy", "emits")
    seen, queue = {start}, [start]
    while queue:
        cur = queue.pop()
        for t, r in out[cur]:
            if r not in fwd:
                continue
            if nodes[t]["type"] == "domainEvent":
                return True
            if t not in seen:
                seen.add(t)
                queue.append(t)
    return False


def policy_cycles(nodes, edges):
    rels = ("produces", "emits", "handledBy", "triggers", "invokes")
    adj = defaultdict(list)
    for s, t, r in edges:
        if r in rels:
            adj[s].append(t)
    color, stack, found, seen_keys = {}, [], [], set()

    def visit(u):
        color[u] = 1
        stack.append(u)
        for v in adj[u]:
            if color.get(v) is None:
                visit(v)
            elif color[v] == 1 and v in stack:
                cyc = stack[stack.index(v):]
                key = ",".join(sorted(cyc))
                if key not in seen_keys and any(nodes[i]["type"] == "policy" for i in cyc):
                    seen_keys.add(key)
                    found.append(cyc)
        stack.pop()
        color[u] = 2

    sys.setrecursionlimit(10000)
    for nid in nodes:
        if color.get(nid) is None:
            visit(nid)
    return found


def main():
    if len(sys.argv) != 2:
        print("usage: python3 validate.py <model.json>")
        return 2
    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as f:
            model = json.load(f)
    except FileNotFoundError:
        print(f"ERROR file not found: {path}")
        return 1
    except json.JSONDecodeError as e:
        print(f"ERROR not valid JSON: line {e.lineno} column {e.colno}: {e.msg}")
        return 1
    if not isinstance(model, dict):
        print("ERROR the model must be a JSON object")
        return 1

    if model.get("version") != DSL_VERSION:
        err(f"version must be the string \"{DSL_VERSION}\", found {model.get('version')!r}")
    meta = model.get("meta")
    if not isinstance(meta, dict):
        err("meta is required: { name, level, createdAt }")
        meta = {}
    if not meta.get("name"):
        err("meta.name is required")
    if not isinstance(meta.get("createdAt"), str):
        err("meta.createdAt is required (ISO 8601 string)")
    level = meta.get("level", "design")
    if level not in LEVEL_TYPES:
        err(f"meta.level '{level}' - use big-picture|process|design")

    ctx_ids = check_contexts(model)
    check_context_relationships(model, ctx_ids)
    nodes = check_nodes(model, ctx_ids, level)
    edges = check_edges(model, nodes)
    check_health(nodes, edges, level, ctx_ids)

    for m in errors:
        print(f"ERROR {m}")
    for m in warns:
        print(f"WARN  {m}")
    print(f"\n{path}: {len(nodes)} nodes, {len(edges)} edges, {len(ctx_ids)} contexts, "
          f"level {level} - {len(errors)} error(s), {len(warns)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
