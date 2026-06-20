import { useState } from "react";
import { Search, Globe, Server, X } from "lucide-react";

/**
 * HAWKNET — Workspace
 * Domain/IP input interface for reconnaissance
 */

type TargetType = "domain" | "ip";

interface TargetHistory {
  id: string;
  target: string;
  type: TargetType;
  timestamp: Date;
}

export default function Workspace() {
  const [target, setTarget] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("domain");
  const [history, setHistory] = useState<TargetHistory[]>([]);
  const [error, setError] = useState("");

  // Simple validation
  const validateTarget = (value: string, type: TargetType): boolean => {
    if (!value.trim()) return false;

    if (type === "ip") {
      // IPv4 validation
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (ipv4Regex.test(value)) {
        const parts = value.split(".");
        return parts.every((part) => {
          const num = parseInt(part, 10);
          return num >= 0 && num <= 255;
        });
      }
      return false;
    } else {
      // Domain validation (basic)
      const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
      return domainRegex.test(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateTarget(target, targetType)) {
      setError(
        targetType === "ip"
          ? "Please enter a valid IPv4 address (e.g., 192.168.1.1)"
          : "Please enter a valid domain (e.g., example.com)"
      );
      return;
    }

    // Add to history
    const newEntry: TargetHistory = {
      id: Date.now().toString(),
      target: target.trim(),
      type: targetType,
      timestamp: new Date(),
    };

    setHistory((prev) => [newEntry, ...prev.slice(0, 9)]); // Keep last 10
    setTarget("");

    // TODO: Trigger actual reconnaissance
    console.log("Starting recon for:", target);
  };

  const removeFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const selectFromHistory = (item: TargetHistory) => {
    setTarget(item.target);
    setTargetType(item.type);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0e0c]">
      {/* Header */}
      <div className="border-b border-[#1c211d] px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-6 w-6 text-[#e8ff6b]" />
          <h1 className="text-2xl font-semibold text-[#cfd6c8]">
            New Reconnaissance
          </h1>
        </div>
        <p className="text-sm text-[#6b7268] ml-9">
          Enter a domain or IP address to start scanning
        </p>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl">
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="rounded-lg border border-[#1c211d] bg-[#11150f] p-6">
              {/* Target Type Toggle */}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("domain");
                    setError("");
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    targetType === "domain"
                      ? "bg-[#e8ff6b] text-[#0b0e0c]"
                      : "bg-[#1c211d] text-[#6b7268] hover:text-[#cfd6c8]"
                  }`}
                >
                  <Globe size={16} />
                  Domain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType("ip");
                    setError("");
                  }}
                  className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    targetType === "ip"
                      ? "bg-[#e8ff6b] text-[#0b0e0c]"
                      : "bg-[#1c211d] text-[#6b7268] hover:text-[#cfd6c8]"
                  }`}
                >
                  <Server size={16} />
                  IP Address
                </button>
              </div>

              {/* Input Field */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => {
                      setTarget(e.target.value);
                      setError("");
                    }}
                    placeholder={
                      targetType === "domain"
                        ? "e.g., example.com"
                        : "e.g., 192.168.1.1"
                    }
                    className="w-full rounded-md border border-[#1c211d] bg-[#0b0e0c] px-4 py-3 pl-10 text-[#cfd6c8] placeholder:text-[#6b7268] outline-none focus:border-[#e8ff6b] focus:ring-1 focus:ring-[#e8ff6b] transition-colors"
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7268]"
                    size={18}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-[#e8ff6b] px-6 py-3 text-sm font-semibold text-[#0b0e0c] transition-colors hover:bg-[#d4f04a] active:scale-95 cursor-pointer"
                >
                  Start Scan
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2">
                  <X size={16} className="text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Target Info */}
              {target.trim() && !error && (
                <div className="mt-3 rounded-md border border-[#1c211d] bg-[#0b0e0c] px-4 py-2">
                  <div className="flex items-center gap-2 text-sm text-[#9ba39a]">
                    {targetType === "domain" ? (
                      <Globe size={14} className="text-[#6b7268]" />
                    ) : (
                      <Server size={14} className="text-[#6b7268]" />
                    )}
                    <span>Target:</span>
                    <span className="font-mono text-[#e8ff6b]">
                      {target.trim()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Recent Targets History */}
          {history.length > 0 && (
            <div className="rounded-lg border border-[#1c211d] bg-[#11150f] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6b7268]">
                  Recent Targets
                </h2>
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-[#6b7268] hover:text-[#cfd6c8] transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectFromHistory(item)}
                    className="group flex items-center justify-between rounded-md border border-[#1c211d] bg-[#0b0e0c] px-4 py-3 cursor-pointer hover:border-[#2a3029] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.type === "domain" ? (
                        <Globe
                          size={16}
                          className="text-[#6b7268] group-hover:text-[#e8ff6b] transition-colors"
                        />
                      ) : (
                        <Server
                          size={16}
                          className="text-[#6b7268] group-hover:text-[#e8ff6b] transition-colors"
                        />
                      )}
                      <span className="font-mono text-sm text-[#cfd6c8] group-hover:text-[#e8ff6b] transition-colors">
                        {item.target}
                      </span>
                      <span className="rounded bg-[#1c211d] px-2 py-0.5 text-xs text-[#6b7268]">
                        {item.type === "domain" ? "Domain" : "IP"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6b7268]">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.id);
                        }}
                        className="rounded p-1 text-[#6b7268] opacity-0 hover:bg-[#1c211d] hover:text-red-400 group-hover:opacity-100 transition-all cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {history.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#1c211d] p-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-[#1c211d]" />
              <h3 className="mb-2 text-lg font-medium text-[#6b7268]">
                No recent targets
              </h3>
              <p className="text-sm text-[#4a5148]">
                Your scan history will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}