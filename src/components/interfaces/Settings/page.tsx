import { useState, useEffect } from "react";
import { Cpu, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { healthCheck, setRuntimeConfig } from "../../../lib/tauriApi";

export default function SettingsPanel() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [passiveOnly, setPassiveOnly] = useState(false);
  const [fetchOnline, setFetchOnline] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Probe data_fetch on mount
  useEffect(() => {
    healthCheck().then(setFetchOnline).catch(() => setFetchOnline(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setRuntimeConfig(aiEnabled, passiveOnly);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore — UI will show nothing; next scan uses last good config
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#0b0e0c] p-8 overflow-auto">
      <div className="mx-auto max-w-xl space-y-6">

        {/* ── data_fetch status ──────────────────────────────────────────── */}
        <div className="rounded-lg border border-[#1c211d] bg-[#11150f] p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b7268]">
            Backend Status
          </h2>
          <div className="flex items-center gap-3 text-sm">
            {fetchOnline === null ? (
              <Loader2 size={16} className="animate-spin text-[#6b7268]" />
            ) : fetchOnline ? (
              <CheckCircle size={16} className="text-green-400" />
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
            <span className="text-[#9ba39a]">
              data_fetch{" "}
              <span
                className={
                  fetchOnline === null
                    ? "text-[#6b7268]"
                    : fetchOnline
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {fetchOnline === null
                  ? "checking…"
                  : fetchOnline
                  ? "online :5000"
                  : "offline — run: cd data_fetch && go run ./cmd/hawknet-fetch/"}
              </span>
            </span>
          </div>
        </div>

        {/* ── AI toggle ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-[#1c211d] bg-[#11150f] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6b7268]">
            AI Enhancement
          </h2>

          <Toggle
            icon={<Cpu size={16} />}
            label="Enable AI analysis"
            description="Sends findings to Claude / GPT / Gemini for pattern correlation. Requires API keys in .env"
            checked={aiEnabled}
            onChange={setAiEnabled}
          />
        </div>

        {/* ── Scan mode ─────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-[#1c211d] bg-[#11150f] p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#6b7268]">
            Scan Mode
          </h2>

          <Toggle
            icon={<EyeOff size={16} />}
            label="Passive only"
            description="Disables active port scanning. DNS recon and fingerprinting still run."
            checked={passiveOnly}
            onChange={setPassiveOnly}
          />
        </div>

        {/* ── Save ──────────────────────────────────────────────────────── */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-[#e8ff6b] px-5 py-2.5 text-sm font-semibold text-[#0b0e0c] hover:bg-[#d4f04a] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saved ? "Saved ✓" : saving ? "Saving…" : "Apply"}
        </button>

        <p className="text-xs text-[#4a5148]">
          Changes take effect immediately for new scans. Active scans are not interrupted.
        </p>
      </div>
    </div>
  );
}

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[#6b7268]">{icon}</span>
        <div>
          <div className="text-sm text-[#cfd6c8]">{label}</div>
          <div className="mt-0.5 text-xs text-[#4a5148] leading-relaxed">
            {description}
          </div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
          checked ? "bg-[#e8ff6b]" : "bg-[#2a3029]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}