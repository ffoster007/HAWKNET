import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Plus, Minus, Maximize, Crosshair } from "lucide-react";

/**
 * HAWKNET — Analyzer
 * Infinite canvas for data visualization and analysis
 */

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "domain" | "ip" | "service" | "vulnerability";
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

export default function Analyzer() {
  // Canvas state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeIdCounter = useRef(0);

  // Zoom limits
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.1;

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new scale
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale + delta));

    // Zoom towards mouse position
    const scaleChange = newScale / scale;
    const newOffset = {
      x: mouseX - (mouseX - offset.x) * scaleChange,
      y: mouseY - (mouseY - offset.y) * scaleChange,
    };

    setScale(newScale);
    setOffset(newOffset);
  }, [scale, offset]);

  // Attach wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Handle zoom buttons
  const zoomIn = () => {
    setScale((prev) => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(1)));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(1)));
  };

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  // Handle panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with middle mouse button or space+left click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Add new node at center of viewport
  const addNode = (type: Node["type"] = "domain") => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = (rect.width / 2 - offset.x) / scale;
    const centerY = (rect.height / 2 - offset.y) / scale;

    const newNode: Node = {
      id: `node-${++nodeIdCounter.current}`,
      x: centerX + (Math.random() - 0.5) * 100,
      y: centerY + (Math.random() - 0.5) * 100,
      label: `Target ${nodeIdCounter.current}`,
      type,
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const removeSelectedNode = () => {
    if (selectedNode) {
      setNodes((prev) => prev.filter((n) => n.id !== selectedNode));
      setSelectedNode(null);
    }
  };

  // Get node color based on type
  const getNodeColor = (type: Node["type"]) => {
    switch (type) {
      case "domain":
        return {
          bg: "bg-blue-500/20",
          border: "border-blue-500/50",
          text: "text-blue-400",
          dot: "bg-blue-500",
        };
      case "ip":
        return {
          bg: "bg-green-500/20",
          border: "border-green-500/50",
          text: "text-green-400",
          dot: "bg-green-500",
        };
      case "service":
        return {
          bg: "bg-yellow-500/20",
          border: "border-yellow-500/50",
          text: "text-yellow-400",
          dot: "bg-yellow-500",
        };
      case "vulnerability":
        return {
          bg: "bg-red-500/20",
          border: "border-red-500/50",
          text: "text-red-400",
          dot: "bg-red-500",
        };
      default:
        return {
          bg: "bg-gray-500/20",
          border: "border-gray-500/50",
          text: "text-gray-400",
          dot: "bg-gray-500",
        };
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0e0c]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#1c211d] px-4 py-2">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-[#e8ff6b]" />
          <h1 className="text-sm font-semibold text-[#cfd6c8]">
            Network Analyzer
          </h1>
          <span className="text-xs text-[#6b7268] ml-2">
            {nodes.length} nodes
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add node button */}
          <div className="flex items-center rounded-md border border-[#1c211d] overflow-hidden">
            <button
              onClick={() => addNode("domain")}
              className="px-3 py-1.5 text-xs text-[#cfd6c8] hover:bg-[#1c211d] transition-colors border-r border-[#1c211d] cursor-pointer"
              title="Add Domain Node"
            >
              + Domain
            </button>
            <button
              onClick={() => addNode("ip")}
              className="px-3 py-1.5 text-xs text-[#cfd6c8] hover:bg-[#1c211d] transition-colors border-r border-[#1c211d] cursor-pointer"
              title="Add IP Node"
            >
              + IP
            </button>
            <button
              onClick={() => addNode("service")}
              className="px-3 py-1.5 text-xs text-[#cfd6c8] hover:bg-[#1c211d] transition-colors cursor-pointer"
              title="Add Service Node"
            >
              + Service
            </button>
          </div>

          {/* Remove node button */}
          <button
            onClick={removeSelectedNode}
            disabled={!selectedNode}
            className="flex items-center gap-1 rounded-md border border-[#1c211d] px-3 py-1.5 text-xs text-[#cfd6c8] hover:bg-[#1c211d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Remove Selected Node"
          >
            <Minus size={14} />
            Remove
          </button>

          <div className="w-px h-6 bg-[#1c211d]" />

          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            disabled={scale <= MIN_ZOOM}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <button
            onClick={resetZoom}
            className="rounded-md border border-[#1c211d] px-2 py-1 text-xs text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors min-w-[48px] cursor-pointer"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            disabled={scale >= MAX_ZOOM}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={resetZoom}
            className="rounded-md border border-[#1c211d] p-1.5 text-[#6b7268] hover:text-[#cfd6c8] hover:bg-[#1c211d] transition-colors cursor-pointer"
            title="Fit to Screen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-[#0a0d09]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        {/* Grid Background */}
        <div
          ref={canvasRef}
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            backgroundImage: `
              radial-gradient(circle, #1c211d 1px, transparent 1px)
            `,
            backgroundSize: `${50 * scale}px ${50 * scale}px`,
          }}
        >
          {/* Connections (lines) */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
            {connections.map((conn) => {
              const fromNode = nodes.find((n) => n.id === conn.from);
              const toNode = nodes.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={conn.id}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#2a3029"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const colors = getNodeColor(node.type);
            const isSelected = selectedNode === node.id;

            return (
              <div
                key={node.id}
                className={`absolute rounded-lg border ${colors.bg} ${colors.border} ${
                  isSelected ? "ring-2 ring-[#e8ff6b] shadow-lg shadow-[#e8ff6b]/20" : ""
                } px-4 py-3 cursor-pointer hover:shadow-lg transition-all min-w-[120px]`}
                style={{
                  left: node.x,
                  top: node.y,
                  transform: "translate(-50%, -50%)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node.id);
                }}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {node.label}
                  </span>
                </div>
                <div className="mt-1 text-xs text-[#6b7268] uppercase">
                  {node.type}
                </div>
              </div>
            );
          })}

          {/* Origin Crosshair */}
          <div className="absolute left-0 top-0 pointer-events-none">
            <div className="absolute w-4 h-px bg-[#1c211d]" style={{ left: -8, top: 0 }} />
            <div className="absolute h-4 w-px bg-[#1c211d]" style={{ left: 0, top: -8 }} />
          </div>
        </div>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Crosshair className="mx-auto mb-4 h-12 w-12 text-[#1c211d]" />
              <h3 className="mb-2 text-lg font-medium text-[#4a5148]">
                Infinite Canvas
              </h3>
              <p className="text-sm text-[#3a4038]">
                Add nodes to start mapping your network
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[#4a5148]">
                <span>🖱️ Scroll to zoom</span>
                <span>🖱️ Alt + Drag to pan</span>
                <span>🖱️ Middle click to pan</span>
              </div>
            </div>
          </div>
        )}

        {/* Mini Instructions Overlay */}
        {nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-3 text-xs text-[#4a5148] bg-[#0b0e0c]/80 backdrop-blur-sm rounded-md border border-[#1c211d] px-3 py-2">
            <span>🖱️ Scroll: Zoom</span>
            <span className="text-[#2a3029]">|</span>
            <span>🖱️ Alt+Drag: Pan</span>
            <span className="text-[#2a3029]">|</span>
            <span>🖱️ Click: Select</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t border-[#1c211d] px-4 py-1.5 text-xs text-[#6b7268]">
        <div className="flex items-center gap-4">
          <span>Scale: {Math.round(scale * 100)}%</span>
          <span>Nodes: {nodes.length}</span>
          <span>Connections: {connections.length}</span>
        </div>
        <div className="flex items-center gap-4">
          {selectedNode && (
            <span className="text-[#e8ff6b]">
              Selected: {nodes.find((n) => n.id === selectedNode)?.label}
            </span>
          )}
          <span>
            Offset: ({Math.round(offset.x)}, {Math.round(offset.y)})
          </span>
        </div>
      </div>
    </div>
  );
}