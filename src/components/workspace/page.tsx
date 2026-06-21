// src/components/workspace/page.tsx
import { useState, useCallback, useEffect, useRef } from "react";
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

import { Search, Globe, Server, X, Loader2, AlertTriangle } from "lucide-react";
import Warning from "../popup/warning";
import SummaryBar from "./SummaryBar";
import { nodeTypes } from "./nodes";
import {
  submitScan,
  getJob,
  type Job,
  type TargetType,
  type VulnGraph,
  type GraphNode,
  type GraphEdge,
} from "../../lib/tauriApi";

// ── Polling interval (ms) ─────────────────────────────────────────────────────
const POLL_MS = 1500;

// ── Convert VulnGraph → React Flow nodes/edges ────────────────────────────────
function toFlowElements(g: VulnGraph): { nodes: Node[]; edges: Edge[] } {
  // ✅ แปลง GraphNode → React Flow Node
  const nodes: Node[] = g.nodes.map((n: GraphNode) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    // ✅ ใช้ type assertion เพื่อแปลง NodeData → Record<string, unknown>
    data: n.data as unknown as Record<string, unknown>,
  }));
  
  const edges: Edge[] = g.edges.map((e: GraphEdge) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    type: e.type || "smoothstep",
    animated: e.animated,
    style: { stroke: "#2a3029", strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: "#6b7268" },
    labelBgStyle: { fill: "#0b0e0c" },
  }));
  
  return { nodes, edges };
}

export default function Workspace() {
  // ── Scan form state ──────────────────────────────────────────────────────
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("domain");
  const [error, setError] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  // ── Job polling state ────────────────────────────────────────────────────
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [scanning, setScanning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── React Flow state ─────────────────────────────────────────────────────
  // ✅ ใช้ generics ให้ถูกต้อง: useNodesState<Node[]>() 
  // แต่จริงๆแล้ว useNodesState รับ generic เป็นประเภทของ Node
  // และคืนค่า [Node[], (nodes: Node[]) => void]
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ── Poll active job ──────────────────────────────────────────────────────
  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const job = await getJob(jobId);
        if (!job) return;
        setActiveJob(job);

        if (job.status === "done" && job.graph) {
          setScanning(false);
          clearInterval(pollRef.current!);
          const { nodes: n, edges: e } = toFlowElements(job.graph);
          // ✅ setNodes รับ Node[] โดยตรง
          setNodes(n);
          setEdges(e);
        } else if (job.status === "failed") {
          setScanning(false);
          clearInterval(pollRef.current!);
        }
      } catch (err) {
        console.error("Poll error:", err);
        setScanning(false);
        clearInterval(pollRef.current!);
      }
    }, POLL_MS);
  }, [setNodes, setEdges]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Form submit ──────────────────────────────────────────────────────────
  const validate = (v: string, t: TargetType) => {
    if (!v.trim()) return "Target cannot be empty";
    if (t === "ip") {
      const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4.test(v) || v.split(".").some((p) => parseInt(p) > 255))
        return "Enter a valid IPv4 address";
    } else {
      if (!/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(v))
        return "Enter a valid domain (e.g. example.com)";
    }
    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(target, targetType);
    if (err) { 
      setError(err); 
      return; 
    }
    setError("");
    setShowWarning(true);
  };

  const handleConfirm = async () => {
    setShowWarning(false);
    setScanning(true);
    setActiveJob(null);
    // ✅ clear nodes และ edges
    setNodes([]);
    setEdges([]);

    try {
      const jobId = await submitScan(target.trim(), targetType);
      startPolling(jobId);
    } catch (err) {
      console.error("Submit error:", err);
      setScanning(false);
      setError(String(err));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const hasGraph = nodes.length > 0;
  const summary = activeJob?.graph?.summary;

  return (
    <>
      <div className="flex h-full w-full flex-col bg-[#0b0e0c]">

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div className="border-b border-[#1c211d] px-6 py-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            {/* Type toggle */}
            <div className="flex gap-1 shrink-0">
              {(["domain", "ip"] as TargetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTargetType(t); setError(""); }}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    targetType === t
                      ? "bg-[#e8ff6b] text-[#0b0e0c]"
                      : "bg-[#1c211d] text-[#6b7268] hover:text-[#cfd6c8]"
                  }`}
                >
                  {t === "domain" ? <Globe size={13} /> : <Server size={13} />}
                  {t === "domain" ? "Domain" : "IP"}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5148]"
              />
              <input
                type="text"
                value={target}
                onChange={(e) => { setTarget(e.target.value); setError(""); }}
                placeholder={targetType === "domain" ? "e.g. example.com" : "e.g. 93.184.216.34"}
                disabled={scanning}
                className="w-full rounded-md border border-[#1c211d] bg-[#11150f] pl-9 pr-4 py-2 text-sm text-[#cfd6c8] placeholder:text-[#4a5148] outline-none focus:border-[#e8ff6b] transition-colors disabled:opacity-50"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={scanning}
              className="shrink-0 flex items-center gap-2 rounded-md bg-[#e8ff6b] px-5 py-2 text-sm font-semibold text-[#0b0e0c] hover:bg-[#d4f04a] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {scanning && <Loader2 size={14} className="animate-spin" />}
              {scanning ? "Scanning…" : "Scan"}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
              <X size={13} /> {error}
            </div>
          )}

          {/* Active job status */}
          {activeJob && activeJob.status !== "done" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-[#6b7268]">
              {activeJob.status === "running" && (
                <Loader2 size={11} className="animate-spin text-[#e8ff6b]" />
              )}
              <span className="capitalize">{activeJob.status}</span>
              <span className="text-[#2a3029]">·</span>
              <span className="font-mono text-[10px]">{activeJob.id.slice(0, 8)}</span>
            </div>
          )}

          {/* Failed job errors */}
          {activeJob?.status === "failed" && activeJob.errors.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-xs text-red-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{activeJob.errors[0]}</span>
            </div>
          )}
        </div>

        {/* ── Summary bar (only when graph is ready) ────────────────────── */}
        {hasGraph && summary && activeJob?.graph && (
          <SummaryBar
            summary={summary}
            aiEnhanced={activeJob.graph.ai_enhanced}
            target={activeJob.target.value}
          />
        )}

        {/* ── React Flow canvas ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {!hasGraph && !scanning ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Search className="h-14 w-14 text-[#1c211d]" />
              <p className="text-sm text-[#4a5148]">
                Enter a target above to start scanning
              </p>
            </div>
          ) : scanning && nodes.length === 0 ? (
            /* Loading state */
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-[#e8ff6b] animate-spin" />
              <p className="text-sm text-[#6b7268]">Scanning {target}…</p>
              <p className="text-xs text-[#4a5148]">
                DNS · Ports · Fingerprint · CVE lookup
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              minZoom={0.15}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              style={{ background: "#0b0e0c" }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="#1c211d"
                gap={20}
                size={1}
              />
              <Controls
                style={{
                  background: "#11150f",
                  border: "1px solid #1c211d",
                  borderRadius: 8,
                }}
              />
              <MiniMap
                style={{
                  background: "#11150f",
                  border: "1px solid #1c211d",
                }}
                nodeColor={(n) => {
                  const sev = (n.data as any)?.severity ?? "";
                  if (sev === "CRITICAL") return "#ef4444";
                  if (sev === "HIGH")     return "#fb923c";
                  if (sev === "MEDIUM")   return "#facc15";
                  if (sev === "LOW")      return "#60a5fa";
                  if (n.type === "target") return "#e8ff6b";
                  return "#2a3029";
                }}
                maskColor="rgba(0,0,0,0.5)"
              />
            </ReactFlow>
          )}
        </div>
      </div>

      {/* Warning popup */}
      {showWarning && (
        <Warning
          target={target.trim()}
          targetType={targetType}
          onConfirm={handleConfirm}
          onCancel={() => setShowWarning(false)}
        />
      )}
    </>
  );
}