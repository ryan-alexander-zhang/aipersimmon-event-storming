"use client";

import { RefreshCw, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { fromModel, importJSON } from "@/lib/dsl/serialize";
import { saveProject } from "@/lib/store/projects";
import {
  canRetainFileAccess,
  pickFile,
  READ_FAILURE_MESSAGE,
  readHandle,
} from "@/lib/store/source-file";
import { useESStore } from "@/lib/store/store";

const shortTime = (iso: string) => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleTimeString([], { timeStyle: "short" });
};

/** The Project's link to a file on disk (us-00031): import one, see which it is, and
 *  re-read it on demand. Where the browser cannot retain access to a chosen file the
 *  Project keeps no handle and the same action re-picks it — one extra click, same
 *  validate → confirm → replace (decision-00011 §3). */
export function SourceFileControls() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const activeProject = useESStore((s) => s.activeProject);
  const setModel = useESStore((s) => s.setModel);
  const markSynced = useESStore((s) => s.markSynced);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const source = activeProject?.source;

  // File wins, but never silently: the Modeler is told what is about to be lost.
  const confirmOverwrite = () =>
    !activeProject?.dirty ||
    window.confirm(
      "This board has changes that are not in the file. Reloading replaces them with the file's contents.",
    );

  // Replace the Model from freshly read text, keeping the current one on any failure
  // (spec-00001-XFR-2). `name`/`handle` present = this file becomes the source.
  const applyText = (text: string, file?: { handle: FileSystemFileHandle; name: string }) => {
    const result = importJSON(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setModel(fromModel(result.model));
    const nextSource = file
      ? { handle: file.handle, name: file.name, lastRefreshedAt: new Date().toISOString() }
      : source && { ...source, lastRefreshedAt: new Date().toISOString() };
    markSynced(nextSource ?? undefined);
    const project = useESStore.getState().activeProject;
    if (!project) return;
    void saveProject({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      lastOpenedAt: project.lastOpenedAt,
      model: result.model,
      discovery: useESStore.getState().discovery.items,
      snapshots: useESStore.getState().snapshots,
      ...(project.source ? { source: project.source } : {}),
      dirty: false,
    });
  };

  // Import (no source yet) and re-pick (browser cannot retain a handle) are the same
  // gesture; only the confirmation differs, since a re-pick can lose local changes.
  const choose = async () => {
    if (source !== undefined && !confirmOverwrite()) return;
    if (!canRetainFileAccess()) {
      fileRef.current?.click();
      return;
    }
    const picked = await pickFile();
    if (!picked) return;
    applyText(picked.text, { handle: picked.handle, name: picked.name });
  };

  const onInputFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    // No handle to keep here: this browser cannot re-read the file later, so the
    // Project stays source-less and "Reload from file…" keeps re-picking.
    applyText(await file.text());
  };

  const refresh = async () => {
    if (!source) return;
    if (!confirmOverwrite()) return;
    const result = await readHandle(source.handle);
    if (!result.ok) {
      setError(READ_FAILURE_MESSAGE[result.failure]);
      return;
    }
    applyText(result.text, { handle: source.handle, name: source.name });
  };

  const btn =
    "flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <div className="relative flex items-center gap-1.5">
      {source ? (
        <>
          <span className="max-w-[12rem] truncate text-xs text-zinc-500" title={source.name}>
            {source.name}
          </span>
          <button
            type="button"
            className={btn}
            onClick={() => void refresh()}
            title={`Last refreshed ${shortTime(source.lastRefreshedAt)}`}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </>
      ) : (
        <button type="button" className={btn} onClick={() => void choose()}>
          <Upload size={14} />
          {/* An empty board is importing; a board with work on it is reloading, which
              is the browser-without-handles form of Refresh (us-00031-FR-7). */}
          {nodes.length + edges.length + contexts.length > 0 ? "Reload from file…" : "Import"}
        </button>
      )}
      {error && (
        <span
          className="absolute right-0 top-full z-30 mt-1 max-w-xs truncate rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 shadow"
          role="alert"
          data-testid="import-error"
          title={error}
        >
          {error}
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void onInputFile(e)}
      />
    </div>
  );
}
