import { X, ChevronRight, ChevronDown, Folder, FolderOpen, File } from "lucide-react";
import { Tree, NodeApi } from "react-arborist";
import { useSidebar } from "../../../hooks/useSidebar";

type TreeNode = {
  id: string;
  name: string;
  children?: TreeNode[];
};


function Node({ node, style }: { node: NodeApi<TreeNode>; style: React.CSSProperties }) {
  const isFolder = !!node.data.children;

  return (
    <div
      style={style}
      onClick={() => node.toggle()}
      className={`
        flex items-center gap-2 px-2 text-sm cursor-pointer select-none
        hover:bg-[#161b17]
        ${node.isSelected ? "bg-[#202621]" : ""}
      `}
    >
      {isFolder ? (
        <>
          {node.isOpen ? (
            <ChevronDown size={14} className="text-[#7b857b]" />
          ) : (
            <ChevronRight size={14} className="text-[#7b857b]" />
          )}

          {node.isOpen ? (
            <FolderOpen size={15} className="text-[#e8ff6b]" />
          ) : (
            <Folder size={15} className="text-[#e8ff6b]" />
          )}
        </>
      ) : (
        <>
          <div className="w-[14px]" />
          <File size={15} className="text-[#7b857b]" />
        </>
      )}

      <span>{node.data.name}</span>
    </div>
  );
}

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

      {/* Tree */}
      <div className="flex-1 overflow-hidden">
        <Tree<TreeNode>
          width="100%"
          height={500}
          indent={18}
          rowHeight={28}
        >
          {Node}
        </Tree>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1c211d] px-3 py-2 text-xs text-[#6b7268]">
        💡 Drag the right border to resize
      </div>
    </div>
  );
}