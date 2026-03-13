use crate::bridge::client::{BridgeClient, BridgeState};
use crate::bridge::types::*;

#[tauri::command]
pub async fn bridge_connect(
    host: String,
    port: u16,
    auth_token: String,
    state: tauri::State<'_, BridgeState>,
) -> Result<ServerStatus, String> {
    let client = BridgeClient::new(&host, port, &auth_token)?;
    let status = client.status().await?;
    let mut lock = state.0.lock().await;
    *lock = Some(client);
    Ok(status)
}

#[tauri::command]
pub async fn bridge_disconnect(
    state: tauri::State<'_, BridgeState>,
) -> Result<(), String> {
    let mut lock = state.0.lock().await;
    *lock = None;
    Ok(())
}

#[tauri::command]
pub async fn bridge_status(
    state: tauri::State<'_, BridgeState>,
) -> Result<ServerStatus, String> {
    let client = state.get_client().await?;
    client.status().await
}

#[tauri::command]
pub async fn bridge_reload_worldgen(
    state: tauri::State<'_, BridgeState>,
) -> Result<BridgeResponse, String> {
    let client = state.get_client().await?;
    client.reload_worldgen().await
}

#[tauri::command]
pub async fn bridge_regenerate_chunks(
    x: i32,
    z: i32,
    radius: u32,
    state: tauri::State<'_, BridgeState>,
) -> Result<BridgeResponse, String> {
    let client = state.get_client().await?;
    client.regenerate_chunks(x, z, radius).await
}

#[tauri::command]
pub async fn bridge_teleport(
    player_name: String,
    x: f64,
    y: f64,
    z: f64,
    state: tauri::State<'_, BridgeState>,
) -> Result<BridgeResponse, String> {
    let client = state.get_client().await?;
    client.teleport(&player_name, x, y, z).await
}

#[tauri::command]
pub async fn bridge_player_info(
    state: tauri::State<'_, BridgeState>,
) -> Result<PlayerInfo, String> {
    let client = state.get_client().await?;
    client.player_info().await
}

#[tauri::command]
pub async fn bridge_fetch_palette(
    state: tauri::State<'_, BridgeState>,
) -> Result<BlockPaletteResponse, String> {
    let client = state.get_client().await?;
    client.fetch_palette().await
}

#[tauri::command]
pub async fn bridge_fetch_chunk(
    chunk_x: i32,
    chunk_z: i32,
    y_min: i32,
    y_max: i32,
    force_load: bool,
    state: tauri::State<'_, BridgeState>,
) -> Result<ChunkDataResponse, String> {
    let client = state.get_client().await?;
    client.fetch_chunk(chunk_x, chunk_z, y_min, y_max, force_load).await
}

#[tauri::command]
pub async fn bridge_sync_file(
    source_path: String,
    server_mod_path: String,
    relative_path: String,
    state: tauri::State<'_, BridgeState>,
) -> Result<BridgeResponse, String> {
    // Validate that relative_path doesn't escape server_mod_path via ".." traversal
    let base = std::path::Path::new(&server_mod_path)
        .canonicalize()
        .map_err(|e| format!("Invalid server mod path: {}", e))?;
    let dest = base.join(&relative_path);
    // Ensure parent directory exists before canonicalizing
    if let Some(parent) = dest.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let dest_canon = dest
        .canonicalize()
        .or_else(|_| {
            // File doesn't exist yet — canonicalize the parent and append the filename
            if let (Some(parent), Some(name)) = (dest.parent(), dest.file_name()) {
                let canon_parent = parent.canonicalize().map_err(|e| e.to_string())?;
                Ok(canon_parent.join(name))
            } else {
                Err(format!("Invalid destination path: {}", dest.display()))
            }
        })
        .map_err(|e: String| e)?;

    if !dest_canon.starts_with(&base) {
        return Err(format!(
            "Path traversal blocked: {} escapes {}",
            relative_path, server_mod_path
        ));
    }

    let dest_str = dest_canon
        .to_str()
        .ok_or("Invalid destination path")?;
    BridgeClient::sync_file(&source_path, dest_str)?;

    let client = state.get_client().await?;
    client.reload_worldgen().await
}
