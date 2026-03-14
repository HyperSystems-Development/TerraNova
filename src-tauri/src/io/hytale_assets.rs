use serde::Serialize;
use std::fs::{self, File};
use std::io;
use std::path::{Component, Path, PathBuf};
use zip::ZipArchive;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HytaleAssetSyncResult {
    pub cache_root: String,
    pub source_path: String,
    pub source_kind: String,
    pub files_written: u64,
}

fn default_hytale_assets_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let current_dir = std::env::current_dir()?;
    let direct_candidate = current_dir.join("hytale-assets");
    if direct_candidate.exists() {
        return Ok(direct_candidate);
    }

    let parent_candidate = current_dir
        .parent()
        .unwrap_or(Path::new("."))
        .join("hytale-assets");
    if parent_candidate.exists() {
        return Ok(parent_candidate);
    }

    if let Ok(exe_path) = std::env::current_exe() {
        let exe_candidate = exe_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("hytale-assets");
        if exe_candidate.exists() {
            return Ok(exe_candidate);
        }
    }

    if current_dir
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("src-tauri"))
    {
        return Ok(parent_candidate);
    }

    Ok(direct_candidate)
}

pub fn get_hytale_assets_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let root = default_hytale_assets_root()?;
    if root.is_dir() {
        return Ok(root);
    }

    Err("hytale-assets directory not found".into())
}

pub fn ensure_hytale_assets_root() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let root = default_hytale_assets_root()?;
    fs::create_dir_all(&root)?;
    Ok(root)
}

fn sanitize_relative_path(relative_path: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut sanitized = PathBuf::new();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(part) => sanitized.push(part),
            Component::CurDir => {}
            _ => return Err("Invalid Hytale asset path".into()),
        }
    }
    Ok(sanitized)
}

pub fn resolve_hytale_asset_path(relative_path: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let root = get_hytale_assets_root()?;
    let sanitized_relative_path = sanitize_relative_path(relative_path)?;
    let resolved = if sanitized_relative_path.as_os_str().is_empty() {
        root
    } else {
        root.join(sanitized_relative_path)
    };

    if resolved.exists() {
        return Ok(resolved);
    }

    Err(format!("Hytale asset path not found: {}", relative_path).into())
}

fn clear_cached_asset_subtrees(root: &Path) -> Result<(), Box<dyn std::error::Error>> {
    for subtree in ["Common", "Server"] {
        let subtree_path = root.join(subtree);
        if subtree_path.exists() {
            fs::remove_dir_all(&subtree_path)?;
        }
    }
    Ok(())
}

fn sanitize_archive_entry_path(entry_name: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut sanitized = PathBuf::new();
    for component in Path::new(entry_name).components() {
        match component {
            Component::Normal(part) => sanitized.push(part),
            Component::CurDir => {}
            _ => return Err("Invalid archive entry path".into()),
        }
    }
    Ok(sanitized)
}

fn copy_directory_recursive(source: &Path, destination: &Path) -> Result<u64, Box<dyn std::error::Error>> {
    let mut files_written = 0;

    if !source.exists() {
        return Ok(0);
    }

    fs::create_dir_all(destination)?;

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());

        if source_path.is_dir() {
            files_written += copy_directory_recursive(&source_path, &destination_path)?;
        } else {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&source_path, &destination_path)?;
            files_written += 1;
        }
    }

    Ok(files_written)
}

fn extract_assets_zip(zip_path: &Path, cache_root: &Path) -> Result<u64, Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;
    let mut files_written = 0;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index)?;
        let entry_path = sanitize_archive_entry_path(entry.name())?;
        let entry_path_str = entry_path.to_string_lossy();
        let lower = entry_path_str.to_ascii_lowercase();
        if !(lower.starts_with("common\\") || lower.starts_with("server\\")) {
            continue;
        }

        let output_path = cache_root.join(&entry_path);
        if entry.is_dir() {
            fs::create_dir_all(&output_path)?;
            continue;
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let mut output = File::create(&output_path)?;
        io::copy(&mut entry, &mut output)?;
        files_written += 1;
    }

    Ok(files_written)
}

fn sync_from_directory(source_dir: &Path, cache_root: &Path) -> Result<(u64, String), Box<dyn std::error::Error>> {
    let embedded_zip = source_dir.join("Assets.zip");
    if embedded_zip.is_file() {
        let files_written = extract_assets_zip(&embedded_zip, cache_root)?;
        return Ok((files_written, "zip".into()));
    }

    let mut files_written = 0;
    files_written += copy_directory_recursive(&source_dir.join("Common"), &cache_root.join("Common"))?;
    files_written += copy_directory_recursive(&source_dir.join("Server"), &cache_root.join("Server"))?;

    if files_written == 0 {
        return Err("No Common/ or Server/ asset folders were found in the selected Hytale directory".into());
    }

    Ok((files_written, "directory".into()))
}

pub fn sync_hytale_assets_from_source(
    source_path: &Path,
) -> Result<HytaleAssetSyncResult, Box<dyn std::error::Error>> {
    if !source_path.exists() {
        return Err(format!("Hytale asset source not found: {}", source_path.display()).into());
    }

    let cache_root = ensure_hytale_assets_root()?;
    clear_cached_asset_subtrees(&cache_root)?;

    let (files_written, source_kind) = if source_path.is_file() {
        let is_zip = source_path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("zip"));
        if !is_zip {
            return Err("Expected a .zip file or a directory containing Assets.zip".into());
        }
        (extract_assets_zip(source_path, &cache_root)?, "zip".into())
    } else if source_path.is_dir() {
        sync_from_directory(source_path, &cache_root)?
    } else {
        return Err("Unsupported Hytale asset source path".into());
    };

    Ok(HytaleAssetSyncResult {
        cache_root: cache_root.to_string_lossy().to_string(),
        source_path: source_path.to_string_lossy().to_string(),
        source_kind,
        files_written,
    })
}
