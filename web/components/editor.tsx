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
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import { BoardChrome } from "@/components/board-chrome";
import { ElementNode, routeHandles } from "@/components/nodes/element-node";
import { PropertyPanel } from "@/components/property-panel";
import { Toolbar } from "@/components/toolbar";
import { ELEMENT_DEFINITIONS, ELEMENT_TYPES, type ElementType } from "@/lib/eventstorming/elements";
import { isValidConnection as canConnect } from "@/lib/eventstorming/relations";
import { loadModel, saveModel } from "@/lib/store/persistence";
import { useESStore } from "@/lib/store/store";

const defaultEdgeOptions = {
  markerEnd: { type: MarkerType.ArrowClosed },
  labelBgPadding: [4, 2] as [number, number],
  labelBgStyle: { fill: "#ffffff", fillOpacity: 0.85 },
};

/** Hydrate from local storage on mount, then debounce-save on every change. */
function useAutosave() {
  useEffect(() => {
    const loaded = loadModel();
    if (loaded && (loaded.nodes.length > 0 || loaded.contexts.length > 0)) {
      useESStore.getState().setModel(loaded);
    }
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = useESStore.subscribe((s) => {
      clearTimeout(timer);
      timer = setTimeout(() => saveModel(s.nodes, s.edges, s.contexts), 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

function Canvas() {
  const nodes = useESStore((s) => s.nodes);
  const edges = useESStore((s) => s.edges);
  const onNodesChange = useESStore((s) => s.onNodesChange);
  const onEdgesChange = useESStore((s) => s.onEdgesChange);
  const connect = useESStore((s) => s.connect);
  const setSelected = useESStore((s) => s.setSelected);

  useAutosave();

  const nodeTypes = useMemo<NodeTypes>(() => {
    const map: NodeTypes = {};
    for (const t of ELEMENT_TYPES) map[t] = ElementNode;
    return map;
  }, []);

  // Attach handle anchors per edge from current node positions, so the vertical
  // slice chain draws top↔bottom and timeline links left↔right.
  const routedEdges = useMemo(() => {
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    return edges.map((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      return a && b ? { ...e, ...routeHandles(a, b) } : e;
    });
  }, [nodes, edges]);

  const onConnect = useCallback((c: Connection) => void connect(c), [connect]);

  // Manual links stay possible for cross-context/ambiguous relations; the rule
  // table validates them. Element positions are never dragged.
  const isValidConnection = useCallback<IsValidConnection>(
    (c) => {
      const s = nodes.find((n) => n.id === c.source);
      const t = nodes.find((n) => n.id === c.target);
      return !!s?.type && !!t?.type && canConnect(s.type, t.type);
    },
    [nodes],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={routedEdges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={false}
            deleteKeyCode={null}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_, n) => setSelected(n.id)}
            onPaneClick={() => setSelected(null)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background />
            <MiniMap
              nodeColor={(n) => ELEMENT_DEFINITIONS[n.type as ElementType]?.color ?? "#ccc"}
            />
            <Controls />
          </ReactFlow>
          <BoardChrome />
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
