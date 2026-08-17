import { afterEach, describe, expect, it, vi } from "vitest";
import { canRetainFileAccess, pickFile, readHandle } from "./source-file";

type FakeHandle = {
  name: string;
  getFile: () => Promise<{ text: () => Promise<string> }>;
  queryPermission?: () => Promise<PermissionState>;
  requestPermission?: () => Promise<PermissionState>;
};

const handle = (over: Partial<FakeHandle> = {}): FileSystemFileHandle =>
  ({
    name: "ordering.json",
    getFile: async () => ({ text: async () => '{"version":"4.0"}' }),
    ...over,
  }) as unknown as FileSystemFileHandle;

const withPicker = (picker: unknown) => {
  Object.defineProperty(window, "showOpenFilePicker", {
    configurable: true,
    writable: true,
    value: picker,
  });
};

afterEach(() => {
  // @ts-expect-error the picker is only ever defined by these tests
  delete window.showOpenFilePicker;
});

describe("retaining access to a chosen file [us-00031-FR-7]", () => {
  it("is false on a browser without the picker", () => {
    expect(canRetainFileAccess()).toBe(false);
  });

  it("is true once the picker exists", () => {
    withPicker(() => Promise.resolve([]));
    expect(canRetainFileAccess()).toBe(true);
  });

  it("picks nothing when there is no picker to open", async () => {
    expect(await pickFile()).toBeNull();
  });

  it("returns the chosen file's handle, name, and text", async () => {
    withPicker(() => Promise.resolve([handle()]));
    expect(await pickFile()).toMatchObject({ name: "ordering.json", text: '{"version":"4.0"}' });
  });

  it("returns null when the Modeler dismisses the picker", async () => {
    withPicker(() => Promise.reject(new DOMException("aborted", "AbortError")));
    expect(await pickFile()).toBeNull();
  });
});

describe("re-reading a stored handle [us-00031-FR-3, FR-5, FR-6]", () => {
  it("reads a handle that still has permission", async () => {
    const result = await readHandle(handle({ queryPermission: async () => "granted" }));
    expect(result).toEqual({ ok: true, text: '{"version":"4.0"}' });
  });

  it("asks again when permission lapsed, and reads on a yes", async () => {
    const request = vi.fn(async () => "granted" as PermissionState);
    const result = await readHandle(
      handle({ queryPermission: async () => "prompt", requestPermission: request }),
    );
    expect(request).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("reports a denial rather than throwing [us-00031-AC-5.1]", async () => {
    const result = await readHandle(
      handle({ queryPermission: async () => "prompt", requestPermission: async () => "denied" }),
    );
    expect(result).toEqual({ ok: false, failure: "denied" });
  });

  it("reports a missing file apart from any other failure [us-00031-AC-6.1]", async () => {
    const gone = handle({
      queryPermission: async () => "granted",
      getFile: () => Promise.reject(new DOMException("gone", "NotFoundError")),
    });
    expect(await readHandle(gone)).toEqual({ ok: false, failure: "not-found" });
  });

  it("reports any other read error as unreadable", async () => {
    const broken = handle({
      queryPermission: async () => "granted",
      getFile: () => Promise.reject(new Error("disk on fire")),
    });
    expect(await readHandle(broken)).toEqual({ ok: false, failure: "unreadable" });
  });

  it("treats a revoked permission during the read as a denial", async () => {
    const revoked = handle({
      queryPermission: async () => "granted",
      getFile: () => Promise.reject(new DOMException("no", "NotAllowedError")),
    });
    expect(await readHandle(revoked)).toEqual({ ok: false, failure: "denied" });
  });

  it("reads a handle from a browser that has no permission methods at all", async () => {
    expect(await readHandle(handle())).toEqual({ ok: true, text: '{"version":"4.0"}' });
  });

  it("treats a throwing permission query as a denial", async () => {
    const hostile = handle({
      queryPermission: () => Promise.reject(new Error("nope")),
    });
    expect(await readHandle(hostile)).toEqual({ ok: false, failure: "denied" });
  });
});
