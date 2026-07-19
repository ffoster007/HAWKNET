// src/components/workspace/page.tsx
import { useState, useCallback, useEffect, useRef } from "react";

import { Search, Globe, Server, X, Loader2, AlertTriangle } from "lucide-react";
import Warning from "../popup/warning";
import {
  submitScan,
  getJob,
  type Job,
  type TargetType,
} from "../../lib/tauriApi";
import { useAnalyzer } from "../../context/AnalyzerContext";

// ── Polling interval (ms) ─────────────────────────────────────────────────────
const POLL_MS = 1500;

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

  // ── Analyzer Context ─────────────────────────────────────────────────────
  const { setScanResult, setLoading } = useAnalyzer();

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
          
          // ส่งข้อมูลไป Analyzer
          setScanResult(job, job.graph);
          setLoading(false);
          
          // แจ้ง ActivityBar ว่าสแกนเสร็จ
          console.log("Workspace: dispatching scanComplete");
          window.dispatchEvent(new CustomEvent('scanComplete'));
          
        } else if (job.status === "failed") {
          setScanning(false);
          clearInterval(pollRef.current!);
          setLoading(false);
        }
      } catch (err) {
        console.error("Poll error:", err);
        setScanning(false);
        clearInterval(pollRef.current!);
        setLoading(false);
      }
    }, POLL_MS);
  }, [setScanResult, setLoading]);

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
    
    // ✅ ตั้งค่า loading ใน Analyzer
    setLoading(true);

    try {
      const jobId = await submitScan(target.trim(), targetType);
      startPolling(jobId);
    } catch (err) {
      console.error("Submit error:", err);
      setScanning(false);
      setError(String(err));
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
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

        {/* ── Main content area ─────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          {!scanning ? (
            /* Empty state */
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Search className="h-14 w-14 text-[#1c211d]" />
              <p className="text-sm text-[#4a5148]">
                Enter a target above to start scanning
              </p>
            </div>
          ) : (
            /* Loading state */
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-[#e8ff6b] animate-spin" />
              <p className="text-sm text-[#6b7268]">Scanning {target}…</p>
              <p className="text-xs text-[#4a5148]">
                DNS · Ports · Fingerprint · CVE lookup
              </p>
            </div>
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