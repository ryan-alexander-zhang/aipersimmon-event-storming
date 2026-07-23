"use client";

import { Download, FilePlus, FolderPlus, Menu, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { exportJSON, fromModel, importJSON } from "@/lib/dsl/serialize";
import { clearSaved, clearSnapshots } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";

// Low-frequency document actions (New / Add context / Import / Export), folded out
// of the toolbar into one popover so the top bar stays lean.
export function FileMenu() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const contextRelationships = useESStore((s) => s.contextRelationships);
  const level = useESStore((s) => s.level);
  const setModel = useESStore((s) => s.setModel);
  const addContext = useESStore((s) => s.addContext);
  const clear = useESStore((s) => s.clear);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start a fresh model: wipe the canvas and the local autosave so a reload no
  // longer restores the previous one. Confirm first when there is work to lose.
  const onNew = () => {
    if (
      (nodes.length > 0 || contexts.length > 0) &&
      !window.confirm("Start a new model? This clears the current one.")
    ) {
      return;
    }
    setError(null);
    clear();
    clearSaved();
    clearSnapshots();
    setOpen(false);
  };

  const onExport = () => {
    const json = exportJSON(
      nodes,
      edges,
      contexts,
      { name: "Event Storming", createdAt: new Date().toISOString(), level },
      contextRelationships,
    );
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-storming.json";
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("Could not read the file.");
      return;
    }
    const result = importJSON(text);
    if (result.ok) {
      setModel(fromModel(result.model));
      setOpen(false);
    } else {
      setError(result.error);
    }
  };

  const onAddContext = () => {
    addContext(`Context ${contexts.length + 1}`);
    setOpen(false);
  };

  const item =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="File"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        onClick={() => setOpen((o) => !o)}
      >
        <Menu size={14} /> File
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-48 rounded-md border border-zinc-200 bg-white p-1 shadow-lg"
          data-testid="file-menu"
        >
          <button type="button" className={item} onClick={onNew}>
            <FilePlus size={14} /> New
          </button>
          <button type="button" className={item} onClick={onAddContext}>
            <FolderPlus size={14} /> Add context
          </button>
          <button type="button" className={item} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import
          </button>
          <button type="button" className={item} onClick={onExport}>
            <Download size={14} /> Export
          </button>
        </div>
      )}
      {/* Import errors stay visible whether or not the menu is open. */}
      {error && (
        <span
          className="absolute right-0 top-full mt-1 max-w-xs truncate rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 shadow"
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
        onChange={onImportFile}
      />
    </div>
  );
}
