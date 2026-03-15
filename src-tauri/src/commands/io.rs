use crate::io::asset_pack::{AssetPack, DirectoryEntry};
use crate::io::path_scope;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{Emitter, Manager};

// ── Project scope management ────────────────────────────────────────────────

/// Register a project directory as an allowed root for filesystem commands.
/// Called by the frontend when a project is opened.
#[tauri::command]
pub fn register_project_root(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    path_scope::register_allowed_root(&target);
    // Also register the hytale-assets cache if it exists
    if let Ok(cache_root) = crate::io::hytale_assets::get_hytale_assets_root() {
        path_scope::register_allowed_root(&cache_root);
    }
    Ok(())
}

/// Unregister a project directory when it is closed.
#[tauri::command]
pub fn unregister_project_root(path: String) {
    path_scope::unregister_allowed_root(Path::new(&path));
}

// ── Asset pack commands ─────────────────────────────────────────────────────

/// Open an asset pack directory and parse all JSON files.
#[tauri::command]
pub fn open_asset_pack(path: String) -> Result<AssetPack, String> {
    path_scope::validate_path_str(&path)?;
    let pack_path = PathBuf::from(&path);
    if !pack_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    AssetPack::load(&pack_path).map_err(|e| e.to_string())
}

/// Save an asset pack back to disk (atomic write via temp + rename).
#[tauri::command]
pub fn save_asset_pack(pack: AssetPack) -> Result<(), String> {
    path_scope::validate_path_str(&pack.path)?;
    pack.save().map_err(|e| e.to_string())
}

// ── Single-file commands ────────────────────────────────────────────────────

/// Read a single JSON asset file.
#[tauri::command]
pub fn read_asset_file(path: String) -> Result<Value, String> {
    path_scope::validate_path_str(&path)?;
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))
}

/// Write a single JSON asset file with atomic write.
#[tauri::command]
pub fn write_asset_file(path: String, content: Value) -> Result<(), String> {
    path_scope::validate_path_str(&path)?;
    let json = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    let file_path = Path::new(&path);
    let temp_path = file_path.with_extension("tmp");

    fs::write(&temp_path, &json).map_err(|e| format!("Failed to write temp file: {}", e))?;
    if let Err(e) = fs::rename(&temp_path, file_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to rename: {}", e));
    }

    Ok(())
}

/// Write a JSON asset file to an arbitrary path, creating parent directories.
#[tauri::command]
pub fn export_asset_file(path: String, content: Value) -> Result<(), String> {
    path_scope::validate_path_str(&path)?;
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    let temp_path = file_path.with_extension("tmp");
    fs::write(&temp_path, &json).map_err(|e| format!("Failed to write: {}", e))?;
    if let Err(e) = fs::rename(&temp_path, file_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to rename: {}", e));
    }
    Ok(())
}

/// Write a raw text file to an arbitrary path, creating parent directories.
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    path_scope::validate_path_str(&path)?;
    let file_path = Path::new(&path);
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let temp_path = file_path.with_extension("tmp");
    fs::write(&temp_path, &content).map_err(|e| format!("Failed to write: {}", e))?;
    if let Err(e) = fs::rename(&temp_path, file_path) {
        let _ = fs::remove_file(&temp_path);
        return Err(format!("Failed to rename: {}", e));
    }
    Ok(())
}

/// Create a directory (and all parent directories) at the given path.
#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    path_scope::validate_path_str(&path)?;
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Copy a file from source to destination, creating parent directories.
#[tauri::command]
pub fn copy_file(source: String, destination: String) -> Result<(), String> {
    path_scope::validate_path_str(&source)?;
    path_scope::validate_path_str(&destination)?;
    let dest_path = Path::new(&destination);
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    fs::copy(&source, &destination).map_err(|e| format!("Failed to copy: {}", e))?;
    Ok(())
}

/// List directory contents for the asset tree sidebar.
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<DirectoryEntry>, String> {
    path_scope::validate_path_str(&path)?;
    let dir_path = PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    DirectoryEntry::scan(&dir_path).map_err(|e| e.to_string())
}

/// Return true if the given path exists on disk (file or directory).
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    // path_exists is read-only and low-risk, so we allow it without scope
    // validation to support pre-project checks (e.g. settings dialog).
    Path::new(&path).exists()
}

// ── Hytale asset commands ───────────────────────────────────────────────────

/// Resolve a cached Hytale asset directory or file path.
#[tauri::command]
pub fn resolve_bundled_hytale_asset_path(relative_path: String) -> Result<String, String> {
    crate::io::hytale_assets::resolve_hytale_asset_path(&relative_path)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Return the managed local Hytale asset cache root used by TerraNova.
#[tauri::command]
pub fn get_hytale_asset_cache_root() -> Result<String, String> {
    let root = crate::io::hytale_assets::ensure_hytale_assets_root()
        .map_err(|e| e.to_string())?;
    // Register the cache as an allowed root so subsequent reads work
    path_scope::register_allowed_root(&root);
    Ok(root.to_string_lossy().to_string())
}

/// Sync Hytale assets into TerraNova's local cache from a release directory or Assets.zip.
#[tauri::command]
pub fn sync_hytale_assets(
    window: tauri::Window,
    source_path: String,
    common_overlay_path: Option<String>,
) -> Result<crate::io::hytale_assets::HytaleAssetSyncResult, String> {
    crate::io::hytale_assets::sync_hytale_assets_from_source_with_progress(
        Path::new(&source_path),
        common_overlay_path
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(Path::new),
        &window,
    )
    .map_err(|e| e.to_string())
}

/// Count how many files would be written by a Hytale assets sync without
/// performing any IO.
#[tauri::command]
pub fn count_hytale_assets_to_sync(
    source_path: String,
    common_overlay_path: Option<String>,
) -> Result<u64, String> {
    crate::io::hytale_assets::count_changed_hytale_assets_from_source(
        Path::new(&source_path),
        common_overlay_path
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(Path::new),
    )
    .map_err(|e| e.to_string())
}

/// Start a background Hytale assets sync and return immediately.
#[tauri::command]
pub fn start_hytale_assets_sync(
    window: tauri::Window,
    source_path: String,
    common_overlay_path: Option<String>,
) -> Result<(), String> {
    let win = window.clone();
    let src = source_path.clone();
    let overlay = common_overlay_path.clone();

    std::thread::spawn(move || {
        let res = crate::io::hytale_assets::sync_hytale_assets_from_source_with_progress(
            Path::new(&src),
            overlay.as_deref().filter(|v| !v.trim().is_empty()).map(Path::new),
            &win,
        );
        if let Err(e) = res {
            let _ = win.emit("hytale-sync-error", &e.to_string());
        }
    });

    Ok(())
}

/// Cancel any in-progress Hytale asset sync operation.
#[tauri::command]
pub fn cancel_hytale_assets_sync() -> Result<(), String> {
    crate::io::hytale_assets::cancel_hytale_assets_sync()
        .map_err(|e| e.to_string())
}

/// Check whether the Hytale asset cache is stale relative to the source path.
#[tauri::command]
pub fn check_hytale_asset_staleness(
    source_path: String,
) -> crate::io::hytale_assets::AssetStalenessInfo {
    crate::io::hytale_assets::check_asset_staleness(&source_path)
}

// ── Project creation commands ───────────────────────────────────────────────

/// Create a blank project with the minimal HytaleGenerator folder structure.
#[tauri::command]
pub fn create_blank_project(target_path: String) -> Result<(), String> {
    let target = Path::new(&target_path);
    if target.exists()
        && fs::read_dir(target)
            .map_err(|e| e.to_string())?
            .next()
            .is_some()
    {
        return Err("Target directory is not empty".into());
    }

    let gen = target.join("Server").join("HytaleGenerator");

    for sub in &["Biomes", "Settings", "WorldStructures"] {
        fs::create_dir_all(gen.join(sub)).map_err(|e| e.to_string())?;
    }

    let settings = serde_json::json!({
        "CustomConcurrency": -1,
        "BufferCapacityFactor": 0.3,
        "TargetViewDistance": 512.0,
        "TargetPlayerCount": 3.0,
        "StatsCheckpoints": []
    });
    fs::write(
        gen.join("Settings/Settings.json"),
        serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let world = serde_json::json!({
        "Type": "NoiseRange",
        "DefaultBiome": "DefaultBiome",
        "DefaultTransitionDistance": 16,
        "MaxBiomeEdgeDistance": 32,
        "Biomes": [
            { "Biome": "DefaultBiome", "Min": -1.0, "Max": 1.0 }
        ],
        "Density": {
            "Type": "SimplexNoise2D",
            "Lacunarity": 2.0,
            "Persistence": 0.5,
            "Scale": 256.0,
            "Octaves": 1,
            "Seed": "main"
        },
        "Framework": []
    });
    fs::write(
        gen.join("WorldStructures/MainWorld.json"),
        serde_json::to_string_pretty(&world).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let biome = serde_json::json!({
        "Name": "DefaultBiome",
        "Terrain": {
            "Type": "DAOTerrain",
            "Density": { "Type": "Constant", "Value": 0.0 }
        },
        "MaterialProvider": {
            "Type": "Constant",
            "Material": "stone"
        },
        "Props": [],
        "EnvironmentProvider": { "Type": "Constant", "Environment": "default" },
        "TintProvider": { "Type": "Constant", "Color": "#7CFC00" }
    });
    fs::write(
        gen.join("Biomes/DefaultBiome.json"),
        serde_json::to_string_pretty(&biome).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let instances_dir = target.join("Server").join("Instances").join("DefaultInstance");
    fs::create_dir_all(&instances_dir).map_err(|e| e.to_string())?;

    let instance = serde_json::json!({
        "$Comment": "Default instance for testing world generation",
        "RequiredPlugins": {},
        "ChunkStorage": { "Type": "Hytale" },
        "GameMode": "Creative",
        "IsPvpEnabled": false,
        "IsSpawningNPC": true,
        "GameTime": "0001-01-01T07:00:00Z",
        "UUID": {
            "$binary": "AZKxiVAMQfWIS0qBsBfjzQ==",
            "$type": "04"
        },
        "GameplayConfig": "Default",
        "IsCompassUpdating": true,
        "IsTicking": true,
        "IsGameTimePaused": false,
        "IsObjectiveMarkersEnabled": true,
        "IsAllNPCFrozen": false,
        "IsSavingPlayers": true,
        "WorldGen": {
            "Type": "HytaleGenerator",
            "WorldStructure": "MainWorld"
        },
        "IsSpawnMarkersEnabled": true,
        "DeleteOnRemove": false,
        "Version": 2
    });
    fs::write(
        instances_dir.join("instance.bson"),
        serde_json::to_string_pretty(&instance).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    let dir_name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled");
    let manifest = serde_json::json!({
        "name": dir_name,
        "version": "1.0.0",
        "description": ""
    });
    fs::write(
        target.join("manifest.json"),
        serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    // Register the new project as an allowed root
    path_scope::register_allowed_root(target);

    Ok(())
}

/// Create a new project from a bundled template.
#[tauri::command]
pub fn create_from_template(
    app: tauri::AppHandle,
    template_name: String,
    target_path: String,
) -> Result<(), String> {
    let resource_dir = app.path().resource_dir().ok();
    crate::io::template::create_from_template(&template_name, &target_path, resource_dir)
        .map_err(|e| e.to_string())?;
    // Register the new project as an allowed root
    path_scope::register_allowed_root(Path::new(&target_path));
    Ok(())
}

/// Entry representing a single biome JSON file inside a bundled template.
#[derive(serde::Serialize)]
pub struct TemplateBiomeEntry {
    pub template_name: String,
    pub display_name: String,
    pub biome_name: String,
    pub path: String,
}

/// List all biome JSON files found inside bundled templates.
#[tauri::command]
pub fn list_template_biomes(app: tauri::AppHandle) -> Result<Vec<TemplateBiomeEntry>, String> {
    let resource_dir = app.path().resource_dir().ok();
    let templates_root = crate::io::template::find_templates_root(resource_dir)
        .map_err(|e| e.to_string())?;

    let mut entries: Vec<TemplateBiomeEntry> = Vec::new();

    let read_dir = fs::read_dir(&templates_root).map_err(|e| e.to_string())?;
    for template_entry in read_dir {
        let template_entry = template_entry.map_err(|e| e.to_string())?;
        if !template_entry.path().is_dir() {
            continue;
        }
        let template_name = template_entry.file_name().to_string_lossy().to_string();
        let display_name = if template_name.eq_ignore_ascii_case("references") {
            "Hytale Reference Biomes".to_string()
        } else {
            template_name
                .split(|c: char| c == '-' || c == '_')
                .map(|w| {
                    let mut c = w.chars();
                    match c.next() {
                        None => String::new(),
                        Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ")
        };

        collect_biome_files(
            &template_entry.path(),
            &template_name,
            &display_name,
            &mut entries,
        );
    }

    entries.sort_by(|a, b| a.template_name.cmp(&b.template_name));
    Ok(entries)
}

fn is_biome_folder(name: &std::ffi::OsStr) -> bool {
    let s = name.to_string_lossy();
    s.eq_ignore_ascii_case("Biomes") || s.eq_ignore_ascii_case("references")
}

const MAX_TEMPLATE_DEPTH: usize = 20;

fn collect_biome_files(
    dir: &Path,
    template_name: &str,
    display_name: &str,
    out: &mut Vec<TemplateBiomeEntry>,
) {
    collect_biome_files_inner(dir, template_name, display_name, out, 0);
}

fn collect_biome_files_inner(
    dir: &Path,
    template_name: &str,
    display_name: &str,
    out: &mut Vec<TemplateBiomeEntry>,
    depth: usize,
) {
    if depth > MAX_TEMPLATE_DEPTH {
        return;
    }
    let Ok(read_dir) = fs::read_dir(dir) else { return };
    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_symlink() {
            continue;
        }
        if path.is_dir() {
            collect_biome_files_inner(&path, template_name, display_name, out, depth + 1);
        } else if path
            .parent()
            .and_then(|p| p.file_name())
            .map(|n| is_biome_folder(n))
            .unwrap_or(false)
            && path
                .extension()
                .map(|e| e.eq_ignore_ascii_case("json"))
                .unwrap_or(false)
        {
            let biome_name = path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            out.push(TemplateBiomeEntry {
                template_name: template_name.to_string(),
                display_name: display_name.to_string(),
                biome_name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }
}

// ── Explorer / filesystem utility commands ───────────────────────────────────

/// Reveal a file or folder in the OS file explorer.
#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);

    #[cfg(target_os = "windows")]
    {
        let path_str = target.to_string_lossy().replace('/', "\\");
        if target.is_file() {
            Command::new("explorer")
                .arg("/select,")
                .arg(&path_str)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("explorer")
                .arg(&path_str)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let dir = if target.is_file() {
            target.parent().unwrap_or(Path::new("/")).to_path_buf()
        } else {
            target
        };
        Command::new("xdg-open")
            .arg(&dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
