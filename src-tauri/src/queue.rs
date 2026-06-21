// src-tauri/src/queue.rs
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

use crate::types::{Job, JobStatus, ScanTarget, TargetType};

// ── Priority ──────────────────────────────────────────────────────────────────

/// Higher number = processed first.
/// IP targets get slightly lower priority (broader attack surface — do domains first).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Priority {
    Low = 0,
    Normal = 1,
    High = 2,
}

impl Priority {
    pub fn for_target(t: &ScanTarget) -> Self {
        match t.target_type {
            TargetType::Domain => Priority::Normal,
            TargetType::Ip => Priority::Low,
        }
    }
}

#[derive(Debug)]
pub struct QueuedJob {
    pub job: Job,
    pub priority: Priority,
}

// ── Queue ─────────────────────────────────────────────────────────────────────

/// JobQueue holds pending jobs and a shared state store.
/// The sender side is cloneable so Tauri commands can enqueue from any thread.
#[derive(Clone)]
pub struct JobQueue {
    pub tx: mpsc::Sender<QueuedJob>,
    /// Shared map of all jobs (queued → running → done/failed).
    pub store: Arc<RwLock<HashMap<String, Job>>>,
}

impl JobQueue {
    pub fn new(buffer: usize) -> (Self, mpsc::Receiver<QueuedJob>) {
        let (tx, rx) = mpsc::channel(buffer);
        let q = JobQueue {
            tx,
            store: Arc::new(RwLock::new(HashMap::new())),
        };
        (q, rx)
    }

    /// Enqueue a new scan job. Returns the assigned job ID.
    pub async fn submit(&self, target: ScanTarget) -> String {
        let id = Uuid::new_v4().to_string();
        let now = chrono_now();

        let job = Job {
            id: id.clone(),
            target: target.clone(),
            status: JobStatus::Queued,
            created_at: now,
            finished_at: None,
            graph: None,
            errors: vec![],
        };

        // Store immediately so UI can poll status right away
        self.store.write().await.insert(id.clone(), job.clone());

        let priority = Priority::for_target(&target);
        let _ = self.tx.send(QueuedJob { job, priority }).await;

        id
    }

    /// Get current snapshot of a job by ID.
    pub async fn get(&self, id: &str) -> Option<Job> {
        self.store.read().await.get(id).cloned()
    }

    /// Get all jobs (for dashboard listing).
    pub async fn all(&self) -> Vec<Job> {
        let store = self.store.read().await;
        let mut jobs: Vec<Job> = store.values().cloned().collect();
        // Most recent first
        jobs.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        jobs
    }

    /// Update job in store (called by worker).
    pub async fn update(&self, job: Job) {
        self.store.write().await.insert(job.id.clone(), job);
    }
}

fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", secs)
}