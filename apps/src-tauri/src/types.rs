// src-tauri/src/types.rs
use serde::{Deserialize, Serialize};

// ── Input ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TargetType {
    Domain,
    Ip,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanTarget {
    pub value: String,
    #[serde(rename = "type")]
    pub target_type: TargetType,
    pub request_id: String,
}

// ── Go data_fetch response ────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResponse {
    pub result: ScanResult,
    pub graph: VulnGraph,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub request_id: String,
    pub target: ScanTarget,
    #[serde(default)]
    pub subdomains: Vec<SubdomainResult>,
    #[serde(default)]
    pub ports: Vec<PortResult>,
    #[serde(default)]
    pub fingerprints: Vec<FingerprintResult>,
    #[serde(default)]
    pub vuln_hits: Vec<VulnHit>,
    pub ai_enhanced: bool,
    pub scanned_at: String,
    #[serde(default)]
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubdomainResult {
    pub subdomain: String,
    pub ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortResult {
    pub port: u16,
    pub protocol: String,
    pub state: String,
    #[serde(default)]
    pub banner: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FingerprintResult {
    pub target: String,
    #[serde(default)]
    pub status_code: u16,
    #[serde(default)]
    pub server: String,
    #[serde(default)]
    pub tech_stack: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VulnHit {
    #[serde(default)]
    pub cve_id: String,
    pub description: String,
    pub severity: String,
    #[serde(default)]
    pub cvss_score: f64,
    #[serde(default)]
    pub epss_score: f64,
    #[serde(default)]
    pub in_cisa_kev: bool,
    #[serde(default)]
    pub attack_patterns: Vec<String>,
    pub source: String,
}

// ── Graph (React Flow) ────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VulnGraph {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub ai_enhanced: bool,
    pub summary: Summary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub data: NodeData,
    pub position: Position,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeData {
    pub label: String,
    #[serde(default)]
    pub severity: String,
    #[serde(default)]
    pub risk_level: u8,
    #[serde(default)]
    pub cve_id: String,
    #[serde(default)]
    pub cvss_score: f64,
    #[serde(default)]
    pub epss_score: f64,
    #[serde(default)]
    pub in_cisa_kev: bool,
    #[serde(default)]
    pub attack_patterns: Vec<String>,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub ai_enhanced: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(default)]
    pub label: String,
    #[serde(rename = "type", default)]
    pub edge_type: String,
    pub animated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Summary {
    pub total_vulns: u32,
    pub critical: u32,
    pub high: u32,
    pub medium: u32,
    pub low: u32,
    pub kev_count: u32,
    pub open_ports: u32,
    pub subdomains: u32,
    pub attack_paths: u32,
}

// ── Orchestrator job ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Queued,
    Running,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub target: ScanTarget,
    pub status: JobStatus,
    pub created_at: String,
    pub finished_at: Option<String>,
    pub graph: Option<VulnGraph>,
    pub errors: Vec<String>,
}