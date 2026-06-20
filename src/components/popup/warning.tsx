import { AlertTriangle, Shield, Radio, Globe, X } from "lucide-react";

/**
 * HAWKNET — Warning Popup
 * Legal & safety disclaimer before scanning
 */

interface WarningProps {
  target: string;
  targetType: "domain" | "ip";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Warning({
  target,
  targetType,
  onConfirm,
  onCancel,
}: WarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-lg border border-[#1c211d] bg-[#11150f] shadow-2xl shadow-black/50">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1c211d] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-semibold text-[#cfd6c8]">
                Legal Warning
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="rounded-md p-1 text-[#6b7268] hover:bg-[#1c211d] hover:text-[#cfd6c8] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Target Info */}
            <div className="mb-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-500/70">
                Target Information
              </div>
              <div className="flex items-center gap-2 text-sm">
                {targetType === "domain" ? (
                  <Globe size={14} className="text-[#6b7268]" />
                ) : (
                  <Radio size={14} className="text-[#6b7268]" />
                )}
                <span className="font-mono text-[#e8ff6b]">{target}</span>
                <span className="rounded bg-[#1c211d] px-1.5 py-0.5 text-xs text-[#6b7268]">
                  {targetType === "domain" ? "DOMAIN" : "IP"}
                </span>
              </div>
            </div>

            {/* Warning Points */}
            <div className="space-y-3 mb-5">
              <div className="flex gap-3">
                <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-sm leading-relaxed text-[#9ba39a]">
                  You must have <span className="font-semibold text-red-400">explicit authorization</span> to scan this target. 
                  Unauthorized scanning may violate laws and regulations.
                </p>
              </div>

              <div className="flex gap-3">
                <Radio className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                <p className="text-sm leading-relaxed text-[#9ba39a]">
                  Network scanning can trigger <span className="font-semibold text-yellow-500">alerts and defensive measures</span>. 
                  Ensure you're operating within authorized boundaries.
                </p>
              </div>

              <div className="flex gap-3">
                <Globe className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
                <p className="text-sm leading-relaxed text-[#9ba39a]">
                  You are <span className="font-semibold text-orange-400">solely responsible</span> for any consequences 
                  resulting from the use of this tool.
                </p>
              </div>
            </div>

            {/* Disclaimer Box */}
            <div className="rounded-md border border-[#1c211d] bg-[#0b0e0c] p-4">
              <p className="text-xs leading-relaxed text-[#6b7268]">
                <span className="font-semibold text-[#9ba39a]">DISCLAIMER:</span> HAWKNET 
                is designed for legitimate security testing only. By proceeding, you confirm 
                that you have proper authorization and accept full legal responsibility for 
                your actions. The developers assume no liability for misuse or illegal activities.
              </p>
            </div>
          </div>

          {/* Footer / Actions */}
          <div className="flex gap-3 border-t border-[#1c211d] px-6 py-4">
            <button
              onClick={onCancel}
              className="flex-1 rounded-md border border-[#1c211d] bg-transparent px-4 py-2.5 text-sm font-medium text-[#6b7268] hover:bg-[#1c211d] hover:text-[#cfd6c8] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 active:scale-95 transition-all cursor-pointer"
            >
              I Understand, Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}