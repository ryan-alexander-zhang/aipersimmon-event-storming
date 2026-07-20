"use client";

import { Download, FolderPlus, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { fromModel, exportJSON, importJSON } from "@/lib/dsl/serialize";
import { useESStore } from "@/lib/store/store";

export function Toolbar() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const setModel = useESStore((s) => s.setModel);
  const addContext = useESStore((s) => s.addContext);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const onExport = () => {
    const json = exportJSON(nodes, edges, contexts, {
      name: "Event Storming",
      createdAt: new Date().toISOString(),
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

  const btn =
    "flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <header className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
      <span className="text-sm font-semibold text-zinc-800">Event Storming</span>
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
