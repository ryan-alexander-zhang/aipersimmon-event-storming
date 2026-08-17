// Reading a Project's source file, now and again later (us-00031). Only the File
// System Access API hands a page a handle it may re-read after a reload, and only
// Chromium desktop implements it for user files — elsewhere a Project simply has no
// source and the Modeler picks the file again (decision-00011 §3).

// Neither the picker nor the permission methods are in the DOM lib this project
// compiles against, so the two shapes it needs are declared here.
type PickerWindow = Window & {
  showOpenFilePicker?: (options?: {
    types?: { description: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  }) => Promise<FileSystemFileHandle[]>;
};

type PermissionedHandle = FileSystemFileHandle & {
  queryPermission?: (descriptor: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "read" }) => Promise<PermissionState>;
};

/** Whether this browser can hand back a file it may re-read later. False on Firefox
 *  and Safari, where Refresh degrades to picking the file again (us-00031-FR-7). */
export function canRetainFileAccess(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showOpenFilePicker === "function"
  );
}

export type ReadFailure = "denied" | "not-found" | "unreadable";
export type ReadResult = { ok: true; text: string } | { ok: false; failure: ReadFailure };

export const READ_FAILURE_MESSAGE: Record<ReadFailure, string> = {
  denied: "The file was not read — this browser needs permission again.",
  "not-found": "That file could not be found. It may have been moved or deleted.",
  unreadable: "That file could not be read.",
};

/** Open the picker and read the chosen file. Null when the Modeler cancels. */
export async function pickFile(): Promise<{
  handle: FileSystemFileHandle;
  name: string;
  text: string;
} | null> {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (!picker) return null;
  let handle: FileSystemFileHandle;
  try {
    [handle] = await picker({
      types: [{ description: "Event Storming model", accept: { "application/json": [".json"] } }],
      multiple: false,
    });
  } catch {
    return null; // the Modeler dismissed the picker
  }
  const file = await handle.getFile();
  return { handle, name: handle.name || file.name, text: await file.text() };
}

/** Re-read a stored handle, asking for permission again if the browser dropped it.
 *  Must be called from a user gesture, or the permission prompt is refused outright
 *  (us-00031-FR-5). */
export async function readHandle(handle: FileSystemFileHandle): Promise<ReadResult> {
  const h = handle as PermissionedHandle;
  try {
    const state = (await h.queryPermission?.({ mode: "read" })) ?? "granted";
    if (state !== "granted") {
      const asked = (await h.requestPermission?.({ mode: "read" })) ?? "denied";
      if (asked !== "granted") return { ok: false, failure: "denied" };
    }
  } catch {
    return { ok: false, failure: "denied" };
  }
  try {
    return { ok: true, text: await (await h.getFile()).text() };
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotFoundError") return { ok: false, failure: "not-found" };
    if (name === "NotAllowedError") return { ok: false, failure: "denied" };
    return { ok: false, failure: "unreadable" };
  }
}
