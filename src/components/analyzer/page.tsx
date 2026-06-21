// src/components/analyzer/page.tsx
import { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Crosshair, Loader2, Maximize, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useAnalyzer } from "../../context/AnalyzerContext";
import { nodeTypes } from "../workspace/nodes";

/**
 * HAWKNET — Analyzer
 * ใช้ React Flow เดียวกับ Workspace สำหรับแสดงผลกราฟ
 */

export default function Analyzer() {
  const { nodes: analyzerNodes, edges: analyzerEdges, isLoading, clearData } = useAnalyzer();
  
  // ── React Flow state ─────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isReady, setIsReady] = useState(false);

  // ── แปลงข้อมูลจาก Analyzer Context → React Flow ──────────────────────
  useEffect(() => {
    if (analyzerNodes.length === 0 && analyzerEdges.length === 0) {
      setNodes([]);
      setEdges([]);
      setIsReady(false);
      return;
    }

    const flowNodes: Node[] = analyzerNodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: { x: n.x, y: n.y },
      data: n.data || { label: n.label },
    }));

    const flowEdges: Edge[] = analyzerEdges.map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      label: e.label || undefined,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#2a3029", strokeWidth: 1.5 },
      labelStyle: { fontSize: 10, fill: "#6b7268" },
      labelBgStyle: { fill: "#0b0e0c" },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
    setIsReady(true);
  }, [analyzerNodes, analyzerEdges, setNodes, setEdges]);

  // ── Zoom controls ──────────────────────────────────────────────────────
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const zoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 200 });
    }
  }, [reactFlowInstance]);

  const fitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.15, duration: 300 });
    }
  }, [reactFlowInstance]);

  const resetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
    }
  }, [reactFlowInstance]);

  const hasGraph = nodes.length > 0;

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0e0c]">
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[#1c211d] px-4 py-2">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-[#e8ff6b]" />
          <h1 className="text-sm font-semibold text-[#cfd6c8]">
            Network Analyzer
          </h1>
          <span className="text-xs text-[#6b7268] ml-2">
            {isLoading ? "Loading..." : `${nodes.length} nodes · ${edges.length} edges`}
          </span>
          {isLoading && <Loader2 size={14} className="text-[#e8ff6b] animate-spin" />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearData}
            disabled={nodes.length === 0}
            className="flex items-center gap-1 rounded-md border border-[#1c211d] px-3 py-1.5 text-xs text-[#cfd6c8] hover:bg-[#1c211d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw size={14} />
            Clear All
          </button>

          <div className="w-px h-6 bg-[#1c211d]" />

          <button
            onClick={zoomOut}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={resetView}
            className="rounded-md border border-[#1c211d] px-2 py-1 text-xs text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors min-w-[48px] cursor-pointer"
            title="Reset View"
          >
            100%
          </button>

          <button
            onClick={zoomIn}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={fitView}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors cursor-pointer"
            title="Fit to Screen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* ── React Flow Canvas ──────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative">
        {!isLoading && !hasGraph ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Crosshair className="h-14 w-14 text-[#1c211d]" />
            <p className="text-sm text-[#4a5148]">
              Run a scan in Workspace to see results here
            </p>
            <p className="text-xs text-[#3a4038]">
              Results will appear automatically as an interactive graph
            </p>
          </div>
        ) : isLoading && !hasGraph ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 text-[#e8ff6b] animate-spin" />
            <p className="text-sm text-[#6b7268]">Scanning in progress...</p>
            <p className="text-xs text-[#4a5148]">
              Results will appear here automatically
            </p>
          </div>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.1}
              maxZoom={3}
              proOptions={{ hideAttribution: true }}
              style={{ background: "#0b0e0c" }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="#1c211d"
                gap={20}
                size={1}
              />
              
              {/* ✅ ใช้ className + style override */}
              <Controls
                position="bottom-left"
                className="[&>button]:!bg-[#11150f] [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-[#1c211d] [&>button]:!text-[#9ba39a] [&>button:hover]:!bg-[#1c211d] [&>button:hover]:!text-[#e8ff6b] [&>button:last-child]:!border-b-0 [&>button>svg]:!fill-[#9ba39a] [&>button>svg]:!stroke-[#9ba39a] [&>button:hover>svg]:!fill-[#e8ff6b] [&>button:hover>svg]:!stroke-[#e8ff6b] [&>button]:!w-8 [&>button]:!h-8 [&>button]:!flex [&>button]:!items-center [&>button]:!justify-center"
                style={{
                  background: "#11150f",
                  border: "1px solid #1c211d",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
                  overflow: "hidden",
                }}
              />
              
              <MiniMap
                position="bottom-right"
                className="!bg-[#11150f] !border !border-[#1c211d] !rounded-lg"
                style={{
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.6)",
                }}
                nodeColor={(n) => {
                  const sev = (n.data as any)?.severity ?? "";
                  if (sev === "CRITICAL") return "#ef4444";
                  if (sev === "HIGH") return "#fb923c";
                  if (sev === "MEDIUM") return "#facc15";
                  if (sev === "LOW") return "#60a5fa";
                  if (n.type === "target") return "#e8ff6b";
                  return "#2a3029";
                }}
                maskColor="rgba(11, 14, 12, 0.7)"
                nodeStrokeWidth={1}
                nodeStrokeColor="#2a3029"
              />
            </ReactFlow>
          </>
        )}
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-[#1c211d] px-4 py-1.5 text-xs text-[#6b7268]">
        <div className="flex items-center gap-4">
          <span>Nodes: {nodes.length}</span>
          <span>Edges: {edges.length}</span>
          {isLoading && (
            <span className="text-[#e8ff6b] flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" />
              Scanning...
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#4a5148]">
            🖱️ Scroll to zoom · Drag to pan · Click to select
          </span>
        </div>
      </div>
    </div>
  );
}