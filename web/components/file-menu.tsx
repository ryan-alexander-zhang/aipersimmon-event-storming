"use client";

import { Download, FolderOpen, FolderPlus, FolderSync, Menu } from "lucide-react";
import { useState } from "react";
import { exportJSON, toModel } from "@/lib/dsl/serialize";
import { linkAll, splitModel } from "@/lib/dsl/split";
import { saveProject } from "@/lib/store/projects";
import { READ_FAILURE_MESSAGE } from "@/lib/store/source-file";
import {
  canRetainFolderAccess,
  hasDomainFile,
  pickFolder,
  writeFolder,
} from "@/lib/store/source-folder";
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

  // Save as a split model (decision-00017): back into the Project's folder, or into one
  // the Modeler picks, which then becomes the source. Every context gets a file of its
  // own; a context without one gets the default link first.
  const onSaveFolder = async () => {
    setOpen(false);
    const project = useESStore.getState().activeProject;
    if (!project) return;
    let handle = project.source?.kind === "folder" ? project.source.handle : null;
    if (!handle) {
      handle = await pickFolder();
      if (!handle) return;
      if (
        (await hasDomainFile(handle)) &&
        !window.confirm(`"${handle.name}" already holds a domain.json. Replace it with this model?`)
      ) {
        return;
      }
    }
    const linked = linkAll(contexts);
    const model = toModel(
      nodes,
      edges,
      linked,
      { name: project.name, createdAt: project.createdAt, level },
      contextRelationships,
    );
    const written = await writeFolder(handle, splitModel(model));
    if (!written.ok) {
      window.alert(`The model was not saved to the folder. ${READ_FAILURE_MESSAGE[written.failure]}`);
      return;
    }
    const source = { kind: "folder" as const, handle, name: handle.name, lastRefreshedAt: new Date().toISOString() };
    useESStore.setState({ contexts: linked });
    useESStore.getState().markSynced(source);
    const state = useESStore.getState();
    void saveProject({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      lastOpenedAt: project.lastOpenedAt,
      model,
      discovery: state.discovery.items,
      snapshots: state.snapshots,
      source,
      dirty: false,
    });
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
          {/* Writing a folder needs the File System Access API (Chromium); elsewhere
              Export of one merged file is the way out (decision-00017). */}
          {canRetainFolderAccess() && (
            <button type="button" className={item} onClick={() => void onSaveFolder()}>
              <FolderSync size={14} /> Save to folder…
            </button>
          )}
          <button type="button" className={item} onClick={onExport}>
            <Download size={14} /> Export
          </button>
        </div>
      )}
    </div>
  );
}
