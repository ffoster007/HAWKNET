// src-tauri/src/lib.rs
mod commands;
mod queue;
mod types;
mod worker;

use commands::AppState;
use queue::JobQueue;
use worker::probe_data_fetch;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    tracing::info!("[orchestrator] starting HAWKNET");

    let (queue, rx) = JobQueue::new(64);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { queue: queue.clone() })
        .invoke_handler(tauri::generate_handler![
            commands::submit_scan,
            commands::get_job,
            commands::list_jobs,
            commands::health_check,
            commands::set_runtime_config,
        ])
        .setup(move |app| {  // ✅ ใช้ move เพื่อย้าย ownership
            let app_handle = app.handle().clone();
            
            // ✅ queue และ rx ถูกย้ายมาเป็น owned แล้ว
            tauri::async_runtime::spawn(async move {
                worker::start_workers(queue, rx).await;
            });
            
            tauri::async_runtime::spawn(async move {
                // ✅ สร้าง runtime config ใน ~/.config/hawknet/
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
                
                if probe_data_fetch().await {
                    tracing::info!("[orchestrator] data_fetch reachable ✓");
                } else {
                    tracing::warn!(
                        "[orchestrator] data_fetch not reachable at :5000 — start it with: cd data_fetch && go run ./cmd/hawknet-fetch/"
                    );
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}