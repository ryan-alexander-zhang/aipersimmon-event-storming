"use client";

import { Camera, GitCompare, PanelLeft, PanelRight, Pencil, RotateCcw, X } from "lucide-react";
import { LEVEL_LABEL } from "@/lib/eventstorming/levels";
import { useESStore } from "@/lib/store/store";

/** Versions panel (spec-00008 FR10): capture named snapshots, manage them
 *  (rename / delete / restore), and pick two to compare side by side. Snapshots
 *  live outside the model DSL (decision-00008). */
export function VersionsPanel() {
  const snapshots = useESStore((s) => s.snapshots);
  const compare = useESStore((s) => s.compare);
  const captureSnapshot = useESStore((s) => s.captureSnapshot);
  const renameSnapshot = useESStore((s) => s.renameSnapshot);
  const deleteSnapshot = useESStore((s) => s.deleteSnapshot);
  const restoreSnapshot = useESStore((s) => s.restoreSnapshot);
  const setCompareSide = useESStore((s) => s.setCompareSide);
  const openCompare = useESStore((s) => s.openCompare);
  const toggleVersions = useESStore((s) => s.toggleVersions);

  const onCapture = () => {
    const name = window.prompt("Name this snapshot")?.trim();
    if (name) captureSnapshot(name);
  };

  const onRename = (id: string, current: string) => {
    const name = window.prompt("Rename snapshot", current)?.trim();
    if (name) renameSnapshot(id, name);
  };

  const onRestore = (id: string, name: string) => {
    if (window.confirm(`Restore "${name}"? This replaces the current model.`)) restoreSnapshot(id);
  };

  const canCompare = !!compare.leftId && !!compare.rightId && compare.leftId !== compare.rightId;
  // Picking a compare pair only makes sense with two or more snapshots.
  const canPickSides = snapshots.length >= 2;
  const sideBtn = (id: string, side: "left" | "right", label: string, on: boolean) => {
    const Icon = side === "left" ? PanelLeft : PanelRight;
    return (
      <button
        type="button"
        className={`rounded p-1 ${
          on ? "bg-zinc-800 text-white" : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100"
        }`}
        aria-label={`Compare ${side} = ${label}`}
        aria-pressed={on}
        title={side === "left" ? "Use as base (compare from)" : "Use as target (compare to)"}
        onClick={() => setCompareSide(side, id)}
      >
        <Icon size={13} />
      </button>
    );
  };

  const icon = "rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800";

  return (
    <div
      className="absolute left-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-80 flex-col rounded-lg border border-zinc-200 bg-white shadow-lg"
      data-testid="versions-panel"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <span className="text-sm font-semibold text-zinc-800">Versions</span>
        <button
          type="button"
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Close versions"
          onClick={toggleVersions}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700"
          onClick={onCapture}
        >
          <Camera size={14} /> Capture snapshot
        </button>
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canCompare}
          onClick={openCompare}
          data-testid="compare-open"
        >
          <GitCompare size={14} /> Compare
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="px-3 py-4 text-xs text-zinc-500">
          No snapshots yet. Capture one to save this version of the model.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {snapshots.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50"
              data-testid="snapshot-row"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-800">{s.name}</div>
                <div className="text-[10px] text-zinc-400">
                  <span data-testid="snapshot-time">{new Date(s.createdAt).toLocaleString()}</span> ·{" "}
                  {LEVEL_LABEL[s.model.meta.level]}
                </div>
              </div>
              {canPickSides && (
                <>
                  {sideBtn(s.id, "left", s.name, compare.leftId === s.id)}
                  {sideBtn(s.id, "right", s.name, compare.rightId === s.id)}
                </>
              )}
              <button
                type="button"
                className={icon}
                aria-label={`Restore ${s.name}`}
                onClick={() => onRestore(s.id, s.name)}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className={icon}
                aria-label={`Rename ${s.name}`}
                onClick={() => onRename(s.id, s.name)}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className={icon}
                aria-label={`Delete ${s.name}`}
                onClick={() => deleteSnapshot(s.id)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
