// src-tauri/src/commands.rs
use tauri::State;

use crate::{
    queue::JobQueue,
    types::{Job, ScanTarget, TargetType},
    worker::probe_data_fetch,
};

pub struct AppState {
    pub queue: JobQueue,
}

#[tauri::command]
pub async fn submit_scan(
    value: String,
    target_type: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let t = match target_type.as_str() {
        "domain" => TargetType::Domain,
        "ip" => TargetType::Ip,
        other => return Err(format!("unknown target type: {other}")),
    };

    if value.trim().is_empty() {
        return Err("target value cannot be empty".into());
    }

    let target = ScanTarget {
        value: value.trim().to_string(),
        target_type: t,
        request_id: uuid::Uuid::new_v4().to_string(),
    };

    let job_id = state.queue.submit(target).await;
    tracing::info!("[cmd] submitted scan {} → job {}", value, job_id);
    Ok(job_id)
}

#[tauri::command]
pub async fn get_job(id: String, state: State<'_, AppState>) -> Result<Option<Job>, String> {
    Ok(state.queue.get(&id).await)
}

#[tauri::command]
pub async fn list_jobs(state: State<'_, AppState>) -> Result<Vec<Job>, String> {
    Ok(state.queue.all().await)
}

#[tauri::command]
pub async fn health_check() -> Result<bool, String> {
    Ok(probe_data_fetch().await)
}

#[tauri::command]
pub async fn set_runtime_config(
    ai_enabled: bool,
    passive_only: bool,
    _app_handle: tauri::AppHandle,  // ✅ ใส่ _ ข้างหน้า
) -> Result<(), String> {
    let payload = serde_json::json!({
        "ai_enabled": ai_enabled,
        "passive_only": passive_only,
        "shodan_enabled": false,
    });

    let home_dir = std::env::var("HOME")
        .map_err(|_| "HOME not set".to_string())?;
    
    let config_dir = std::path::PathBuf::from(&home_dir)
        .join(".config")
        .join("hawknet");
    
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("failed to create config dir: {}", e))?;
    
    let runtime_path = config_dir.join("hawknet_runtime.json");
    
    std::fs::write(
        &runtime_path,
        serde_json::to_string_pretty(&payload).unwrap(),
    )
    .map_err(|e| format!("write runtime config: {e}"))?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let _ = client
        .post("http://127.0.0.1:5000/config/runtime")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("push runtime config: {e}"))?;

    Ok(())
}