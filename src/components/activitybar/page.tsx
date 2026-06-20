import { useState } from "react";
import {
  Layers,
  Webhook,
  Terminal,
  Settings,
  Plug,
  Box,
} from "lucide-react";

/**
 * HAWKNET — ActivityBar
 * Vertical icon rail, VS-Code-style. Template only: wire up real
 * view-switching / routing logic where marked below.
 *
 * Palette (matches existing egui UI):
 *   bg      #0b0e0c  near-black
 *   accent  #e8ff6b  acid green
 *   muted   #6b7268  inactive icon
 */

export type ActivityId =
  | "recon"
  | "box"
  | "analyzer"
  | "terminal";

interface ActivityItem {
  id: ActivityId;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const PRIMARY_ITEMS: ActivityItem[] = [
  { id: "recon", label: "Workspace", icon: Layers },
  { id: "box", label: "WorkBox", icon: Box },
  { id: "analyzer", label: "Analyzer", icon: Webhook },
  { id: "terminal", label: "Terminal", icon: Terminal },
];

interface ActivityBarProps {
  active?: ActivityId;
  onSelect?: (id: ActivityId) => void;
  isTerminalOpen?: boolean;
}

export default function ActivityBar({
  active = "recon",
  onSelect,
  isTerminalOpen = false,
}: ActivityBarProps) {
  const [hoveredId, setHoveredId] = useState<ActivityId | null>(null);

  function handleSelect(id: ActivityId) {
    onSelect?.(id);
  }

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-12 flex-col items-center justify-between border-r border-[#1c211d] bg-[#0b0e0c] py-3"
    >
      {/* top: primary views */}
      <ul className="flex flex-col items-center gap-1">
        {PRIMARY_ITEMS.map(({ id, label, icon: Icon }) => {
          // Terminal ใช้ isTerminalOpen แทน active สำหรับการเช็คสถานะ
          const isActive = id === "terminal" ? isTerminalOpen : active === id;
          const isHovered = hoveredId === id;

          return (
            <li key={id} className="relative">
              <button
                type="button"
                aria-label={label}
                aria-current={id !== "terminal" && isActive ? "page" : undefined}
                aria-pressed={id === "terminal" ? isTerminalOpen : undefined}
                onClick={() => handleSelect(id)}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                className={[
                  "group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors cursor-pointer",
                  isActive
                    ? "text-[#e8ff6b]"
                    : "text-[#6b7268] hover:text-[#cfd6c8]",
                ].join(" ")}
              >
                {/* active indicator bar */}
                <span
                  className={[
                    "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-100",
                    isActive ? "opacity-100" : "opacity-0",
                  ].join(" ")}
                />
                <Icon size={20} strokeWidth={1.75} />
              </button>

              {/* tooltip */}
              {isHovered && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-[#1c211d] bg-[#11150f] px-2 py-1 text-xs font-medium text-[#e8ff6b] shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                >
                  {label}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* bottom: secondary actions */}
      <ul className="flex flex-col items-center gap-1">
        {[
          { id: "connections" as const, label: "Connections", icon: Plug },
          { id: "settings" as const, label: "Settings", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <li key={id} className="relative">
            <button
              type="button"
              aria-label={label}
              onMouseEnter={() => setHoveredId(id as ActivityId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => {
                // TODO: open settings / connections panel
              }}
              className="flex h-10 w-10 items-center justify-center rounded-md text-[#6b7268] transition-colors duration-100 hover:text-[#cfd6c8] cursor-pointer"
            >
              <Icon size={20} strokeWidth={1.75} />
            </button>

            {hoveredId === id && (
              <div
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-[#1c211d] bg-[#11150f] px-2 py-1 text-xs font-medium text-[#e8ff6b] shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
              >
                {label}
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}