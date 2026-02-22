use crate::io::asset_pack::{AssetPack, DirectoryEntry};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
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
    fs::rename(&temp_path, file_path).map_err(|e| format!("Failed to rename: {}", e))?;

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
    fs::rename(&temp_path, file_path).map_err(|e| format!("Failed to rename: {}", e))?;
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
    fs::rename(&temp_path, file_path).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(())
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
        serde_json::to_string_pretty(&settings).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // WorldStructures/MainWorld.json
    let world = serde_json::json!({
        "Type": "NoiseRange",
        "DefaultBiome": "default_biome",
        "DefaultTransitionDistance": 16,
        "MaxBiomeEdgeDistance": 32,
        "Biomes": [
            { "Biome": "default_biome", "Min": -1.0, "Max": 1.0 }
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
        serde_json::to_string_pretty(&world).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // Biomes/DefaultBiome.json
    let biome = serde_json::json!({
        "Name": "default_biome",
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
        serde_json::to_string_pretty(&biome).unwrap(),
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
        serde_json::to_string_pretty(&manifest).unwrap(),
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
