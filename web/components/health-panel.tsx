"use client";

import { useReactFlow } from "@xyflow/react";
import { CircleCheck, X } from "lucide-react";
import { useMemo } from "react";
import { analyzeModel, type Severity } from "@/lib/analysis/health";
import { useESStore } from "@/lib/store/store";

const DOT: Record<Severity, string> = {
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

/** Model-health panel (spec-00007): advisory findings derived from the model.
 *  Selecting a finding selects and frames the element(s) it concerns. Purely
 *  advisory — it never blocks editing. */
export function HealthPanel() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const setSelected = useESStore((s) => s.setSelected);
  const toggleHealth = useESStore((s) => s.toggleHealth);
  const { fitView } = useReactFlow();

  // Findings are a pure function of the model, recomputed whenever it changes.
  const findings = useMemo(() => analyzeModel(nodes, edges), [nodes, edges]);

  const focus = (ids: string[]) => {
    if (ids.length === 0) return;
    setSelected(ids[0]);
    void fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, duration: 300, maxZoom: 1.5 });
  };

  return (
    <div
      className="absolute left-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] w-72 flex-col rounded-lg border border-zinc-200 bg-white shadow-lg"
      data-testid="health-panel"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <span className="text-sm font-semibold text-zinc-800">Model health</span>
        <button
          type="button"
          className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Close model health"
          onClick={toggleHealth}
        >
          <X size={15} />
        </button>
      </div>

      {findings.length === 0 ? (
        <div
          className="flex items-center gap-2 px-3 py-4 text-xs text-zinc-500"
          data-testid="health-empty"
        >
          <CircleCheck size={15} className="text-emerald-500" />
          No issues found.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {findings.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-100"
                data-testid="health-finding"
                onClick={() => focus(f.elementIds)}
              >
                <span className={`mt-1 size-2 shrink-0 rounded-full ${DOT[f.severity]}`} />
                <span>{f.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
