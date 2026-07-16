"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  type Connection,
  Controls,
  MiniMap,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import type { DragEvent } from "react";
import { useCallback, useMemo } from "react";
import { ElementNode } from "@/components/nodes/element-node";
import { ELEMENT_DND_MIME, Palette } from "@/components/palette";
import {
  ELEMENT_DEFINITIONS,
  ELEMENT_TYPES,
  type ElementType,
} from "@/lib/eventstorming/elements";
import { useESStore } from "@/lib/store/store";

function Canvas() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const onNodesChange = useESStore((s) => s.onNodesChange);
  const onEdgesChange = useESStore((s) => s.onEdgesChange);
  const connect = useESStore((s) => s.connect);
  const addNode = useESStore((s) => s.addNode);
  const setSelected = useESStore((s) => s.setSelected);
  const { screenToFlowPosition } = useReactFlow();

  const nodeTypes = useMemo<NodeTypes>(() => {
    const map: NodeTypes = {};
    for (const t of ELEMENT_TYPES) map[t] = ElementNode;
    return map;
  }, []);

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

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
    <div className="flex min-h-0 flex-1">
      <Palette />
      <div className="flex-1" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
