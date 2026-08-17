"use client";

import { Download, FolderOpen, FolderPlus, Menu } from "lucide-react";
import { useState } from "react";
import { exportJSON } from "@/lib/dsl/serialize";
import { useESStore } from "@/lib/store/store";

// Low-frequency document actions (Projects / Add context / Export), folded out of the
// toolbar into one popover so the top bar stays lean. Reading a file is its own
// control next door (spec-00012): it belongs with the Project's source file, not with
// the model's own actions.
export function FileMenu() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const contexts = useESStore((s) => s.contexts);
  const contextRelationships = useESStore((s) => s.contextRelationships);
  const level = useESStore((s) => s.level);
  const activeProject = useESStore((s) => s.activeProject);
  const addContext = useESStore((s) => s.addContext);
  const openProjects = useESStore((s) => s.openProjects);
  const [open, setOpen] = useState(false);

  // A new model means a new Project now, and a Project needs a name — so this hands
  // over to Recent rather than clearing the board in place (spec-00012).
  const onProjects = () => {
    openProjects();
    setOpen(false);
  };

  // The Project names both the exported model and its file (spec-00012-XFR-3).
  const onExport = () => {
    const name = activeProject?.name ?? "Event Storming";
    const json = exportJSON(
      nodes,
      edges,
      contexts,
      { name, createdAt: new Date().toISOString(), level },
      contextRelationships,
    );
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[\\/:*?"<>|]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
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
          <button type="button" className={item} onClick={onProjects}>
            <FolderOpen size={14} /> Projects…
          </button>
          <button type="button" className={item} onClick={onAddContext}>
            <FolderPlus size={14} /> Add context
          </button>
          <button type="button" className={item} onClick={onExport}>
            <Download size={14} /> Export
          </button>
        </div>
      )}
    </div>
  );
}
