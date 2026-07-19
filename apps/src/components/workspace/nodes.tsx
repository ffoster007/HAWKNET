// src/components/workspace/nodes.tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shield, Globe, Server, GitBranch, Crosshair } from "lucide-react";
import type { NodeData } from "../../lib/tauriApi";

// ── Severity colour map ───────────────────────────────────────────────────────

const SEVERITY_RING: Record<string, string> = {
  CRITICAL: "ring-red-500 bg-red-500/10",
  HIGH:     "ring-orange-400 bg-orange-400/10",
  MEDIUM:   "ring-yellow-400 bg-yellow-400/10",
  LOW:      "ring-blue-400 bg-blue-400/10",
  "":       "ring-[#2a3029] bg-[#11150f]",
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400",
  HIGH:     "bg-orange-400/20 text-orange-400",
  MEDIUM:   "bg-yellow-400/20 text-yellow-400",
  LOW:      "bg-blue-400/20 text-blue-400",
};

// ── Base card ─────────────────────────────────────────────────────────────────

function NodeCard({
  ring,
  children,
  sourceHandle = true,
  targetHandle = true,
}: {
  ring: string;
  children: React.ReactNode;
  sourceHandle?: boolean;
  targetHandle?: boolean;
}) {
  return (
    <div
      className={`relative min-w-[180px] max-w-[260px] rounded-lg border ring-1 px-3 py-2.5 shadow-lg shadow-black/40 ${ring}`}
    >
      {targetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-[#e8ff6b] !w-2 !h-2 !border-0"
        />
      )}
      {children}
      {sourceHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-[#e8ff6b] !w-2 !h-2 !border-0"
        />
      )}
    </div>
  );
}

// ── Target node (root) ────────────────────────────────────────────────────────

export const TargetNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as NodeData;
  return (
    <NodeCard ring="ring-[#e8ff6b] bg-[#e8ff6b]/5" targetHandle={false}>
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-[#e8ff6b] shrink-0" />
        <span className="font-mono text-sm font-semibold text-[#e8ff6b]">
          {d.label}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-[#6b7268] uppercase tracking-wider">
        {d.source}
      </div>
    </NodeCard>
  );
});
TargetNode.displayName = "TargetNode";

// ── Vuln node ─────────────────────────────────────────────────────────────────

export const VulnNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as NodeData;
  const sev = (d.severity ?? "").toUpperCase();
  const ring = SEVERITY_RING[sev] ?? SEVERITY_RING[""];
  const badge = SEVERITY_BADGE[sev];

  return (
    <NodeCard ring={ring}>
      <div className="flex items-start gap-2">
        <Shield size={14} className="text-[#9ba39a] shrink-0 mt-0.5" />
        <div className="min-w-0">
          {d.cve_id && (
            <div className="font-mono text-[10px] text-[#e8ff6b] mb-0.5">
              {d.cve_id}
            </div>
          )}
          <div className="text-xs text-[#cfd6c8] leading-tight line-clamp-3">
            {d.label}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {sev && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${badge}`}>
            {sev}
          </span>
        )}
        {(d.cvss_score ?? 0) > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c211d] text-[#9ba39a]">
            CVSS {d.cvss_score?.toFixed(1)}
          </span>
        )}
        {(d.epss_score ?? 0) > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1c211d] text-[#9ba39a]">
            EPSS {((d.epss_score ?? 0) * 100).toFixed(1)}%
          </span>
        )}
        {d.in_cisa_kev && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">
            KEV ⚠
          </span>
        )}
        {d.ai_enhanced && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
            AI
          </span>
        )}
      </div>
    </NodeCard>
  );
});
VulnNode.displayName = "VulnNode";

// ── Service node (open port) ──────────────────────────────────────────────────

export const ServiceNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as NodeData;
  return (
    <NodeCard ring="ring-[#2a3029] bg-[#11150f]">
      <div className="flex items-center gap-2">
        <Server size={14} className="text-[#6b7268] shrink-0" />
        <span className="font-mono text-xs text-[#cfd6c8]">{d.label}</span>
      </div>
      {d.source && (
        <div className="mt-1 text-[9px] text-[#4a5148]">{d.source}</div>
      )}
    </NodeCard>
  );
});
ServiceNode.displayName = "ServiceNode";

// ── Subdomain node ────────────────────────────────────────────────────────────

export const SubdomainNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as NodeData;
  return (
    <NodeCard ring="ring-[#2a3029] bg-[#0d110d]">
      <div className="flex items-center gap-2">
        <Crosshair size={13} className="text-[#6b7268] shrink-0" />
        <span className="font-mono text-[11px] text-[#9ba39a] break-all">
          {d.label}
        </span>
      </div>
    </NodeCard>
  );
});
SubdomainNode.displayName = "SubdomainNode";

// ── Pattern node (attack path possibility) ────────────────────────────────────

export const PatternNode = memo(({ data }: NodeProps) => {
  const d = data as unknown as NodeData;
  return (
    <NodeCard ring="ring-[#2a3029]/60 bg-[#0b0e0c]" sourceHandle={false}>
      <div className="flex items-center gap-2">
        <GitBranch size={13} className="text-[#4a5148] shrink-0" />
        <span className="text-[11px] text-[#6b7268] italic">{d.label}</span>
      </div>
    </NodeCard>
  );
});
PatternNode.displayName = "PatternNode";

// ── nodeTypes map for React Flow ──────────────────────────────────────────────

export const nodeTypes = {
  target:    TargetNode,
  vuln:      VulnNode,
  service:   ServiceNode,
  subdomain: SubdomainNode,
  pattern:   PatternNode,
};