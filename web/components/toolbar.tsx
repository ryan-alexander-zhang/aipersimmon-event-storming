"use client";

import { Download, FilePlus, FolderPlus, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { exportJSON, fromModel, importJSON } from "@/lib/dsl/serialize";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES } from "@/lib/eventstorming/elements";
import { isVisibleAt, LEVEL_LABEL, LEVELS } from "@/lib/eventstorming/levels";
import { clearSaved } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";

export function Toolbar() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const level = useESStore((s) => s.level);
  const setLevel = useESStore((s) => s.setLevel);
  const setModel = useESStore((s) => s.setModel);
  const addContext = useESStore((s) => s.addContext);
  const addNode = useESStore((s) => s.addNode);
  const setSelected = useESStore((s) => s.setSelected);
  const clear = useESStore((s) => s.clear);
  const fileRef = useRef<HTMLInputElement>(null);
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
  };

  const onExport = () => {
    const json = exportJSON(nodes, edges, contexts, {
      name: "Event Storming",
      createdAt: new Date().toISOString(),
      level,
    });
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-storming.json";
    a.click();
    URL.revokeObjectURL(url);
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
    if (result.ok) setModel(fromModel(result.model));
    else setError(result.error);
  };

  const onAddContext = () => {
    addContext(`Context ${contexts.length + 1}`);
  };

  // The current level's element types, in a stable palette order (Domain Event
  // first as the timeline spine).
  const paletteTypes = ELEMENT_TYPES.filter((t) => isVisibleAt(level, t));

  const btn =
    "flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-zinc-800">Event Storming</span>
      <div className="ml-3 flex items-center rounded-md border border-zinc-300 p-0.5" role="group" aria-label="Level">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              level === lv ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
            aria-pressed={level === lv}
            onClick={() => setLevel(lv)}
          >
            {LEVEL_LABEL[lv]}
          </button>
        ))}
      </div>
      {/* Element palette — directly place any element the current level allows,
          as a free (Ungrouped) sticky. This is what makes e.g. an Actor creatable
          at Big Picture without going through a Command (decision-00003). */}
      <div className="ml-3 flex items-center gap-1" role="group" aria-label="Add element">
        {paletteTypes.map((t) => (
          <button
            key={t}
            type="button"
            aria-label={`Add ${ELEMENT_DEFINITIONS[t].label}`}
            title={`Add ${ELEMENT_DEFINITIONS[t].label}`}
            className="flex items-center gap-1 rounded-md border border-zinc-300 px-1.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
            onClick={() => setSelected(addNode(t))}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: ELEMENT_DEFINITIONS[t].color }}
            />
            {ELEMENT_DEFINITIONS[t].label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {error && (
          <span
            className="max-w-xs truncate text-xs text-red-600"
            role="alert"
            data-testid="import-error"
            title={error}
          >
            {error}
          </span>
        )}
        <button type="button" className={btn} onClick={onNew}>
          <FilePlus size={14} /> New
        </button>
        <button type="button" className={btn} onClick={onAddContext}>
          <FolderPlus size={14} /> Add context
        </button>
        <button type="button" className={btn} onClick={onExport}>
          <Download size={14} /> Export
        </button>
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onImportFile}
        />
      </div>
    </header>
  );
}
