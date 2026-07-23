"use client";

import { Combine, Network, Plus, Sparkles } from "lucide-react";
import { FileMenu } from "@/components/file-menu";
import { FilterControls } from "@/components/filter-controls";
import { LEVEL_LABEL, LEVELS } from "@/lib/eventstorming/levels";
import { useESStore } from "@/lib/store/store";

export function Toolbar() {
  const level = useESStore((s) => s.level);
  const setLevel = useESStore((s) => s.setLevel);
  const discoveryActive = useESStore((s) => s.discovery.active);
  const enterDiscovery = useESStore((s) => s.enterDiscovery);
  const exitDiscovery = useESStore((s) => s.exitDiscovery);
  const converge = useESStore((s) => s.converge);
  const addDiscoveryItem = useESStore((s) => s.addDiscoveryItem);
  const contextMapOpen = useESStore((s) => s.contextMapOpen);
  const toggleContextMap = useESStore((s) => s.toggleContextMap);
  const compareActive = useESStore((s) => s.compare.active);

  // Drop a wall event in a light left→right cascade so freshly added events are
  // spatially ordered out of the box; the modeller then drags them where they want.
  const onAddDiscoveryEvent = () => {
    const n = useESStore.getState().discovery.items.length;
    addDiscoveryItem(40 + (n % 5) * 180, 40 + Math.floor(n / 5) * 120);
  };

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
      <button
        type="button"
        className={`${btn} ml-1`}
        aria-pressed={contextMapOpen}
        onClick={toggleContextMap}
      >
        <Network size={14} /> Context Map
      </button>
      {/* Discovery Mode: Big-Picture only (decision-00004). The Level control is
          how you leave — switching off Big Picture exits the mode. */}
      {level === "big-picture" && (
        <div className="ml-1 flex items-center gap-2" data-testid="discovery-controls">
          <button
            type="button"
            className={`${btn} ${discoveryActive ? "bg-amber-100 border-amber-300" : ""}`}
            aria-pressed={discoveryActive}
            onClick={() => (discoveryActive ? exitDiscovery() : enterDiscovery())}
          >
            <Sparkles size={14} /> Discover
          </button>
          {discoveryActive && (
            <>
              <button
                type="button"
                className={btn}
                aria-label="Add discovery event"
                onClick={onAddDiscoveryEvent}
              >
                <Plus size={14} /> Event
              </button>
              <button
                type="button"
                className={`${btn} bg-zinc-800 text-white hover:bg-zinc-700`}
                onClick={converge}
              >
                <Combine size={14} /> Converge
              </button>
            </>
          )}
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {/* Search + filter target the structured board; hidden in the alternate views. */}
        {!discoveryActive && !contextMapOpen && !compareActive && <FilterControls />}
        <FileMenu />
      </div>
    </header>
  );
}
