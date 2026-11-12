// A model on disk may be one file or a domain file plus one file per linked Bounded
// Context (decision-00017). In memory it is always one Model: mergeFiles reads the
// files into it, splitModel writes it back out. Nothing else knows files exist.

import type { Context, Model } from "./schema";
import { type ImportResult, parseModel } from "./serialize";

export const DOMAIN_FILE = "domain.json";

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): Raw[] => (Array.isArray(v) ? v.filter(isObject) : []);

/** Why a link cannot be followed, or null when it is a usable path: relative, inside
 *  the domain file's directory, a .json file other than the domain file itself. */
export function linkProblem(file: string): string | null {
  if (file.startsWith("/") || file.includes("\\") || /^[a-zA-Z]:/.test(file)) return "must be a relative path";
  if (file.split("/").some((seg) => seg === ".." || seg === "." || seg === "")) {
    return "must stay inside the model's folder";
  }
  if (!file.endsWith(".json")) return "must be a .json file";
  if (file === DOMAIN_FILE) return "cannot be the domain file";
  return null;
}

/** The path a context gets when the editor splits it out. */
export const defaultLink = (id: string): string => `contexts/${id.replace(/[^A-Za-z0-9_-]/g, "-")}.json`;

/** Every context links to a file of its own; ones already linked keep their link. Two
 *  ids that clean up to one path (`a b`, `a-b`) get numbered, never a shared file. */
export function linkAll(contexts: Context[]): Context[] {
  const taken = new Set(contexts.flatMap((c) => (c.file ? [c.file] : [])));
  return contexts.map((c) => {
    if (c.file) return c;
    let file = defaultLink(c.id);
    for (let n = 2; taken.has(file); n++) file = defaultLink(`${c.id}-${n}`);
    taken.add(file);
    return { ...c, file };
  });
}

function parse(text: string, name: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: `${name} is not valid JSON.` };
  }
}

/** Read a domain file and the files its contexts link to into one Model. `files` maps
 *  paths relative to the domain file to their text. */
export function mergeFiles(domainText: string, files: Record<string, string>): ImportResult {
  const fail = (error: string): ImportResult => ({ ok: false, error });
  const parsed = parse(domainText, DOMAIN_FILE);
  if (!parsed.ok) return fail(parsed.error);
  if (!isObject(parsed.value)) return parseModel(parsed.value);
  const domain = parsed.value;

  const linkOf = new Map<string, string>(); // context id -> its file
  const owner = new Map<string, string>(); // file -> context id
  for (const c of list(domain.contexts)) {
    if (c.file === undefined) continue;
    const id = String(c.id);
    if (typeof c.file !== "string") return fail(`context ${id}: file must be a path`);
    const problem = linkProblem(c.file);
    if (problem) return fail(`context ${id}: file "${c.file}" ${problem}`);
    const other = owner.get(c.file);
    if (other) return fail(`contexts ${other} and ${id} both link "${c.file}" - one file each`);
    if (files[c.file] === undefined) return fail(`context ${id}: linked file "${c.file}" is missing`);
    owner.set(c.file, id);
    linkOf.set(id, c.file);
  }
  if (linkOf.size === 0) return parseModel(domain);

  // Where each id was seen, so a duplicate names both files.
  const seen = new Map<string, string>();
  const claim = (id: unknown, where: string): string | null => {
    const key = String(id);
    const first = seen.get(key);
    if (first) return `id ${key} is used in both ${first} and ${where}`;
    seen.set(key, where);
    return null;
  };
  // The linked context a node lives in, or null for the domain file.
  const home = new Map<string, string | null>();
  for (const c of list(domain.contexts)) {
    const dup = claim(c.id, DOMAIN_FILE);
    if (dup) return fail(dup);
  }

  const nodes: Raw[] = [];
  for (const n of list(domain.nodes)) {
    if (typeof n.context === "string" && linkOf.has(n.context)) {
      return fail(
        `${DOMAIN_FILE}: node ${String(n.id)} names context ${n.context}, whose elements live in ${linkOf.get(n.context)}`,
      );
    }
    const dup = claim(n.id, DOMAIN_FILE);
    if (dup) return fail(dup);
    home.set(String(n.id), null);
    nodes.push(n);
  }

  const contextFiles: { id: string; file: string; edges: Raw[] }[] = [];
  for (const [id, file] of linkOf) {
    const read = parse(files[file], file);
    if (!read.ok) return fail(read.error);
    if (!isObject(read.value) || !Array.isArray(read.value.nodes) || !Array.isArray(read.value.edges)) {
      return fail(`${file}: must be { "context", "nodes", "edges" }`);
    }
    if (read.value.context !== id) {
      return fail(`${file}: says context "${String(read.value.context)}", but context ${id} links it`);
    }
    for (const n of list(read.value.nodes)) {
      if ("context" in n) return fail(`${file}: node ${String(n.id)} carries context - the file is its context`);
      const dup = claim(n.id, file);
      if (dup) return fail(dup);
      home.set(String(n.id), id);
      nodes.push({ ...n, context: id });
    }
    contextFiles.push({ id, file, edges: list(read.value.edges) });
  }

  // An edge lives where both its ends live (decision-00017), so a context file is
  // readable on its own and never points into another file.
  const edges: Raw[] = [];
  for (const e of list(domain.edges)) {
    const dup = claim(e.id, DOMAIN_FILE);
    if (dup) return fail(dup);
    const s = home.get(String(e.source));
    if (s && s === home.get(String(e.target))) {
      return fail(`${DOMAIN_FILE}: edge ${String(e.id)} joins two elements of ${s} - it belongs in ${linkOf.get(s)}`);
    }
    edges.push(e);
  }
  for (const f of contextFiles) {
    for (const e of f.edges) {
      const dup = claim(e.id, f.file);
      if (dup) return fail(dup);
      if (home.get(String(e.source)) !== f.id || home.get(String(e.target)) !== f.id) {
        return fail(`${f.file}: edge ${String(e.id)} leaves context ${f.id} - it belongs in ${DOMAIN_FILE}`);
      }
      edges.push(e);
    }
  }

  return parseModel({ ...domain, nodes, edges });
}

const write = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Write a Model out as its domain file plus one file per linked context, keyed by
 *  path relative to the domain file. Contexts without a link stay inline. */
export function splitModel(model: Model): Record<string, string> {
  const linked = new Set(model.contexts.filter((c) => c.file).map((c) => c.id));
  const ctxOf = new Map(model.nodes.map((n) => [n.id, n.context]));
  const homeOf = (id: string): string | null => {
    const ctx = ctxOf.get(id);
    return ctx !== undefined && linked.has(ctx) ? ctx : null;
  };
  const edgeHome = new Map(
    model.edges.map((e) => {
      const s = homeOf(e.source);
      return [e.id, s !== null && s === homeOf(e.target) ? s : null];
    }),
  );

  const out: Record<string, string> = {
    [DOMAIN_FILE]: write({
      ...model,
      nodes: model.nodes.filter((n) => homeOf(n.id) === null),
      edges: model.edges.filter((e) => edgeHome.get(e.id) === null),
    }),
  };
  for (const c of model.contexts) {
    if (!c.file) continue;
    out[c.file] = write({
      context: c.id,
      // membership is the file: a node in it carries no context key
      nodes: model.nodes.filter((n) => n.context === c.id).map((n) => ({ ...n, context: undefined })),
      edges: model.edges.filter((e) => edgeHome.get(e.id) === c.id),
    });
  }
  return out;
}
