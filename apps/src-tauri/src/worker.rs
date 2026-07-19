// src-tauri/src/worker.rs
use std::time::Duration;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::{
    queue::{JobQueue, QueuedJob},
    types::{FetchResponse, Job, JobStatus, ScanTarget},
};

/// Worker concurrency — how many scans can run in parallel.
const MAX_CONCURRENT: usize = 3;

/// data_fetch Go server base URL.
const FETCH_BASE: &str = "http://127.0.0.1:5000";

// ── Worker pool ────────────────────────────────────────────────────────────────

/// Spawns MAX_CONCURRENT worker tasks that drain the job queue.
pub async fn start_workers(queue: JobQueue, mut rx: mpsc::Receiver<QueuedJob>) {
    let sem = std::sync::Arc::new(tokio::sync::Semaphore::new(MAX_CONCURRENT));

    while let Some(queued) = rx.recv().await {
        let permit = sem.clone().acquire_owned().await.unwrap();
        let queue = queue.clone();

        tokio::spawn(async move {
            let _permit = permit;
            run_job(queue, queued.job).await;
        });
    }
}

// ── Single job execution ───────────────────────────────────────────────────────

async fn run_job(queue: JobQueue, mut job: Job) {
    info!("[worker] starting job {} — {}", job.id, job.target.value);

    job.status = JobStatus::Running;
    queue.update(job.clone()).await;

    match call_data_fetch(&job.target).await {
        Ok(resp) => {
            info!(
                "[worker] job {} done — {} vulns, {} nodes",
                job.id,
                resp.graph.summary.total_vulns,
                resp.graph.nodes.len(),
            );
            job.status = JobStatus::Done;
            job.graph = Some(resp.graph);
            job.errors = resp.result.errors;
        }
        Err(e) => {
            error!("[worker] job {} failed: {}", job.id, e);
            job.status = JobStatus::Failed;
            job.errors.push(e.to_string());
        }
    }

    job.finished_at = Some(unix_now());
    queue.update(job).await;
}

// ── data_fetch HTTP call ───────────────────────────────────────────────────────

async fn call_data_fetch(target: &ScanTarget) -> anyhow::Result<FetchResponse> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(360))
        .build()?;

    let mut last_err = anyhow::anyhow!("no attempts made");
    for attempt in 1..=3u8 {
        match client
            .post(format!("{FETCH_BASE}/scan"))
            .json(target)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                let fetch_resp: FetchResponse = resp.json().await?;
                return Ok(fetch_resp);
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                last_err = anyhow::anyhow!("data_fetch status {status}: {body}");
                warn!("[worker] attempt {attempt}/3 failed: {last_err}");
            }
            Err(e) => {
                last_err = anyhow::anyhow!("data_fetch unreachable: {e}");
                warn!("[worker] attempt {attempt}/3 error: {last_err}");
            }
        }
        if attempt < 3 {
            tokio::time::sleep(Duration::from_secs(2u64.pow(attempt as u32))).await;
        }
    }
    Err(last_err)
}

// ── Health probe ───────────────────────────────────────────────────────────────

/// Check if data_fetch server is reachable. Called on startup.
pub async fn probe_data_fetch() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap();

    client
        .get(format!("{FETCH_BASE}/health"))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

fn unix_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}