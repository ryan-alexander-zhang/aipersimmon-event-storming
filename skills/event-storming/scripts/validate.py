#!/usr/bin/env python3
"""Validate an Event Storming DSL file (the version grammar.json names).

Usage: python3 scripts/validate.py <model.json | domain.json>

A split model (decision-00017) is validated through its domain file: the files its
contexts link are read relative to it and merged, then the whole model is checked.

ERROR = the editor rejects it, or the grammar forbids it. Must be fixed.
WARN  = a model smell. Report it to the user; fix only if they agree.
Exit code 1 when there is at least one ERROR.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path, PurePosixPath

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
# Last words that name a CRUD or UI step, not a business fact (decision-00018 E2, E5).
TECHNICAL_VERBS = set(GRAMMAR["technicalVerbs"])

# property -> the node types allowed to carry it (None = any type)
PROPS = {"description": None, "pivotal": {"domainEvent"},
         # raised by time passing - a deadline reached, a schedule fired; exempt from
         # the producer checks (decision-00014)
         "temporal": {"domainEvent"}, "state": {"hotspot"},
         "kind": {"hotspot"}, "priority": {"hotspot"}, "resolution": {"hotspot"},
         "resolvedAt": {"hotspot"}, "condition": {"policy"},
         "execution": {"policy"}, "parameters": {"policy"}, "rule": {"constraint"},
         # members of one alternative set happen instead of each other; only the two
         # element types that represent something happening can belong to one
         "alternativeSet": {"domainEvent", "command"}}

ENUMS = {"state": ["open", "resolved"], "kind": ["conflict", "question", "risk"],
         "priority": ["low", "medium", "high"], "execution": ["automatic", "manual"]}

# An aggregate over these is doing too much (matches the editor's health check).
AGG_MAX_COMMANDS = 5
AGG_MAX_EVENTS = 5

LEVEL_ORDER = ["big-picture", "process", "design"]
# context id -> its own level, capped by the model's (decision-00019); filled by main
CTX_LEVEL = {}
MODEL_LEVEL = ["design"]


def level_of(ctx):
    """The level an element is judged at: its context's, capped by the model's.
    An Ungrouped element (or an undeclared context) is at the model's level."""
    return CTX_LEVEL.get(ctx, MODEL_LEVEL[0])


errors, warns, infos = [], [], []
# In a split model, the file each node / edge id was read from, so an error about
# one names where to fix it (decision-00017).
ORIGIN = {}


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
    subdomains = defaultdict(list)  # lowercased subdomain name -> context ids (decision-00016)
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
        if "classification" in c:
            err(f"context {cid}: classification is gone - write subdomain: {{\"name\": ..., \"type\": ...}}")
        sd = c.get("subdomain")
        if sd is None:
            if level_of(cid) == "design":
                err(f"context {cid}: no subdomain - at design every context realises one "
                    "(subdomain: {\"name\": ..., \"type\": core|supporting|generic})")
        elif not isinstance(sd, dict) or not isinstance(sd.get("name"), str) or not sd["name"].strip():
            err(f"context {cid}: subdomain must be an object with a non-empty name")
        else:
            unknown = set(sd) - {"name", "type"}
            if unknown:
                err(f"context {cid}: subdomain has unknown key(s) {', '.join(sorted(unknown))}")
            t = sd.get("type")
            if t is not None and t not in ("core", "supporting", "generic"):
                err(f"context {cid}: subdomain type '{t}' - use core|supporting|generic")
            elif t is None and level_of(cid) == "design":
                err(f"context {cid}: subdomain '{sd['name']}' has no type - core|supporting|generic")
            subdomains[sd["name"].strip().lower()].append(cid)
        if "file" in c and not isinstance(c["file"], str):
            err(f"context {cid}: file must be a path")
        # why the context exists and the terms that mean something specific in it
        # (decision-00018)
        purpose = c.get("purpose")
        if purpose is None:
            if level_of(cid) == "design":
                err(f"context {cid}: no purpose - at design every context says which "
                    "business problem it solves (purpose: \"...\")")
        elif not isinstance(purpose, str) or not purpose.strip():
            err(f"context {cid}: purpose must be a non-empty string")
        check_language(cid, c.get("language"))
        lv = c.get("level")
        if lv is not None and lv not in LEVEL_ORDER:
            err(f"context {cid}: level '{lv}' - use big-picture|process|design")
        bbm = c.get("bigBallOfMud")
        if bbm is not None and not isinstance(bbm, bool):
            err(f"context {cid}: bigBallOfMud must be true or false")
    for owners in subdomains.values():
        if len(owners) > 1:
            err(f"contexts {', '.join(owners)} realise the same subdomain - one context each")
    return ids


def check_language(cid, language):
    if language is None:
        return
    if not isinstance(language, list):
        err(f"context {cid}: language must be a list of {{\"term\", \"meaning\"}}")
        return
    seen, avoided = set(), []
    for t in language:
        if not isinstance(t, dict) or not {"term", "meaning"} <= set(t) <= {"term", "meaning", "avoid"} \
                or not all(isinstance(t[k], str) and t[k].strip() for k in ("term", "meaning")):
            err(f"context {cid}: language entry {t} must be {{\"term\": ..., \"meaning\": ...}}, both non-empty, "
                "plus an optional \"avoid\"")
            continue
        key = t["term"].strip().lower()
        if key in seen:
            err(f"context {cid}: term '{t['term']}' appears twice in its language")
        seen.add(key)
        avoid = t.get("avoid")
        if avoid is None:
            continue
        if not isinstance(avoid, list) or not all(isinstance(w, str) and w.strip() for w in avoid):
            err(f"context {cid}: term '{t['term']}': avoid must be a list of non-empty words")
            continue
        words = [w.strip().lower() for w in avoid]
        if len(set(words)) != len(words):
            err(f"context {cid}: term '{t['term']}' avoids a word twice")
        avoided += [(t["term"], w) for w in avoid]
    # a context cannot both use a word and avoid it (decision-00019)
    for term, word in avoided:
        if word.strip().lower() in seen:
            err(f"context {cid}: term '{term}' avoids '{word}', which is a term of the same context")

DOMAIN_FILE = "domain.json"


def link_problem(file):
    """Why a context's `file` cannot be followed, or None (mirrors the editor)."""
    if file.startswith("/") or "\\" in file or (len(file) > 1 and file[1] == ":" and file[0].isalpha()):
        return "must be a relative path"
    if any(seg in ("..", ".", "") for seg in file.split("/")):
        return "must stay inside the model's folder"
    if not file.endswith(".json"):
        return "must be a .json file"
    if file == DOMAIN_FILE:
        return "cannot be the domain file"
    return None


def merge_split(model, base):
    """Read the files a domain file's contexts link and merge them into one model.
    Returns the merged model, or None after reporting why it cannot be merged."""
    links = {}
    owners = {}
    for c in model.get("contexts", []) if isinstance(model.get("contexts"), list) else []:
        if not isinstance(c, dict) or "file" not in c:
            continue
        cid, f = str(c.get("id")), c["file"]
        if not isinstance(f, str):
            err(f"context {cid}: file must be a path")
            return None
        problem = link_problem(f)
        if problem:
            err(f'context {cid}: file "{f}" {problem}')
            return None
        if f in owners:
            err(f'contexts {owners[f]} and {cid} both link "{f}" - one file each')
            return None
        owners[f] = cid
        links[cid] = f
    if not links:
        return model

    seen, home = {}, {}

    def claim(i, place):
        first = seen.get(str(i))
        if first:
            err(f"id {i} is used in both {first} and {place}")
            return False
        seen[str(i)] = place
        return True

    for c in model.get("contexts", []):
        if isinstance(c, dict) and not claim(c.get("id"), DOMAIN_FILE):
            return None

    nodes = []
    for n in model.get("nodes", []):
        if not isinstance(n, dict):
            continue
        if n.get("context") in links:
            err(f"{DOMAIN_FILE}: node {n.get('id')} names context {n['context']}, "
                f"whose elements live in {links[n['context']]}")
            return None
        if not claim(n.get("id"), DOMAIN_FILE):
            return None
        home[str(n.get("id"))] = None
        nodes.append(n)

    ctx_edges = []
    for cid, f in links.items():
        try:
            with open(PurePosixPath(base) / f, encoding="utf-8") as fh:
                part = json.load(fh)
        except FileNotFoundError:
            err(f'context {cid}: linked file "{f}" is missing')
            return None
        except (OSError, json.JSONDecodeError):
            err(f"{f} is not valid JSON.")
            return None
        if not isinstance(part, dict) or not isinstance(part.get("nodes"), list) \
                or not isinstance(part.get("edges"), list):
            err(f'{f}: must be {{ "context", "nodes", "edges" }}')
            return None
        if part.get("context") != cid:
            err(f'{f}: says context "{part.get("context")}", but context {cid} links it')
            return None
        for n in part["nodes"]:
            if not isinstance(n, dict):
                continue
            if "context" in n:
                err(f"{f}: node {n.get('id')} carries context - the file is its context")
                return None
            if not claim(n.get("id"), f):
                return None
            home[str(n.get("id"))] = cid
            nodes.append({**n, "context": cid})
        ctx_edges.append((cid, f, [e for e in part["edges"] if isinstance(e, dict)]))

    # An edge lives where both its ends live, so context files never point elsewhere.
    edges = []
    for e in model.get("edges", []):
        if not isinstance(e, dict):
            continue
        if not claim(e.get("id"), DOMAIN_FILE):
            return None
        s = home.get(str(e.get("source")))
        if s and s == home.get(str(e.get("target"))):
            err(f"{DOMAIN_FILE}: edge {e.get('id')} joins two elements of {s} - it belongs in {links[s]}")
            return None
        edges.append(e)
    for cid, f, es in ctx_edges:
        for e in es:
            if not claim(e.get("id"), f):
                return None
            if home.get(str(e.get("source"))) != cid or home.get(str(e.get("target"))) != cid:
                err(f"{f}: edge {e.get('id')} leaves context {cid} - it belongs in {DOMAIN_FILE}")
                return None
            edges.append(e)
    ORIGIN.update(seen)
    return {**model, "nodes": nodes, "edges": edges}


# How a seam integrates and which side depends on which (decision-00019): an event
# flowing across makes the reacting side downstream; a command or a synchronous read
# across makes the calling side downstream. Mirrors seamStyle in the editor.
EVENT_RELATIONS = ("triggers", "updates", "emits")
SYMMETRIC = ("partnership", "sharedKernel", "separateWays")


def check_seams(model, nodes, edges):
    """Every edge crossing two contexts needs a Context Relationship between them, in
    either direction (decision-00017), whose direction the seam does not contradict
    (decision-00019). An actor's edge is not a seam: a person using two contexts is
    not the contexts integrating. Nor is commentary: a hotspot or an opportunity
    pointing across marks an element, it integrates nothing (issue-00040). One
    warning per pair; one INFO line per relationship with the styles its seams use."""
    pair = lambda a, b: (a, b) if a < b else (b, a)  # noqa: E731
    rels = defaultdict(list)
    for r in as_list(model, "contextRelationships"):
        if isinstance(r.get("source"), str) and isinstance(r.get("target"), str):
            rels[pair(r["source"], r["target"])].append(r)
    names = {c.get("id"): c.get("name") for c in as_list(model, "contexts")}
    name = lambda c: names.get(c, c)  # noqa: E731
    unbacked, styles = set(), defaultdict(set)
    uppers = defaultdict(set)  # pair -> the contexts its seams make upstream
    reversed_ = {}  # pair -> its first reversed seam, reported unless the pair is mutual
    for s, t, rel in edges:
        if rel in ("annotates", "highlights") or nodes[s]["type"] == "actor" or nodes[t]["type"] == "actor":
            continue
        a, b = nodes[s].get("context"), nodes[t].get("context")
        if not isinstance(a, str) or not isinstance(b, str) or a == b:
            continue
        key = pair(a, b)
        events = rel in EVENT_RELATIONS
        styles[key].add("events" if events else "api")
        if key not in rels:
            if key not in unbacked:
                unbacked.add(key)
                warn(f"unbacked seam: '{name(key[0])}' and '{name(key[1])}' "
                     "are joined by an edge but have no Context Relationship")
            continue
        up, down = (a, b) if events else (b, a)
        uppers[key].add(up)
        if key in reversed_ or any(r.get("type") in SYMMETRIC or r["source"] == up for r in rels[key]):
            continue
        reversed_[key] = (f"reversed dependency: '{name(down)}' depends on '{name(up)}' ({rel} "
                          f"'{nodes[s]['label']}' -> '{nodes[t]['label']}'), but the Context Relationship "
                          f"makes '{name(down)}' upstream")
    # A pair depending both ways is a cycle: declared as a partnership or a shared
    # kernel, or a sign the direction or the boundary is wrong. It replaces the
    # reversed-dependency warning, whose fix (flip the arrow) would not resolve it.
    for key, ups in uppers.items():
        accepted = any(r.get("type") in ("partnership", "sharedKernel") for r in rels[key])
        if len(ups) == 2 and not accepted:
            reversed_.pop(key, None)
            warn(f"mutual dependency: '{name(key[0])}' and '{name(key[1])}' depend on each other - "
                 "straighten one direction, declare a partnership, or merge them")
    for msg in reversed_.values():
        warn(msg)
    for key, rs in rels.items():
        for r in rs:
            via = " + ".join(sorted(styles[key])) or "no seams yet"
            infos.append(f"integration: '{name(r['source'])}' -> '{name(r['target'])}' ({r.get('type')}): {via}")


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


def check_nodes(model, ctx_ids):
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
        lv = level_of(n.get("context"))
        if lv in LEVEL_TYPES and t not in LEVEL_TYPES[lv]:
            where_ = f"its context '{n.get('context')}' is at" if lv != MODEL_LEVEL[0] else "level"
            err(f"node {nid}: type '{t}' is not allowed - {where_} '{lv}'")
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
        if k in ("pivotal", "temporal") and not isinstance(v, bool):
            err(f"node {nid}: {k} must be true or false")
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


def check_health(nodes, edges, ctx_ids):
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
        lv = level_of(n.get("context"))
        if t == "domainEvent" and lv != "big-picture":
            if not n.get("properties", {}).get("temporal") \
                    and not any(r in ("produces", "emits") for _, r in inc[nid]):
                warn(f"orphan event '{n['label']}': nothing produces or emits it")
        if t == "domainEvent" and n["label"].split()[-1:] and n["label"].split()[-1] in TECHNICAL_VERBS:
            warn(f"technical event '{n['label']}': names a technical step - what happened in business terms?")
        if t == "command":
            if not reaches_event(nid, out, nodes):
                warn(f"dangling command '{n['label']}': it produces no domain event")
            if not any(r in ("issues", "invokes") for _, r in inc[nid]):
                warn(f"command '{n['label']}': nothing issues it and no policy invokes it")
        if t == "aggregate":
            c = sum(1 for _, r in inc[nid] if r == "handledBy")
            ev = sum(1 for _, r in out[nid] if r == "emits")
            if c > AGG_MAX_COMMANDS or ev > AGG_MAX_EVENTS:
                warn(f"overloaded aggregate '{n['label']}': {c} command(s), {ev} event(s) - "
                     "which rule do they all share? If none, it is two aggregates")
            # its boundary is the invariants it protects: the constraints on the
            # commands it handles (decision-00018 G2)
            if lv == "design" and not any(
                    r2 == "constrainedBy" for s2, r in inc[nid] if r == "handledBy" for _, r2 in out[s2]):
                warn(f"unguarded aggregate '{n['label']}': it protects no invariant - "
                     "which rule can refuse its commands?")
        if t == "policy":
            if not any(r == "triggers" for _, r in inc[nid]):
                warn(f"policy '{n['label']}': no domain event triggers it")
            if not any(r == "invokes" for _, r in out[nid]):
                warn(f"policy '{n['label']}': it invokes no command")
            if "execution" not in n.get("properties", {}):
                # required data at design, a smell before it (decision-00019)
                (err if lv == "design" else warn)(f"policy '{n['label']}': no execution - automatic or manual?")

    sets = defaultdict(list)
    for nid, n in nodes.items():
        key = n.get("properties", {}).get("alternativeSet")
        if key:
            sets[key].append(n["label"])
    for key, members in sets.items():
        if len(members) < 2:
            warn(f"alternative set '{key}': only '{members[0]}' is in it - nothing happens "
                 "instead of itself")

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


def where(message):
    """`<file>: ` for a message about a node or edge read from a split model's file."""
    parts = message.split(" ", 2)
    if len(parts) > 1 and parts[0] in ("node", "edge"):
        origin = ORIGIN.get(parts[1].rstrip(":"))
        if origin:
            return f"{origin}: "
    return ""


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
    MODEL_LEVEL[0] = level

    merged = merge_split(model, Path(path).resolve().parent)
    if merged is None:
        for m in errors:
            print(f"ERROR {m}")
        print(f"\n{path}: the split model could not be merged - {len(errors)} error(s)")
        return 1
    model = merged

    # each context's own level, capped by the model's (decision-00019)
    for c in as_list(model, "contexts"):
        own = c.get("level")
        if isinstance(c.get("id"), str) and own in LEVEL_ORDER and level in LEVEL_ORDER:
            CTX_LEVEL[c["id"]] = min(own, level, key=LEVEL_ORDER.index)
    ctx_ids = check_contexts(model)
    check_context_relationships(model, ctx_ids)
    nodes = check_nodes(model, ctx_ids)
    edges = check_edges(model, nodes)
    check_health(nodes, edges, ctx_ids)
    check_seams(model, nodes, edges)

    for m in errors:
        print(f"ERROR {where(m)}{m}")
    for m in warns:
        print(f"WARN  {where(m)}{m}")
    for m in infos:
        print(f"INFO  {m}")
    print(f"\n{path}: {len(nodes)} nodes, {len(edges)} edges, {len(ctx_ids)} contexts, "
          f"level {level} - {len(errors)} error(s), {len(warns)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
