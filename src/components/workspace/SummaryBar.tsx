import type { Summary } from "../../lib/tauriApi";

interface Props {
  summary: Summary;
  aiEnhanced: boolean;
  target: string;
}

interface StatPill {
  label: string;
  value: number;
  color: string;
}

export default function SummaryBar({ summary, aiEnhanced, target }: Props) {
  const pills: StatPill[] = [
    { label: "Critical", value: summary.critical,    color: "text-red-400 bg-red-500/10" },
    { label: "High",     value: summary.high,        color: "text-orange-400 bg-orange-400/10" },
    { label: "Medium",   value: summary.medium,      color: "text-yellow-400 bg-yellow-400/10" },
    { label: "Low",      value: summary.low,         color: "text-blue-400 bg-blue-400/10" },
    { label: "KEV",      value: summary.kev_count,   color: "text-red-300 bg-red-500/20" },
    { label: "Ports",    value: summary.open_ports,  color: "text-[#9ba39a] bg-[#1c211d]" },
    { label: "Subdoms",  value: summary.subdomains,  color: "text-[#9ba39a] bg-[#1c211d]" },
    { label: "Paths",    value: summary.attack_paths,color: "text-purple-400 bg-purple-500/10" },
  ];

  return (
    <div className="flex items-center gap-3 border-b border-[#1c211d] bg-[#0b0e0c] px-4 py-2.5 flex-wrap">
      {/* Target */}
      <span className="font-mono text-sm text-[#e8ff6b] mr-1">{target}</span>

      <span className="text-[#2a3029]">|</span>

      {/* Stat pills — only show non-zero */}
      {pills.map((p) =>
        p.value > 0 ? (
          <span
            key={p.label}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${p.color}`}
          >
            {p.label} {p.value}
          </span>
        ) : null
      )}

      {/* AI badge */}
      {aiEnhanced && (
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">
          AI enhanced
        </span>
      )}
    </div>
  );
}