// src/lib/tauriApi.ts
import { invoke } from "@tauri-apps/api/core";

// ── Types ──────────────────────────────────────────────────────────────────────
export type TargetType = "domain" | "ip";

export interface ScanTarget {
  value: string;
  type: TargetType;
  request_id: string;
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  target: ScanTarget;
  status: JobStatus;
  created_at: string;
  finished_at: string | null;
  graph: VulnGraph | null;
  errors: string[];
}

export interface VulnGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  ai_enhanced: boolean;
  summary: Summary;
}

export interface GraphNode {
  id: string;
  type: "target" | "vuln" | "service" | "subdomain" | "pattern";
  data: NodeData;
  position: { x: number; y: number };
}

export interface NodeData {
  label: string;
  severity?: string;
  risk_level?: number;
  cve_id?: string;
  cvss_score?: number;
  epss_score?: number;
  in_cisa_kev?: boolean;
  attack_patterns?: string[];
  source?: string;
  ai_enhanced?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated: boolean;
}

export interface Summary {
  total_vulns: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  kev_count: number;
  open_ports: number;
  subdomains: number;
  attack_paths: number;
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

/**
 * Submit a new scan job
 * NOTE: Tauri converts snake_case to camelCase automatically!
 * So "submit_scan" in Rust becomes "submitScan" in JS
 */
export async function submitScan(
  value: string,
  targetType: TargetType
): Promise<string> {
  return await invoke<string>("submit_scan", { value, targetType });
}

/**
 * Get job status by ID
 */
export async function getJob(id: string): Promise<Job | null> {
  return await invoke<Job | null>("get_job", { id });
}

/**
 * List all jobs
 */
export async function listJobs(): Promise<Job[]> {
  return await invoke<Job[]>("list_jobs");
}

/**
 * Health check for data_fetch
 */
export async function healthCheck(): Promise<boolean> {
  return await invoke<boolean>("health_check");
}

/**
 * Update runtime config (AI toggle, passive mode)
 */
export async function setRuntimeConfig(
  aiEnabled: boolean,
  passiveOnly: boolean
): Promise<void> {
  return await invoke("set_runtime_config", { aiEnabled, passiveOnly });
}