// src-tauri/src/sidecar.rs
//
// จัดการ lifecycle ของ data_fetch Go binary ที่ bundle มากับ app
// - spawn เมื่อ app start
// - restart อัตโนมัติถ้า crash (max 3 ครั้ง)
// - kill เมื่อ app ปิด (Tauri จัดการให้อัตโนมัติผ่าน CommandChild drop)

use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;
use tracing::{error, info, warn};

const MAX_RETRIES: u32 = 3;
const RETRY_DELAY_SECS: u64 = 2;
const HEALTH_CHECK_DELAY_SECS: u64 = 2; // รอให้ binary start ก่อน health check

pub async fn spawn_data_fetch(app: AppHandle) {
    for attempt in 1..=MAX_RETRIES {
        info!("[sidecar] spawning data_fetch (attempt {}/{})", attempt, MAX_RETRIES);

        match try_spawn(&app).await {
            Ok(_) => {
                // process จบแล้ว (ปกติไม่ควรจบเอง)
                warn!("[sidecar] data_fetch exited unexpectedly");
            }
            Err(e) => {
                error!("[sidecar] failed to spawn: {}", e);
            }
        }

        if attempt < MAX_RETRIES {
            let delay = RETRY_DELAY_SECS * (attempt as u64);
            warn!("[sidecar] retrying in {}s...", delay);
            sleep(Duration::from_secs(delay)).await;
        }
    }

    error!("[sidecar] data_fetch failed to start after {} attempts — scanning will not work", MAX_RETRIES);
}

async fn try_spawn(app: &AppHandle) -> Result<(), String> {
    use tauri_plugin_shell::process::CommandEvent;

    // ชื่อ sidecar ต้องตรงกับ tauri.conf.json → bundle.externalBin
    let (mut rx, _child) = app
        .shell()
        .sidecar("hawknet-fetch")
        .map_err(|e| format!("sidecar command error: {e}"))?
        .spawn()
        .map_err(|e| format!("spawn error: {e}"))?;

    // รอให้ binary ready แล้ว health check
    sleep(Duration::from_secs(HEALTH_CHECK_DELAY_SECS)).await;
    match probe_health().await {
        true  => info!("[sidecar] data_fetch is up ✓"),
        false => warn!("[sidecar] data_fetch did not respond to health check"),
    }

    // drain stdout/stderr → tracing log
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let s = String::from_utf8_lossy(&line);
                info!("[data_fetch] {}", s.trim_end());
            }
            CommandEvent::Stderr(line) => {
                let s = String::from_utf8_lossy(&line);
                // Go ใช้ log package ซึ่งเขียนไป stderr
                info!("[data_fetch] {}", s.trim_end());
            }
            CommandEvent::Error(e) => {
                error!("[data_fetch] process error: {}", e);
                return Err(e);
            }
            CommandEvent::Terminated(status) => {
                warn!("[data_fetch] terminated: {:?}", status);
                return Ok(());
            }
            _ => {}
        }
    }

    Ok(())
}

async fn probe_health() -> bool {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    client
        .get("http://127.0.0.1:5000/health")
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}