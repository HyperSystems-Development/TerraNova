use std::fs;
use std::path::{Path, PathBuf};

/// Create a new project from a bundled template.
///
/// Copies the template directory contents to the target path.
/// `resource_dir` should be the Tauri resource directory for production builds.
pub fn create_from_template(
    template_name: &str,
    target_path: &str,
    resource_dir: Option<PathBuf>,
) -> Result<(), Box<dyn std::error::Error>> {
    let template_dir = get_template_dir(template_name, resource_dir)?;
    let target = Path::new(target_path);

    if target.exists() && fs::read_dir(target)?.next().is_some() {
        return Err("Target directory is not empty".into());
    }

    fs::create_dir_all(target)?;
    copy_dir_recursive(&template_dir, target)?;

    Ok(())
}

/// Resolve the root `templates/` directory (works in dev and production builds).
pub fn find_templates_root(
    resource_dir: Option<std::path::PathBuf>,
) -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    // 1. Tauri resource directory (production)
    if let Some(res_dir) = resource_dir {
        let p = res_dir.join("templates");
        if p.is_dir() {
            return Ok(p);
        }
    }

    // 2. Development path: <workspace>/templates/
    let dev_path = std::env::current_dir()?
        .parent()
        .unwrap_or(Path::new("."))
        .join("templates");
    if dev_path.is_dir() {
        return Ok(dev_path);
    }

    // 3. Relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        let p = exe_path.parent().unwrap_or(Path::new(".")).join("templates");
        if p.is_dir() {
            return Ok(p);
        }
    }

    Err("templates/ directory not found".into())
}

/// Validate that a template name is a simple directory name with no path
/// traversal components (no `/`, `\`, or `..`).
fn validate_template_name(name: &str) -> Result<(), Box<dyn std::error::Error>> {
    if name.is_empty() {
        return Err("Template name must not be empty".into());
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err(format!(
            "Template name '{}' contains invalid path characters",
            name
        )
        .into());
    }
    Ok(())
}

fn get_template_dir(
    template_name: &str,
    resource_dir: Option<PathBuf>,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    validate_template_name(template_name)?;

    // 1. Tauri resource directory (production builds)
    if let Some(res_dir) = resource_dir {
        let resource_path = res_dir.join("templates").join(template_name);
        if resource_path.is_dir() {
            return Ok(resource_path);
        }
    }

    // 2. Development path: templates/ at the project root
    let dev_path = std::env::current_dir()?
        .parent()
        .unwrap_or(Path::new("."))
        .join("templates")
        .join(template_name);

    if dev_path.is_dir() {
        return Ok(dev_path);
    }

    // 3. Relative to executable (fallback)
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().unwrap_or(Path::new("."));
        let resource_path = exe_dir.join("templates").join(template_name);
        if resource_path.is_dir() {
            return Ok(resource_path);
        }
    }

    Err(format!("Template '{}' not found", template_name).into())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let dest_path = dst.join(entry.file_name());

        // Skip symlinks to prevent following links outside the template directory
        if entry_path.is_symlink() {
            continue;
        }

        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &dest_path)?;
        } else {
            fs::copy(&entry_path, &dest_path)?;
        }
    }

    Ok(())
}
