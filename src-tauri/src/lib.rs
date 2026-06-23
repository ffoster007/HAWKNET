// src-tauri/src/lib.rs
mod commands;
mod queue;
mod sidecar;
mod types;
mod worker;

use commands::AppState;
use queue::JobQueue;
use tauri::Manager; // ✅ ต้อง import เพื่อใช้ app_handle.path()

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    tracing::info!("[orchestrator] starting HAWKNET");

    let (queue, rx) = JobQueue::new(64);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())   // ✅ ต้องเพิ่ม plugin นี้
        .manage(AppState { queue: queue.clone() })
        .invoke_handler(tauri::generate_handler![
            commands::submit_scan,
            commands::get_job,
            commands::list_jobs,
            commands::health_check,
            commands::set_runtime_config,
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();

            // ── สร้าง runtime config ───────────────────────────────────────
            let home_dir = std::env::var("HOME")
                .unwrap_or_else(|_| ".".to_string());

            let config_dir = std::path::PathBuf::from(&home_dir)
                .join(".config")
                .join("hawknet");

            if let Err(e) = std::fs::create_dir_all(&config_dir) {
                tracing::warn!("failed to create config dir: {}", e);
            }

            let runtime_path = config_dir.join("hawknet_runtime.json");
            if !runtime_path.exists() {
                let default_config = serde_json::json!({
                    "ai_enabled": false,
                    "passive_only": false,
                    "shodan_enabled": false,
                });
                if let Err(e) = std::fs::write(
                    &runtime_path,
                    serde_json::to_string_pretty(&default_config).unwrap(),
                ) {
                    tracing::warn!("failed to write runtime config: {}", e);
                } else {
                    tracing::info!("created runtime config at {:?}", runtime_path);
                }
            }

            // ── Copy .env ไปยัง ~/.config/hawknet/ ───────────────────────
            // Tauri bundle .env ไว้ใน resources → copy ออกมาครั้งแรก
            let env_dest = config_dir.join(".env");
            if !env_dest.exists() {
                // ลอง resolve resource path ของ .env
                if let Ok(resource_path) = app_handle.path().resolve(
                    ".env",
                    tauri::path::BaseDirectory::Resource,
                ) {
                    if resource_path.exists() {
                        if let Err(e) = std::fs::copy(&resource_path, &env_dest) {
                            tracing::warn!("failed to copy .env to config dir: {}", e);
                        } else {
                            tracing::info!("copied .env to {:?}", env_dest);
                        }
                    }
                }
            }

            // ── Auto-spawn data_fetch sidecar ─────────────────────────────
            let sidecar_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                sidecar::spawn_data_fetch(sidecar_handle).await;
            });

            // ── Start job workers ─────────────────────────────────────────
            tauri::async_runtime::spawn(async move {
                worker::start_workers(queue, rx).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}