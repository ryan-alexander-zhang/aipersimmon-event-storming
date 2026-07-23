"use client";

import { X } from "lucide-react";
import { useMemo } from "react";
import { SnapshotBoard } from "@/components/snapshot-board";
import { diffModels } from "@/lib/dsl/diff";
import { type DiffChange, describeChange } from "@/lib/dsl/diff-display";
import { ELEMENT_DEFINITIONS } from "@/lib/eventstorming/elements";
import { useESStore } from "@/lib/store/store";

/** Base / target snapshot picker for one side of the comparison. */
function Picker({ side, label }: { side: "left" | "right"; label: string }) {
  const snapshots = useESStore((s) => s.snapshots);
  const id = useESStore((s) => (side === "left" ? s.compare.leftId : s.compare.rightId));
  const setCompareSide = useESStore((s) => s.setCompareSide);
  return (
    <label className="flex items-center gap-1.5 text-xs text-zinc-600">
      <span className="font-medium">{label}</span>
      <select
        className="rounded border border-zinc-300 px-1.5 py-0.5 text-xs text-zinc-700"
        value={id ?? ""}
        onChange={(e) => setCompareSide(side, e.target.value)}
        aria-label={`${side} snapshot`}
      >
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Unified snapshot diff (us-00023 / decision-00009): renders the TARGET snapshot's
 *  board with unchanged elements dimmed and added/changed ringed; removed elements
 *  are listed in the summary strip. A distinct read-only view — it never mutates the
 *  live model. `h-full` (not flex-1) so the board fills the non-flex board slot
 *  (issue-00014). */
export function CompareDiffView() {
  const snapshots = useESStore((s) => s.snapshots);
  const leftId = useESStore((s) => s.compare.leftId);
  const rightId = useESStore((s) => s.compare.rightId);
  const closeCompare = useESStore((s) => s.closeCompare);

  const base = snapshots.find((s) => s.id === leftId);
  const target = snapshots.find((s) => s.id === rightId);
  const diff = useMemo(
    () => (base && target ? diffModels(base.model, target.model) : null),
    [base, target],
  );
  // Display-ready per-node change detail (context ids resolved to names here).
  const changes = useMemo(() => {
    if (!base || !target || !diff) return undefined;
    const m = new Map<string, DiffChange>();
    for (const [id, ch] of diff.changed) {
      m.set(id, describeChange(ch, base.model.contexts, target.model.contexts));
    }
    return m;
  }, [base, target, diff]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="compare-view">
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
        <span className="text-xs font-semibold text-zinc-700">Compare</span>
        <Picker side="left" label="Base" />
        <span className="text-zinc-400">→</span>
        <Picker side="right" label="Target" />
        <button
          type="button"
          className="ml-auto flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100"
          onClick={closeCompare}
        >
          <X size={13} /> Close compare
        </button>
      </div>

      <div className="relative min-h-0 flex-1" data-testid="diff-board">
        {base && target && diff ? (
          // Key by the pair so swapping either side remounts and re-fits the board.
          <SnapshotBoard
            key={`${base.id}|${target.id}`}
            model={target.model}
            diff={diff}
            changes={changes}
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-zinc-400">
            Pick a base and a target snapshot.
          </div>
        )}
      </div>

      {diff && (
        <div
          className="flex items-center gap-3 border-t border-zinc-200 bg-white px-3 py-1.5 text-xs"
          data-testid="diff-summary"
        >
          <span className="font-medium text-emerald-600">+{diff.summary.added} added</span>
          <span className="font-medium text-rose-600">−{diff.summary.removed} removed</span>
          <span className="font-medium text-amber-600">~{diff.summary.changed} changed</span>
          {diff.removedNodes.length > 0 && (
            <span className="truncate text-zinc-500" data-testid="diff-removed">
              Removed:{" "}
              {diff.removedNodes
                .map((n) => `${ELEMENT_DEFINITIONS[n.type].label} "${n.label}"`)
                .join(", ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
