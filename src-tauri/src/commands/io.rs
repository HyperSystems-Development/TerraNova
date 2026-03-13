use crate::io::asset_pack::{AssetPack, DirectoryEntry};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

/// Open an asset pack directory and parse all JSON files.
#[tauri::command]
pub fn open_asset_pack(path: String) -> Result<AssetPack, String> {
    let pack_path = PathBuf::from(&path);
    if !pack_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    AssetPack::load(&pack_path).map_err(|e| e.to_string())
}

/// Save an asset pack back to disk (atomic write via temp + rename).
#[tauri::command]
pub fn save_asset_pack(pack: AssetPack) -> Result<(), String> {
    pack.save().map_err(|e| e.to_string())
}

/// Read a single JSON asset file.
#[tauri::command]
pub fn read_asset_file(path: String) -> Result<Value, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid JSON in {}: {}", path, e))
}

/// Write a single JSON asset file with atomic write.
#[tauri::command]
pub fn write_asset_file(path: String, content: Value) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&content)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    let file_path = Path::new(&path);
    let temp_path = file_path.with_extension("tmp");

    fs::write(&temp_path, &json).map_err(|e| format!("Failed to write temp file: {}", e))?;
    if let Err(e) = fs::rename(&temp_path, file_path) {
        let _ = fs::remove_file(&temp_path); // clean up leaked .tmp
        return Err(format!("Failed to rename: {}", e));
    }

    Ok(())
}

/// Write a JSON asset file to an arbitrary path, creating parent directories.
#[tauri::command]
pub fn export_asset_file(path: String, content: Value) -> Result<(), String> {
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
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

/// Copy a file from source to destination, creating parent directories.
#[tauri::command]
pub fn copy_file(source: String, destination: String) -> Result<(), String> {
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
    let dir_path = PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    DirectoryEntry::scan(&dir_path).map_err(|e| e.to_string())
}

/// Resolve a bundled Hytale asset directory or file path.
#[tauri::command]
pub fn resolve_bundled_hytale_asset_path(
    app: tauri::AppHandle,
    relative_path: String,
) -> Result<String, String> {
    let resource_dir = app.path().resource_dir().ok();
    crate::io::hytale_assets::resolve_hytale_asset_path(&relative_path, resource_dir)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

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

    // Create subdirectories
    for sub in &["Biomes", "Settings", "WorldStructures"] {
        fs::create_dir_all(gen.join(sub)).map_err(|e| e.to_string())?;
    }

    // Settings/Settings.json
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

    // WorldStructures/MainWorld.json
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

    // Biomes/DefaultBiome.json
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

    // Server/Instances/DefaultInstance/instance.bson
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

    // TerraNova manifest at project root (used for export metadata)
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
        .map_err(|e| e.to_string())
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

        // Walk subdirectories looking for Biomes/**/*.json
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
        // Skip symlinks to prevent cycles
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

/// Reveal a file or folder in the OS file explorer.
/// On Windows: opens Explorer with the item selected.
/// On macOS:   opens Finder with the item selected via `open -R`.
/// On Linux:   opens the parent directory with xdg-open.
#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);

    #[cfg(target_os = "windows")]
    {
        // explorer.exe requires the path to use backslashes and be passed as
        // two separate arguments: "/select," and then the path itself.
        // Passing them concatenated as one arg causes Explorer to ignore the
        // /select flag and just open the folder root.
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
