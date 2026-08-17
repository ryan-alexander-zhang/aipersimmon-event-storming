// Projects: the browser-local workspaces that each own a Model, its discovery wall,
// and its Snapshots (spec-00012, decision-00011). A Project's stored copy — not any
// file — is what "open" reads, which is what keeps Recent working on every browser
// and for a Project whose source file was moved or never existed.
//
// Everything read back is untrusted: a record's Model and Snapshots are migrated and
// validated exactly as an import is. Failure degrades (empty board, or omitted from
// Recent) and is never fatal (spec-00012-XFR-4).

import { nanoid } from "nanoid";
import { migrateToLatest } from "@/lib/dsl/migrate";
import { type Model, modelSchema } from "@/lib/dsl/schema";
import { importJSON, toModel } from "@/lib/dsl/serialize";
import { deleteRecord, getAllRecords, getRecord, putRecord } from "./projects-db";
import type { DiscoveryItem, Snapshot } from "./store";

/** The only thing left in localStorage: which Project to reopen, read synchronously
 *  at boot before IndexedDB is available (decision-00011 §6). */
export const ACTIVE_PROJECT_KEY = "event-storming:activeProject";

// The pre-Project keys. Nothing writes them any more; they exist so a Modeler who
// last used the single-model build keeps that work (us-00032-FR-4), and migrateLegacy
// removes them once it has.
export const STORAGE_KEY = "event-storming:model";
export const STORAGE_KEY_DISCOVERY = "event-storming:discovery";
export const STORAGE_KEY_SNAPSHOTS = "event-storming:snapshots";

/** The source file a Project was imported from, when the browser can retain access
 *  to it. A `FileSystemFileHandle` survives structured cloning, so IndexedDB can
 *  store it — localStorage never could. Absent on Firefox/Safari (decision-00011 §3). */
export interface ProjectSource {
  handle: FileSystemFileHandle;
  name: string;
  lastRefreshedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  createdAt: string;
  lastOpenedAt: string;
  model: Model;
  discovery: DiscoveryItem[];
  snapshots: Snapshot[];
  source?: ProjectSource;
  /** Model changed since it was last loaded from `source`; gates the refresh
   *  confirmation (us-00031-FR-4). */
  dirty: boolean;
}

/** What Recent needs: identity only, so a Project with a corrupt Model still lists
 *  (it opens empty instead — us-00032-FR-3) and only an unreadable *record* is
 *  omitted (us-00030-FR-7). */
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  lastOpenedAt: string;
  sourceName?: string;
}

function isSummary(raw: unknown): raw is ProjectSummary & { [k: string]: unknown } {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.name === "string" &&
    typeof r.createdAt === "string" &&
    typeof r.lastOpenedAt === "string"
  );
}

function parseDiscovery(raw: unknown): DiscoveryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (it): it is DiscoveryItem =>
      typeof it === "object" &&
      it !== null &&
      typeof (it as DiscoveryItem).id === "string" &&
      typeof (it as DiscoveryItem).label === "string" &&
      typeof (it as DiscoveryItem).x === "number" &&
      typeof (it as DiscoveryItem).y === "number",
  );
}

function parseSnapshots(raw: unknown): Snapshot[] {
  if (!Array.isArray(raw)) return [];
  const out: Snapshot[] = [];
  for (const entry of raw) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as Snapshot).id !== "string" ||
      typeof (entry as Snapshot).name !== "string" ||
      typeof (entry as Snapshot).createdAt !== "string"
    ) {
      continue;
    }
    const e = entry as Snapshot;
    const result = modelSchema.safeParse(migrateToLatest(e.model));
    if (result.success) {
      out.push({ id: e.id, name: e.name, createdAt: e.createdAt, model: result.data });
    }
  }
  return out;
}

function parseSource(raw: unknown): ProjectSource | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || typeof r.lastRefreshedAt !== "string") return undefined;
  // The handle is opaque here; whether it still grants access is only knowable when
  // a refresh actually reads it (us-00031-FR-5, us-00031-FR-6).
  if (typeof r.handle !== "object" || r.handle === null) return undefined;
  return {
    handle: r.handle as FileSystemFileHandle,
    name: r.name,
    lastRefreshedAt: r.lastRefreshedAt,
  };
}

function emptyModel(name: string): Model {
  return toModel([], [], [], { name, createdAt: new Date().toISOString(), level: "design" });
}

/** Recent, most-recently-opened first. Unreadable records are skipped, not fatal. */
export async function listProjects(): Promise<ProjectSummary[]> {
  let raw: unknown[];
  try {
    raw = await getAllRecords();
  } catch {
    return [];
  }
  return raw
    .filter(isSummary)
    .map((r) => {
      const source = parseSource(r.source);
      return {
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
        lastOpenedAt: r.lastOpenedAt,
        ...(source ? { sourceName: source.name } : {}),
      };
    })
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export async function createProject(name: string): Promise<ProjectRecord> {
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    id: nanoid(),
    name,
    createdAt: now,
    lastOpenedAt: now,
    model: emptyModel(name),
    discovery: [],
    snapshots: [],
    dirty: false,
  };
  await putRecord(record);
  return record;
}

/** Null only when the Project is not there or its identity is unreadable. A corrupt
 *  Model opens as an empty board instead (us-00032-FR-3). */
export async function loadProject(id: string): Promise<ProjectRecord | null> {
  let raw: unknown;
  try {
    raw = await getRecord(id);
  } catch {
    return null;
  }
  if (!isSummary(raw)) return null;
  const parsed = modelSchema.safeParse(migrateToLatest(raw.model));
  const source = parseSource(raw.source);
  return {
    id: raw.id,
    name: raw.name,
    createdAt: raw.createdAt,
    lastOpenedAt: raw.lastOpenedAt,
    model: parsed.success ? parsed.data : emptyModel(raw.name),
    discovery: parseDiscovery(raw.discovery),
    snapshots: parseSnapshots(raw.snapshots),
    ...(source ? { source } : {}),
    dirty: raw.dirty === true,
  };
}

/** Rejects when the write fails (quota, private mode); the caller reports it. */
export async function saveProject(record: ProjectRecord): Promise<void> {
  await putRecord(record);
}

export async function deleteProject(id: string): Promise<void> {
  await deleteRecord(id);
  if (getActiveProjectId() === id) setActiveProjectId(null);
}

export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id === null) window.localStorage.removeItem(ACTIVE_PROJECT_KEY);
  else window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

/** The one-time move off the pre-Project localStorage keys (us-00032-FR-4): the
 *  implicit model, its discovery wall, and its Snapshots become a single Project,
 *  and the old keys go. Returns the new Project so boot can open it. */
export async function migrateLegacy(): Promise<ProjectRecord | null> {
  if (typeof window === "undefined") return null;
  const rawModel = window.localStorage.getItem(STORAGE_KEY);
  const rawDiscovery = window.localStorage.getItem(STORAGE_KEY_DISCOVERY);
  const rawSnapshots = window.localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
  if (rawModel === null && rawDiscovery === null && rawSnapshots === null) return null;
  if ((await listProjects()).length > 0) return null;

  const imported = rawModel === null ? null : importJSON(rawModel);
  const model = imported?.ok ? imported.model : null;
  const name = model?.meta.name || "Untitled";
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    id: nanoid(),
    name,
    createdAt: now,
    lastOpenedAt: now,
    model: model ?? emptyModel(name),
    discovery: parseDiscovery(safeParseJSON(rawDiscovery)?.items),
    snapshots: parseSnapshots(safeParseJSON(rawSnapshots)?.snapshots),
    dirty: false,
  };
  await putRecord(record);
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_KEY_DISCOVERY);
  window.localStorage.removeItem(STORAGE_KEY_SNAPSHOTS);
  return record;
}

function safeParseJSON(raw: string | null): { items?: unknown; snapshots?: unknown } | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
