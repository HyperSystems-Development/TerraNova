use crate::schema::validation::{ValidationError, ValidationResult};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// Validate an entire asset pack directory against V2 schema.
#[tauri::command]
pub fn validate_asset_pack(path: String) -> Result<ValidationResult, String> {
    let pack_path = PathBuf::from(&path);
    if !pack_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let mut errors: Vec<ValidationError> = Vec::new();

    // Recursively find all JSON files
    let json_files = find_json_files(&pack_path);

    for file_path in &json_files {
        let relative = file_path
            .strip_prefix(&pack_path)
            .unwrap_or(file_path)
            .to_string_lossy()
            .to_string();

        match fs::read_to_string(file_path) {
            Ok(content) => match serde_json::from_str::<Value>(&content) {
                Ok(value) => {
                    let file_errors = crate::schema::validation::validate_asset(&relative, &value);
                    errors.extend(file_errors);
                }
                Err(e) => {
                    errors.push(ValidationError {
                        file: relative,
                        field: String::new(),
                        message: format!("Invalid JSON: {}", e),
                        severity: crate::schema::validation::Severity::Error,
                    });
                }
            },
            Err(e) => {
                errors.push(ValidationError {
                    file: relative,
                    field: String::new(),
                    message: format!("Cannot read file: {}", e),
                    severity: crate::schema::validation::Severity::Error,
                });
            }
        }
    }

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
        files_checked: json_files.len(),
    })
}

const MAX_DIR_DEPTH: usize = 20;

fn find_json_files(dir: &PathBuf) -> Vec<PathBuf> {
    find_json_files_inner(dir, 0)
}

fn find_json_files_inner(dir: &PathBuf, depth: usize) -> Vec<PathBuf> {
    if depth > MAX_DIR_DEPTH {
        return Vec::new();
    }
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            // Skip symlinks to prevent cycles
            if path.is_symlink() {
                continue;
            }
            if path.is_dir() {
                files.extend(find_json_files_inner(&path, depth + 1));
            } else if path.extension().is_some_and(|ext| ext == "json") {
                files.push(path);
            }
        }
    }
    files
}
