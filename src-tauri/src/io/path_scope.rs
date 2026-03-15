//! Path scope validation for filesystem commands.
//!
//! All filesystem commands that accept user-supplied paths should validate them
//! against registered allowed roots before performing any I/O. This prevents a
//! compromised webview from reading/writing arbitrary filesystem locations.

use std::path::{Path, PathBuf};
use std::sync::RwLock;

/// Global set of allowed root directories. Paths passed to filesystem commands
/// must fall under one of these roots (after canonicalization).
static ALLOWED_ROOTS: RwLock<Vec<PathBuf>> = RwLock::new(Vec::new());

/// Register an allowed root directory. Called when the user opens a project or
/// when the hytale-assets cache is initialised.
pub fn register_allowed_root(root: &Path) {
    if let Ok(canonical) = std::fs::canonicalize(root) {
        let mut roots = ALLOWED_ROOTS.write().unwrap_or_else(|e| e.into_inner());
        if !roots.iter().any(|r| r == &canonical) {
            roots.push(canonical);
        }
    }
}

/// Remove a previously registered root (e.g. when a project is closed).
pub fn unregister_allowed_root(root: &Path) {
    if let Ok(canonical) = std::fs::canonicalize(root) {
        let mut roots = ALLOWED_ROOTS.write().unwrap_or_else(|e| e.into_inner());
        roots.retain(|r| r != &canonical);
    }
}

/// Validate that `path` falls under at least one registered allowed root.
///
/// For files that don't exist yet (writes/creates), we canonicalize the nearest
/// existing ancestor and check that.
pub fn validate_path(path: &str) -> Result<PathBuf, String> {
    let target = PathBuf::from(path);

    // Try to canonicalize the path directly (works if it exists)
    let canonical = if target.exists() {
        target.canonicalize().map_err(|e| format!("Invalid path: {}", e))?
    } else {
        // For new files: canonicalize the nearest existing ancestor
        let mut ancestor = target.clone();
        loop {
            if let Some(parent) = ancestor.parent() {
                if parent.exists() {
                    let canon_parent = parent
                        .canonicalize()
                        .map_err(|e| format!("Invalid path: {}", e))?;
                    // Re-append the remaining segments
                    let suffix = target
                        .strip_prefix(parent)
                        .unwrap_or(target.file_name().map(Path::new).unwrap_or(Path::new("")));
                    break canon_parent.join(suffix);
                }
                ancestor = parent.to_path_buf();
            } else {
                return Err("Path has no valid ancestor directory".into());
            }
        }
    };

    let roots = ALLOWED_ROOTS.read().unwrap_or_else(|e| e.into_inner());

    // If no roots are registered yet, allow everything (backward compat during
    // startup before a project is opened). This is a deliberate tradeoff:
    // commands like show_in_folder and path_exists may be called before any
    // project is open.
    if roots.is_empty() {
        return Ok(canonical);
    }

    for root in roots.iter() {
        if canonical.starts_with(root) {
            return Ok(canonical);
        }
    }

    Err(format!(
        "Path is outside allowed project scope: {}",
        target.display()
    ))
}

/// Convenience: validate and return the original string (for commands that
/// pass strings through to std::fs).
pub fn validate_path_str(path: &str) -> Result<String, String> {
    validate_path(path)?;
    Ok(path.to_string())
}
