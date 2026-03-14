use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use zip::ZipArchive;
use tauri::{Emitter, Window};
use std::sync::atomic::{AtomicBool, Ordering};

// Cancellation flag used to abort long-running sync operations from another
// thread/command. Set to `true` by the cancel command and checked frequently
// inside the copying/unzipping loops.
static CANCEL_SYNC: AtomicBool = AtomicBool::new(false);

const SYNC_MANIFEST_NAME: &str = "sync-manifest.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncManifest {
    pub synced_at: String,
    pub source_path: String,
    pub files_written: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetStalenessInfo {
    /// ISO-8601 timestamp of the last successful sync, or null if never synced.
    pub synced_at: Option<String>,
    /// Source path recorded in the manifest.
    pub source_path: Option<String>,
    /// Whether the source folder contains files newer than the last sync.
    pub is_stale: bool,
    /// The path of the newest file found in the source (for debugging).
    pub newest_source_file: Option<String>,
    /// Unix timestamp (seconds) of the newest source file, or null.
    pub newest_source_secs: Option<u64>,
    /// Unix timestamp (seconds) of the last sync, or null.
    pub synced_at_secs: Option<u64>,
}

fn now_iso8601() -> String {
    // Simple ISO-8601 UTC string without external crate: YYYY-MM-DDTHH:MM:SSZ
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let s = secs % 60;
    let m = (secs / 60) % 60;
    let h = (secs / 3600) % 24;
    let total_days = secs / 86400;
    // Days since 1970-01-01
    let (year, month, day) = days_to_ymd(total_days);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", year, month, day, h, m, s)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut year = 1970u64;
    loop {
        let leap = is_leap(year);
        let days_in_year = if leap { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }
    let month_days: [u64; 12] = [31, if is_leap(year) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut month = 1u64;
    for &md in &month_days {
        if days < md {
            break;
        }
        days -= md;
        month += 1;
    }
    (year, month, days + 1)
}

fn is_leap(year: u64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

fn write_sync_manifest(cache_root: &Path, source_path: &Path, files_written: u64) {
    let manifest = SyncManifest {
        synced_at: now_iso8601(),
        source_path: source_path.to_string_lossy().to_string(),
        files_written,
    };
    if let Ok(json) = serde_json::to_string_pretty(&manifest) {
        let _ = fs::write(cache_root.join(SYNC_MANIFEST_NAME), json);
    }
}

fn read_sync_manifest(cache_root: &Path) -> Option<SyncManifest> {
    let path = cache_root.join(SYNC_MANIFEST_NAME);
    let content = fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

fn parse_iso8601_to_secs(ts: &str) -> Option<u64> {
    // Expects YYYY-MM-DDTHH:MM:SSZ
    let ts = ts.trim_end_matches('Z');
    let parts: Vec<&str> = ts.splitn(2, 'T').collect();
    if parts.len() != 2 {
        return None;
    }
    let date_parts: Vec<u64> = parts[0].split('-').filter_map(|p| p.parse().ok()).collect();
    let time_parts: Vec<u64> = parts[1].split(':').filter_map(|p| p.parse().ok()).collect();
    if date_parts.len() != 3 || time_parts.len() != 3 {
        return None;
    }
    let (y, mo, d) = (date_parts[0], date_parts[1], date_parts[2]);
    let (h, mi, s) = (time_parts[0], time_parts[1], time_parts[2]);
    // Count days from epoch
    let mut total_days: u64 = 0;
    for yr in 1970..y {
        total_days += if is_leap(yr) { 366 } else { 365 };
    }
    let month_days: [u64; 12] = [31, if is_leap(y) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for mi_idx in 0..(mo.saturating_sub(1)) as usize {
        total_days += month_days[mi_idx];
    }
    total_days += d.saturating_sub(1);
    Some(total_days * 86400 + h * 3600 + mi * 60 + s)
}

/// Walk a directory tree and return the newest mtime in seconds since epoch.
fn newest_mtime_in_dir(dir: &Path) -> Option<(u64, PathBuf)> {
    let mut newest_secs = 0u64;
    let mut newest_path = PathBuf::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let Ok(entries) = fs::read_dir(&current) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if let Ok(meta) = entry.metadata() {
                if let Ok(modified) = meta.modified() {
                    let secs = modified.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
                    if secs > newest_secs {
                        newest_secs = secs;
                        newest_path = path;
                    }
                }
            }
        }
    }
    if newest_secs > 0 { Some((newest_secs, newest_path)) } else { None }
}

pub fn check_asset_staleness(source_path: &str) -> AssetStalenessInfo {
    let cache_root = match get_hytale_assets_root() {
        Ok(p) => p,
        Err(_) => return AssetStalenessInfo {
            synced_at: None,
            source_path: None,
            is_stale: false,
            newest_source_file: None,
            newest_source_secs: None,
            synced_at_secs: None,
        },
    };

    let manifest = read_sync_manifest(&cache_root);
    let synced_at = manifest.as_ref().map(|m| m.synced_at.clone());
    let manifest_source = manifest.as_ref().map(|m| m.source_path.clone());
    let synced_at_secs = synced_at.as_deref().and_then(parse_iso8601_to_secs);

    let source_dir = Path::new(source_path);
    // For a zip source, check the zip file mtime directly.
    let (newest_secs, newest_path) = if source_dir.is_file() {
        source_dir
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| (d.as_secs(), source_dir.to_path_buf()))
            .unwrap_or((0, PathBuf::new()))
    } else if source_dir.is_dir() {
        newest_mtime_in_dir(source_dir).unwrap_or((0, PathBuf::new()))
    } else {
        (0, PathBuf::new())
    };

    let is_stale = match (synced_at_secs, newest_secs) {
        (Some(synced), src) if src > 0 => src > synced,
        _ => false,
    };

    AssetStalenessInfo {
        synced_at,
        source_path: manifest_source,
        is_stale,
        newest_source_file: if newest_secs > 0 { Some(newest_path.to_string_lossy().to_string()) } else { None },
        newest_source_secs: if newest_secs > 0 { Some(newest_secs) } else { None },
        synced_at_secs,
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HytaleAssetSyncResult {
    pub cache_root: String,
    pub source_path: String,
    pub source_kind: String,
    pub files_written: u64,
    pub common_overlay_path: Option<String>,
    pub common_overlay_files_written: u64,
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

#[allow(dead_code)]
fn copy_directory_recursive(source: &Path, destination: &Path) -> Result<u64, Box<dyn std::error::Error>> {
    let mut files_written = 0;

    if !source.exists() {
        return Ok(0);
    }

    fs::create_dir_all(destination)?;

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        // Check for cancellation request
        if CANCEL_SYNC.load(Ordering::SeqCst) {
            return Err("sync cancelled by user".into());
        }
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

fn resolve_common_overlay_root(source_path: &Path) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if !source_path.exists() {
        return Err(format!(
            "External Common asset source not found: {}",
            source_path.display()
        )
        .into());
    }

    if source_path.is_file() {
        return Err("External Common asset source must be a directory".into());
    }

    let direct_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default();
    if direct_name.eq_ignore_ascii_case("Common") {
        return Ok(source_path.to_path_buf());
    }

    let common_child = source_path.join("Common");
    if common_child.is_dir() {
        return Ok(common_child);
    }

    Err("External Common asset source must point to a Common folder or a folder containing Common".into())
}

#[allow(dead_code)]
fn extract_assets_zip(zip_path: &Path, cache_root: &Path) -> Result<u64, Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;
    let mut files_written = 0;

    for index in 0..archive.len() {
        // Check for cancellation request
        if CANCEL_SYNC.load(Ordering::SeqCst) {
            return Err("sync cancelled by user".into());
        }
        let mut entry = archive.by_index(index)?;
        let entry_path = sanitize_archive_entry_path(entry.name())?;
        // Only extract entries that live under Common/ or Server/ at the root of the archive.
        // Use the sanitized PathBuf to check the first component so we handle both '/' and '\\'.
        match entry_path.components().next() {
            Some(Component::Normal(first)) => {
                let first_lower = first.to_string_lossy().to_ascii_lowercase();
                if !(first_lower == "common" || first_lower == "server") {
                    continue;
                }
            }
            _ => continue,
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

#[allow(dead_code)]
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

#[derive(Serialize)]
struct SyncProgressEvent {
    files_written: u64,
    total_files: Option<u64>,
    current_file: Option<String>,
    percent: Option<f32>,
}

/// Count non-directory files under a path (recursively).
fn count_files_in_dir(dir: &Path) -> Result<u64, Box<dyn std::error::Error>> {
    let mut count: u64 = 0;
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let Ok(entries) = fs::read_dir(&current) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else {
                count += 1;
            }
        }
    }
    Ok(count)
}

fn copy_directory_recursive_with_progress(
    source: &Path,
    destination: &Path,
    window: &Window,
    total_files_opt: Option<u64>,
    files_written: &mut u64,
) -> Result<u64, Box<dyn std::error::Error>> {
    if !source.exists() {
        return Ok(0);
    }

    fs::create_dir_all(destination)?;

    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());

        if source_path.is_dir() {
            *files_written += copy_directory_recursive_with_progress(&source_path, &destination_path, window, total_files_opt, files_written)?;
        } else {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&source_path, &destination_path)?;
            *files_written += 1;

            // Emit progress
            let percent = total_files_opt.map(|total| (*files_written as f32) / (total as f32) * 100.0);
            let _ = window.emit(
                "hytale-sync-progress",
                &SyncProgressEvent {
                    files_written: *files_written,
                    total_files: total_files_opt,
                    current_file: Some(source_path.to_string_lossy().to_string()),
                    percent,
                },
            );
        }
    }

    Ok(*files_written)
}

fn extract_assets_zip_with_progress(
    zip_path: &Path,
    cache_root: &Path,
    window: &Window,
    total_files: u64,
    files_written: &mut u64,
) -> Result<u64, Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index)?;
        let entry_path = sanitize_archive_entry_path(entry.name())?;
        // Only extract entries that live under Common/ or Server/ at the root of the archive.
        match entry_path.components().next() {
            Some(Component::Normal(first)) => {
                let first_lower = first.to_string_lossy().to_ascii_lowercase();
                if !(first_lower == "common" || first_lower == "server") {
                    continue;
                }
            }
            _ => continue,
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
        *files_written += 1;

        let percent = if total_files > 0 { Some((*files_written as f32) / (total_files as f32) * 100.0) } else { None };
        let _ = window.emit(
            "hytale-sync-progress",
            &SyncProgressEvent {
                files_written: *files_written,
                total_files: Some(total_files),
                current_file: Some(entry_path.to_string_lossy().to_string()),
                percent,
            },
        );
    }

    Ok(*files_written)
}

/// Sync Hytale assets with progress events emitted to the provided window.
pub fn sync_hytale_assets_from_source_with_progress(
    source_path: &Path,
    common_overlay_path: Option<&Path>,
    window: &Window,
) -> Result<HytaleAssetSyncResult, Box<dyn std::error::Error>> {
    if !source_path.exists() {
        return Err(format!("Hytale asset source not found: {}", source_path.display()).into());
    }

    let cache_root = ensure_hytale_assets_root()?;
    clear_cached_asset_subtrees(&cache_root)?;

    // Determine total file count for progress if possible
    let total_files_opt = if source_path.is_file() {
        // Zip: count only files under Common/ or Server/ so progress is meaningful.
        let file = File::open(source_path)?;
        let mut archive = ZipArchive::new(file)?;
        let mut count: u64 = 0;
        for i in 0..archive.len() {
            let entry = archive.by_index(i)?;
            // sanitize path and check first component
            if let Ok(entry_path) = sanitize_archive_entry_path(entry.name()) {
                if let Some(Component::Normal(first)) = entry_path.components().next() {
                    let first_lower = first.to_string_lossy().to_ascii_lowercase();
                    if (first_lower == "common" || first_lower == "server") && !entry.is_dir() {
                        count += 1;
                    }
                }
            }
        }
        Some(count)
    } else if source_path.is_dir() {
        let mut total = 0u64;
        total += count_files_in_dir(&source_path.join("Common")).unwrap_or(0);
        total += count_files_in_dir(&source_path.join("Server")).unwrap_or(0);
        Some(total)
    } else {
        None
    };

    // Clear any previous cancellation request and emit start
    CANCEL_SYNC.store(false, Ordering::SeqCst);
    let _ = window.emit("hytale-sync-start", &serde_json::json!({ "total_files": total_files_opt }));

    let mut files_written = 0u64;
    let (files_written_inner, source_kind) = if source_path.is_file() {
        // ensure it's zip
        let is_zip = source_path
            .extension()
            .and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("zip"));
        if !is_zip {
            return Err("Expected a .zip file or a directory containing Assets.zip".into());
        }
        (extract_assets_zip_with_progress(source_path, &cache_root, window, total_files_opt.unwrap_or(0), &mut files_written)?, "zip".into())
    } else {
        (copy_directory_recursive_with_progress(&source_path.join("Common"), &cache_root.join("Common"), window, total_files_opt, &mut files_written)? + copy_directory_recursive_with_progress(&source_path.join("Server"), &cache_root.join("Server"), window, total_files_opt, &mut files_written)?, "directory".into())
    };

    let (common_overlay_path_str, common_overlay_files_written) = if let Some(overlay_path) = common_overlay_path {
        let overlay_root = resolve_common_overlay_root(overlay_path)?;
        let files = copy_directory_recursive_with_progress(&overlay_root, &cache_root.join("Common"), window, total_files_opt, &mut files_written)?;
        (
            Some(overlay_root.to_string_lossy().to_string()),
            files,
        )
    } else {
        (None, 0)
    };

    let total_written = files_written_inner + common_overlay_files_written;
    write_sync_manifest(&cache_root, source_path, total_written);

    let result = HytaleAssetSyncResult {
        cache_root: cache_root.to_string_lossy().to_string(),
        source_path: source_path.to_string_lossy().to_string(),
        source_kind,
        files_written: total_written,
        common_overlay_path: common_overlay_path_str,
        common_overlay_files_written: common_overlay_files_written,
    };

    let _ = window.emit("hytale-sync-complete", &result);

    Ok(result)
}

/// Request cancellation of any active sync. This sets a shared flag which is
/// checked by the progress-aware helpers.
pub fn cancel_hytale_assets_sync() -> Result<(), Box<dyn std::error::Error>> {
    CANCEL_SYNC.store(true, Ordering::SeqCst);
    Ok(())
}

#[allow(dead_code)]
pub fn sync_hytale_assets_from_source(
    source_path: &Path,
    common_overlay_path: Option<&Path>,
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

    let (common_overlay_path, common_overlay_files_written) = if let Some(overlay_path) = common_overlay_path {
        let overlay_root = resolve_common_overlay_root(overlay_path)?;
        let files_written = copy_directory_recursive(&overlay_root, &cache_root.join("Common"))?;
        (
            Some(overlay_root.to_string_lossy().to_string()),
            files_written,
        )
    } else {
        (None, 0)
    };

    let total_written = files_written + common_overlay_files_written;
    write_sync_manifest(&cache_root, source_path, total_written);

    Ok(HytaleAssetSyncResult {
        cache_root: cache_root.to_string_lossy().to_string(),
        source_path: source_path.to_string_lossy().to_string(),
        source_kind,
        files_written,
        common_overlay_path,
        common_overlay_files_written,
    })
}
