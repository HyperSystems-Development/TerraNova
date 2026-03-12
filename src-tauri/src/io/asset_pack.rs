use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Represents a loaded asset pack directory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetPack {
    /// Root directory path of the asset pack.
    pub path: String,
    /// Map of relative file paths to parsed JSON values.
    pub assets: HashMap<String, Value>,
}

/// A directory entry for the sidebar tree view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<DirectoryEntry>>,
}

impl AssetPack {
    /// Load an asset pack from a directory, parsing all JSON files.
    pub fn load(root: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let mut assets = HashMap::new();
        Self::scan_dir(root, root, &mut assets)?;

        Ok(AssetPack {
            path: root.to_string_lossy().to_string(),
            assets,
        })
    }

    /// Save all assets back to disk with atomic writes.
    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        let root = PathBuf::from(&self.path);

        for (relative_path, value) in &self.assets {
            let file_path = root.join(relative_path);

            // Ensure parent directory exists
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Atomic write: write to temp, then rename
            let json = serde_json::to_string_pretty(value)?;
            let temp_path = file_path.with_extension("tmp");
            fs::write(&temp_path, &json)?;
            fs::rename(&temp_path, &file_path)?;
        }

        Ok(())
    }

    fn scan_dir(
        root: &Path,
        dir: &Path,
        assets: &mut HashMap<String, Value>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let entries = fs::read_dir(dir)?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                Self::scan_dir(root, &path, assets)?;
            } else if path.extension().is_some_and(|ext| ext == "json" || ext == "bson") {
                let content = fs::read_to_string(&path)?;
                let value: Value = serde_json::from_str(&content)?;
                let relative = path
                    .strip_prefix(root)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .to_string();
                assets.insert(relative, value);
            }
        }

        Ok(())
    }
}

impl DirectoryEntry {
    /// Scan a directory and return its contents as a tree of entries.
    pub fn scan(dir: &Path) -> Result<Vec<DirectoryEntry>, Box<dyn std::error::Error>> {
        let mut entries = Vec::new();

        let mut dir_entries: Vec<_> = fs::read_dir(dir)?.collect::<Result<_, _>>()?;
        dir_entries.sort_by_key(|e| e.file_name());

        for entry in dir_entries {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files/dirs
            if name.starts_with('.') {
                continue;
            }

            let is_dir = path.is_dir();
            let children = if is_dir {
                Some(Self::scan(&path)?)
            } else {
                None
            };

            entries.push(DirectoryEntry {
                name,
                path: path.to_string_lossy().to_string(),
                is_dir,
                children,
            });
        }

        Ok(entries)
    }
}
