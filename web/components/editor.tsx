"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Connection,
  Controls,
  type IsValidConnection,
  MarkerType,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { ElementNode } from "@/components/nodes/element-node";
import { ELEMENT_DND_MIME, Palette } from "@/components/palette";
import { PropertyPanel } from "@/components/property-panel";
import { Toolbar } from "@/components/toolbar";
import {
  ELEMENT_DEFINITIONS,
  ELEMENT_TYPES,
  type ElementType,
} from "@/lib/eventstorming/elements";
import { isValidConnection as canConnect } from "@/lib/eventstorming/relations";
import { loadModel, saveModel } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";

/** Hydrate from local storage on mount, then debounce-save on every change. */
function useAutosave() {
  useEffect(() => {
    const loaded = loadModel();
    if (loaded && (loaded.nodes.length > 0 || loaded.edges.length > 0)) {
      useESStore.getState().setModel(loaded);
    }
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = useESStore.subscribe((s) => {
      clearTimeout(timer);
      timer = setTimeout(() => saveModel(s.nodes, s.edges), 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  labelBgPadding: [4, 2] as [number, number],
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
};

function Canvas() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const onNodesChange = useESStore((s) => s.onNodesChange);
  const onEdgesChange = useESStore((s) => s.onEdgesChange);
  const connect = useESStore((s) => s.connect);
  const addNode = useESStore((s) => s.addNode);
  const setSelected = useESStore((s) => s.setSelected);
  const { screenToFlowPosition } = useReactFlow();

  useAutosave();

  const nodeTypes = useMemo<NodeTypes>(() => {
    const map: NodeTypes = {};
    for (const t of ELEMENT_TYPES) map[t] = ElementNode;
    return map;
  }, []);

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

  // Live feedback: React Flow refuses the drop (invalid styling) when no rule
  // matches the source/target element types.
  const isValidConnection = useCallback<IsValidConnection>(
    (c) => {
      const s = nodes.find((n) => n.id === c.source);
      const t = nodes.find((n) => n.id === c.target);
      return !!s?.type && !!t?.type && canConnect(s.type, t.type);
    },
    [nodes],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData(ELEMENT_DND_MIME) as ElementType;
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <Palette />
        <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, n) => setSelected(n.id)}
            onPaneClick={() => setSelected(null)}
            fitView
          >
            <Background />
            <MiniMap
              nodeColor={(n) => ELEMENT_DEFINITIONS[n.type as ElementType]?.color ?? "#ccc"}
            />
            <Controls />
          </ReactFlow>
        </div>
        <PropertyPanel />
      </div>
    </div>
  );
}

export function Editor() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
