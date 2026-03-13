use std::path::{Component, Path, PathBuf};

/// Resolve the root bundled `hytale-assets/Server/` directory in dev and production builds.
pub fn find_hytale_assets_root(
    resource_dir: Option<PathBuf>,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 1. Tauri resource directory (production)
    if let Some(res_dir) = resource_dir {
        let p = res_dir.join("hytale-assets").join("Server");
        if p.is_dir() {
            return Ok(p);
        }
    }

    // 2. Development path: <workspace>/hytale-assets/Server/
    let dev_path = std::env::current_dir()?
        .parent()
        .unwrap_or(Path::new("."))
        .join("hytale-assets")
        .join("Server");
    if dev_path.is_dir() {
        return Ok(dev_path);
    }

    // 3. Relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        let p = exe_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("hytale-assets")
            .join("Server");
        if p.is_dir() {
            return Ok(p);
        }
    }

    Err("hytale-assets/Server directory not found".into())
}

fn sanitize_relative_path(relative_path: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut sanitized = PathBuf::new();
    for component in Path::new(relative_path).components() {
        match component {
            Component::Normal(part) => sanitized.push(part),
            Component::CurDir => {}
            _ => return Err("Invalid bundled Hytale asset path".into()),
        }
    }
    Ok(sanitized)
}

pub fn resolve_hytale_asset_path(
    relative_path: &str,
    resource_dir: Option<PathBuf>,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let root = find_hytale_assets_root(resource_dir)?;
    let sanitized_relative_path = sanitize_relative_path(relative_path)?;
    let resolved = if sanitized_relative_path.as_os_str().is_empty() {
        root
    } else {
        root.join(sanitized_relative_path)
    };

    if resolved.exists() {
        return Ok(resolved);
    }

    Err(format!("Bundled Hytale asset path not found: {}", relative_path).into())
}
