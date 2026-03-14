mod bridge;
mod commands;
mod io;
mod noise;
mod schema;

use bridge::client::BridgeState;
use commands::{bridge as bridge_commands, hardware, io as io_commands, preview, process, validate};

// Hint Windows to prefer the discrete GPU when available (NVIDIA / AMD)
// These exported symbols are read by GPU drivers to prefer high-performance adapter.
// NOTE: GPU affinity exports are defined in the application binary (`main.rs`)
// so they reliably appear in the final executable. See `src-tauri/src/main.rs`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(BridgeState::default())
        .invoke_handler(tauri::generate_handler![
            io_commands::open_asset_pack,
            io_commands::save_asset_pack,
            io_commands::read_asset_file,
            io_commands::write_asset_file,
            io_commands::export_asset_file,
            io_commands::write_text_file,
            io_commands::copy_file,
            io_commands::create_directory,
            io_commands::list_directory,
            io_commands::resolve_bundled_hytale_asset_path,
            io_commands::get_hytale_asset_cache_root,
            io_commands::sync_hytale_assets,
            io_commands::start_hytale_assets_sync,
            io_commands::cancel_hytale_assets_sync,
            io_commands::check_hytale_asset_staleness,
            io_commands::create_from_template,
            io_commands::list_template_biomes,
            io_commands::create_blank_project,
            io_commands::show_in_folder,
            io_commands::path_exists,
            validate::validate_asset_pack,
            preview::evaluate_density,
            bridge_commands::bridge_connect,
            bridge_commands::bridge_disconnect,
            bridge_commands::bridge_status,
            bridge_commands::bridge_reload_worldgen,
            bridge_commands::bridge_regenerate_chunks,
            bridge_commands::bridge_teleport,
            bridge_commands::bridge_player_info,
            bridge_commands::bridge_fetch_palette,
            bridge_commands::bridge_fetch_chunk,
            bridge_commands::bridge_sync_file,
            process::relaunch_app,
            hardware::get_hardware_info,
            hardware::get_gpu_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running TerraNova");
}
