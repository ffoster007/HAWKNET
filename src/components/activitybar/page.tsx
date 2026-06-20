import { useState } from "react";
import {
  Layers,
  Webhook,
  Terminal,
  Settings,
  Plug,
  Box,
} from "lucide-react";

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
  isSidebarOpen?: boolean;
}

export default function ActivityBar({
  active = "recon",
  onSelect,
  isTerminalOpen = false,
  isSidebarOpen = false,
}: ActivityBarProps) {
  const [hoveredId, setHoveredId] = useState<ActivityId | null>(null);

  function handleSelect(id: ActivityId) {
    onSelect?.(id);
  }

  function isItemActive(id: ActivityId): boolean {
    if (id === "terminal") return isTerminalOpen;
    if (id === "box") return isSidebarOpen;
    return active === id;
  }

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-12 flex-col items-center justify-between border-r border-[#1c211d] bg-[#0b0e0c] py-3"
    >
      {/* top: primary views */}
      <ul className="flex flex-col items-center gap-1">
        {PRIMARY_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = isItemActive(id);
          const isHovered = hoveredId === id;

          return (
            <li key={id} className="relative">
              <button
                type="button"
                aria-label={label}
                aria-current={id !== "terminal" && id !== "box" && isActive ? "page" : undefined}
                aria-pressed={id === "terminal" || id === "box" ? isActive : undefined}
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