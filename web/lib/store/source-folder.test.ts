import { afterEach, describe, expect, it } from "vitest";
import {
  canRetainFolderAccess,
  hasDomainFile,
  pickFolder,
  readFolder,
  readFolderInput,
  writeFolder,
} from "./source-folder";

// An in-memory directory: nested objects are folders, strings are files.
type Tree = { [name: string]: Tree | string };

const notFound = () => new DOMException("missing", "NotFoundError");

function folder(tree: Tree, permission: { query?: PermissionState; request?: PermissionState } = {}) {
  const dir = (node: Tree): unknown => ({
    getDirectoryHandle: async (name: string, opts?: { create?: boolean }) => {
      if (typeof node[name] !== "object") {
        if (!opts?.create) throw notFound();
        node[name] = {};
      }
      return dir(node[name] as Tree);
    },
    getFileHandle: async (name: string, opts?: { create?: boolean }) => {
      if (typeof node[name] !== "string") {
        if (!opts?.create) throw notFound();
        node[name] = "";
      }
      return {
        getFile: async () => ({ text: async () => node[name] as string }),
        createWritable: async () => {
          let buf = "";
          return {
            write: async (t: string) => void (buf += t),
            close: async () => void (node[name] = buf),
          };
        },
      };
    },
    queryPermission: async () => permission.query ?? "granted",
    requestPermission: async () => permission.request ?? "denied",
  });
  return dir(tree) as FileSystemDirectoryHandle;
}

const DOMAIN = JSON.stringify({ contexts: [{ id: "ord", file: "contexts/ord.json" }, { id: "x" }, "junk"] });

afterEach(() => {
  // @ts-expect-error the picker is only ever defined by these tests
  delete window.showDirectoryPicker;
});

describe("a folder as a Project source [decision-00017]", () => {
  it("knows whether the browser can keep a folder", async () => {
    expect(canRetainFolderAccess()).toBe(false);
    expect(await pickFolder()).toBeNull();
    const picked = folder({});
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: async () => picked });
    expect(canRetainFolderAccess()).toBe(true);
    expect(await pickFolder()).toBe(picked);
  });

  it("treats a dismissed picker as a cancel", async () => {
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => {
        throw new DOMException("aborted", "AbortError");
      },
    });
    expect(await pickFolder()).toBeNull();
  });

  it("reads the domain file and every file it links [plan-00024-AC-10]", async () => {
    const f = folder({ "domain.json": DOMAIN, contexts: { "ord.json": "ORD" }, "other.json": "ignored" });
    expect(await readFolder(f)).toEqual({ ok: true, domain: DOMAIN, files: { "contexts/ord.json": "ORD" } });
  });

  it("leaves a missing linked file out, for the merge to name", async () => {
    expect(await readFolder(folder({ "domain.json": DOMAIN }))).toEqual({ ok: true, domain: DOMAIN, files: {} });
  });

  it("reads no links from a domain file that is not a model", async () => {
    for (const domain of ["{", "[]", "{}"]) {
      expect(await readFolder(folder({ "domain.json": domain }))).toEqual({ ok: true, domain, files: {} });
    }
  });

  it("maps a missing domain file, a refused permission and other errors to read failures", async () => {
    expect(await readFolder(folder({}))).toEqual({ ok: false, failure: "not-found" });
    expect(await readFolder(folder({ "domain.json": DOMAIN }, { query: "prompt" }))).toEqual({
      ok: false,
      failure: "denied",
    });
    const granted = folder({ "domain.json": DOMAIN }, { query: "prompt", request: "granted" });
    expect((await readFolder(granted)).ok).toBe(true);

    const broken = {
      getFileHandle: async () => {
        throw new DOMException("no", "NotAllowedError");
      },
    } as unknown as FileSystemDirectoryHandle;
    expect(await readFolder(broken)).toEqual({ ok: false, failure: "denied" });
    const throwsPermission = {
      queryPermission: async () => {
        throw new Error("x");
      },
    } as unknown as FileSystemDirectoryHandle;
    expect(await readFolder(throwsPermission)).toEqual({ ok: false, failure: "denied" });
  });

  it("fails a linked file that exists but cannot be read", async () => {
    const f = folder({ "domain.json": DOMAIN });
    const real = f.getDirectoryHandle.bind(f);
    f.getDirectoryHandle = async () => {
      throw new Error("disk");
    };
    expect(await readFolder(f)).toEqual({ ok: false, failure: "unreadable" });
    f.getDirectoryHandle = real;
  });

  it("writes every file, creating sub-folders, and keeps what was there [plan-00024-AC-9]", async () => {
    const tree: Tree = { "notes.md": "keep" };
    const f = folder(tree);
    expect(await hasDomainFile(f)).toBe(false);
    expect(await writeFolder(f, { "domain.json": "D", "contexts/ord.json": "O" })).toEqual({ ok: true });
    expect(tree).toEqual({ "notes.md": "keep", "domain.json": "D", contexts: { "ord.json": "O" } });
    expect(await hasDomainFile(f)).toBe(true);
  });

  it("refuses to write without permission, and reports a failed write", async () => {
    expect(await writeFolder(folder({}, { query: "denied" }), { "domain.json": "D" })).toEqual({
      ok: false,
      failure: "denied",
    });
    const f = folder({});
    f.getFileHandle = async () => {
      throw new DOMException("no", "SecurityError");
    };
    expect(await writeFolder(f, { "domain.json": "D" })).toEqual({ ok: false, failure: "denied" });
  });

  it("reads a folder chosen through a directory input", async () => {
    const file = (path: string, text: string) => {
      const f = new File([text], path.split("/").pop() as string);
      Object.defineProperty(f, "webkitRelativePath", { value: path });
      return f;
    };
    expect(
      await readFolderInput([
        file("ride/domain.json", "D"),
        file("ride/contexts/ord.json", "O"),
        file("ride/README.md", "skip"),
      ]),
    ).toEqual({ name: "ride", domain: "D", files: { "contexts/ord.json": "O" } });
    expect(await readFolderInput([file("ride/contexts/ord.json", "O")])).toBeNull();
  });
});
