// A split model's folder as a Project source (decision-00017): a domain file plus the
// context files it links. Reading works in every browser through a directory input;
// keeping the folder - to refresh it, or to save back to it - needs the File System
// Access API, which only Chromium desktop has (decision-00011 §3).

import { DOMAIN_FILE } from "@/lib/dsl/split";
import type { ReadFailure } from "./source-file";

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

type Mode = "read" | "readwrite";
type PermissionedFolder = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode: Mode }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: Mode }) => Promise<PermissionState>;
};

/** A folder's model, as text: the domain file and every file it links that exists. */
export interface FolderText {
  domain: string;
  files: Record<string, string>;
}

export type FolderResult = ({ ok: true } & FolderText) | { ok: false; failure: ReadFailure };

/** Whether this browser can hand back a folder it may read and write later. */
export function canRetainFolderAccess(): boolean {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showDirectoryPicker === "function";
}

/** Open the folder picker. Null when the Modeler cancels or the browser has none. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    return await picker({ mode: "readwrite" });
  } catch {
    return null; // the Modeler dismissed the picker
  }
}

/** The paths the domain file links, read leniently: mergeFiles reports bad links. */
function linkedPaths(domain: string): string[] {
  try {
    const contexts = (JSON.parse(domain) as { contexts?: unknown }).contexts;
    if (!Array.isArray(contexts)) return [];
    return contexts
      .map((c) => (typeof c === "object" && c !== null ? (c as { file?: unknown }).file : undefined))
      .filter((f): f is string => typeof f === "string");
  } catch {
    return [];
  }
}

async function granted(folder: FileSystemDirectoryHandle, mode: Mode): Promise<boolean> {
  const f = folder as PermissionedFolder;
  try {
    if (((await f.queryPermission?.({ mode })) ?? "granted") === "granted") return true;
    return ((await f.requestPermission?.({ mode })) ?? "denied") === "granted";
  } catch {
    return false;
  }
}

async function fileAt(folder: FileSystemDirectoryHandle, path: string, create: boolean) {
  const parts = path.split("/");
  let dir = folder;
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create });
  return dir.getFileHandle(parts[parts.length - 1], { create });
}

const failureOf = (error: unknown): ReadFailure => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotFoundError") return "not-found";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  return "unreadable";
};

/** Read the domain file and every file it links. A linked file that is not there is
 *  left out, so the merge names it; a missing domain file is `not-found`. Must run
 *  from a user gesture when permission has to be asked again (us-00031-FR-5). */
export async function readFolder(folder: FileSystemDirectoryHandle): Promise<FolderResult> {
  if (!(await granted(folder, "read"))) return { ok: false, failure: "denied" };
  let domain: string;
  try {
    domain = await (await (await folder.getFileHandle(DOMAIN_FILE)).getFile()).text();
  } catch (error) {
    return { ok: false, failure: failureOf(error) };
  }
  const files: Record<string, string> = {};
  for (const path of linkedPaths(domain)) {
    try {
      files[path] = await (await (await fileAt(folder, path, false)).getFile()).text();
    } catch (error) {
      if (failureOf(error) !== "not-found") return { ok: false, failure: failureOf(error) };
    }
  }
  return { ok: true, domain, files };
}

/** Write every file of a split model into the folder, creating sub-folders as needed.
 *  Never deletes anything already there. */
export async function writeFolder(
  folder: FileSystemDirectoryHandle,
  files: Record<string, string>,
): Promise<{ ok: true } | { ok: false; failure: ReadFailure }> {
  if (!(await granted(folder, "readwrite"))) return { ok: false, failure: "denied" };
  try {
    for (const [path, text] of Object.entries(files)) {
      const writable = await (await fileAt(folder, path, true)).createWritable();
      await writable.write(text);
      await writable.close();
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, failure: failureOf(error) };
  }
}

/** Whether the folder already holds a domain file, so saving would replace it. */
export async function hasDomainFile(folder: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    await folder.getFileHandle(DOMAIN_FILE);
    return true;
  } catch {
    return false;
  }
}

/** A folder chosen through a directory input (every browser): its name, and its files
 *  keyed by path inside it. Null when it holds no domain file at its top. */
export async function readFolderInput(
  chosen: File[],
): Promise<({ name: string } & FolderText) | null> {
  const files: Record<string, string> = {};
  let name = "";
  for (const file of chosen) {
    const [top, ...rest] = file.webkitRelativePath.split("/");
    name = top;
    if (rest.length > 0 && rest.join("/").endsWith(".json")) files[rest.join("/")] = await file.text();
  }
  const domain = files[DOMAIN_FILE];
  if (domain === undefined) return null;
  delete files[DOMAIN_FILE];
  return { name, domain, files };
}
