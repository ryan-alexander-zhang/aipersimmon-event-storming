"use client";

import { FilePlus, FolderInput, FolderOpen, Trash2, Upload, X } from "lucide-react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { type ImportResult, importJSON } from "@/lib/dsl/serialize";
import { mergeFiles } from "@/lib/dsl/split";
import {
  createProject,
  deleteProject,
  listProjects,
  loadProject,
  type ProjectSource,
  type ProjectSummary,
  saveProject,
  setActiveProjectId,
} from "@/lib/store/projects";
import { READ_FAILURE_MESSAGE } from "@/lib/store/source-file";
import {
  canRetainFolderAccess,
  pickFolder,
  readFolder,
  readFolderInput,
} from "@/lib/store/source-folder";
import { useESStore } from "@/lib/store/store";

/** Recent: create a Project, reopen one, import a file into a new one, delete one
 *  (us-00030). Doubles as the empty state — with no Project open there is no board
 *  behind it, and closing is not offered (us-00030-FR-5). */
export function ProjectsDialog() {
  const activeProject = useESStore((s) => s.activeProject);
  const openProject = useESStore((s) => s.openProject);
  const closeProjects = useESStore((s) => s.closeProjects);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setProjects(await listProjects());
  };

  // Recent is read once per opening: the dialog unmounts when a Project opens, so
  // it always mounts against fresh storage.
  useEffect(() => {
    let alive = true;
    void listProjects().then((list) => {
      if (alive) setProjects(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Opening stamps lastOpenedAt, which is the order Recent is read in.
  const open = async (id: string) => {
    const record = await loadProject(id);
    if (!record) {
      setError("That Project could not be opened.");
      await refresh();
      return;
    }
    const opened = { ...record, lastOpenedAt: new Date().toISOString() };
    openProject(opened);
    setActiveProjectId(opened.id);
    void saveProject(opened);
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const record = await createProject(trimmed);
      setName("");
      openProject(record);
      setActiveProjectId(record.id);
    } catch {
      setError("This browser refused to store the Project.");
    }
  };

  const remove = async (project: ProjectSummary) => {
    if (!window.confirm(`Delete "${project.name}"? Its board and versions go with it.`)) return;
    await deleteProject(project.id);
    if (activeProject?.id === project.id) useESStore.getState().closeProject();
    await refresh();
  };

  // Import as a new Project: the model names it (decision-00021), the file when the
  // model has no name, so a board arrives already labelled.
  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    await start(file.name.replace(/\.json$/i, ""), importJSON(await file.text()));
  };

  const start = async (projectName: string, result: ImportResult, source?: ProjectSource) => {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // The model's own name first: Export writes the Project's name there, so export
    // then import keeps it (decision-00021). The file or folder name is the fallback.
    const record = await createProject(result.model.meta.name.trim() || projectName);
    const imported = { ...record, model: result.model, ...(source ? { source } : {}) };
    openProject(imported);
    setActiveProjectId(imported.id);
    void saveProject(imported);
  };

  // Import a split model's folder as a new Project (decision-00017). Where the browser
  // can keep the folder it becomes the Project's source, to refresh and save back to;
  // elsewhere a directory input reads it once.
  const importFolder = async () => {
    setError(null);
    if (!canRetainFolderAccess()) {
      folderRef.current?.click();
      return;
    }
    const handle = await pickFolder();
    if (!handle) return;
    const folder = await readFolder(handle);
    if (!folder.ok) {
      setError(READ_FAILURE_MESSAGE[folder.failure]);
      return;
    }
    const source = { kind: "folder" as const, handle, name: handle.name, lastRefreshedAt: new Date().toISOString() };
    await start(handle.name, mergeFiles(folder.domain, folder.files), source);
  };

  const onFolderInput = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (chosen.length === 0) return;
    const folder = await readFolderInput(chosen);
    if (!folder) {
      setError("That folder has no domain.json at its top.");
      return;
    }
    await start(folder.name, mergeFiles(folder.domain, folder.files));
  };

  const item =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/20 p-4"
      data-testid="projects-dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Projects</h2>
          {activeProject && (
            <button
              type="button"
              aria-label="Close projects"
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
              onClick={closeProjects}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mb-3 flex gap-2">
          <input
            aria-label="Project name"
            placeholder="New project name"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void create();
            }}
          />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            onClick={() => void create()}
          >
            <FilePlus size={14} /> Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="mb-3 rounded-md bg-zinc-50 px-2 py-3 text-center text-xs text-zinc-500">
            No projects yet. Create one, or import a model file.
          </p>
        ) : (
          <ul className="mb-3 max-h-64 overflow-y-auto" data-testid="recent-projects">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Open ${p.name}`}
                  className={item}
                  onClick={() => void open(p.id)}
                >
                  <FolderOpen size={14} />
                  <span className="truncate">{p.name}</span>
                  {p.sourceName && (
                    <span className="shrink-0 truncate text-[11px] font-normal text-zinc-400">
                      {p.sourceName}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 pl-2 text-[11px] font-normal text-zinc-400">
                    {new Date(p.lastOpenedAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${p.name}`}
                  className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                  onClick={() => void remove(p)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className={item} onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Import a model file…
        </button>
        <button type="button" className={item} onClick={() => void importFolder()}>
          <FolderInput size={14} /> Import a model folder…
        </button>

        {error && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-600" role="alert">
            {error}
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void importFile(e)}
        />
        <input
          ref={(el) => {
            folderRef.current = el;
            // not in React's attribute types; every current browser supports it
            el?.setAttribute("webkitdirectory", "");
          }}
          type="file"
          className="hidden"
          data-testid="folder-input"
          onChange={(e) => void onFolderInput(e)}
        />
      </div>
    </div>
  );
}
