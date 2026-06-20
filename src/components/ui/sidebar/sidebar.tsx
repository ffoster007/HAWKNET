import { X } from "lucide-react";
import { useSidebar } from "../../../hooks/useSidebar";

export default function Sidebar() {
  const { close } = useSidebar();

  return (
    <div className="flex h-full flex-col bg-[#0b0e0c] text-[#cfd6c8]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c211d] px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#e8ff6b]">
          WorkBox
        </h2>
        <button
          onClick={close}
          className="rounded p-1 text-[#6b7268] hover:bg-[#1c211d] hover:text-[#cfd6c8] transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-sm text-[#6b7268]">
          WorkBox content goes here...
        </p>
        <p className="text-xs text-[#6b7268] mt-2 opacity-50">
          💡 Drag the right border to resize
        </p>
      </div>
    </div>
  );
}