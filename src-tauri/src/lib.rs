mod bridge;
mod commands;
mod io;
mod noise;
mod schema;

use bridge::client::BridgeState;
use commands::{bridge as bridge_commands, hardware, io as io_commands, preview, process, validate};

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
            io_commands::list_directory,
            io_commands::create_from_template,
            io_commands::list_template_biomes,
            io_commands::create_blank_project,
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
