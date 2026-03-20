use std::fs;
use std::path::{Path, PathBuf};

pub const BUNDLED_TEMPLATE_DIRS: &[&str] = &[
    "void",
    "forest-hills",
    "shattered-archipelago",
    "tropical-pirate-islands",
    "eldritch-spirelands",
    "aqua-subterrain",
    "mycelium-growth",
];

pub fn is_visible_template_dir(name: &str) -> bool {
    name.eq_ignore_ascii_case("references")
        || BUNDLED_TEMPLATE_DIRS
            .iter()
            .any(|entry| entry.eq_ignore_ascii_case(name))
}

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

fn copy_template_contents(src: &Path, dst: &Path) -> Result<(), Box<dyn std::error::Error>> {
    fs::create_dir_all(dst)?;

    let has_server_root = src.join("Server").is_dir();
    let has_legacy_generator_root = src.join("HytaleGenerator").is_dir();

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let entry_name = file_name.to_string_lossy();

        if entry_path.is_symlink() {
            continue;
        }

        let dest_path = if has_server_root && entry_name.eq_ignore_ascii_case("HytaleGenerator") {
            // Prefer the real Server/ tree when a template still carries a
            // leftover legacy HytaleGenerator/ root alongside it.
            continue;
        } else if has_legacy_generator_root && entry_name.eq_ignore_ascii_case("HytaleGenerator") {
            dst.join("Server").join("HytaleGenerator")
        } else {
            dst.join(&file_name)
        };

        if entry_path.is_dir() {
            copy_dir_recursive(&entry_path, &dest_path)?;
        } else {
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(&entry_path, &dest_path)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TempDirGuard {
        path: PathBuf,
    }

    impl TempDirGuard {
        fn new(prefix: &str) -> Self {
            let unique = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock drift")
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "terranova-{prefix}-{}-{unique}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("create temp dir");
            Self { path }
        }
    }

    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn create_from_template_wraps_legacy_hytale_generator_root() {
        let resource_dir = TempDirGuard::new("template-resource");
        let template_dir = resource_dir.path.join("templates").join("legacy-template");
        let world_dir = template_dir.join("HytaleGenerator").join("WorldStructures");
        fs::create_dir_all(&world_dir).expect("create world dir");
        fs::write(world_dir.join("MainWorld.json"), "{}").expect("write world");
        fs::write(template_dir.join("manifest.json"), "{}").expect("write manifest");

        let target_dir = TempDirGuard::new("template-target");
        let output = target_dir.path.join("GeneratedWorld");

        create_from_template(
            "legacy-template",
            output.to_str().expect("utf8 path"),
            Some(resource_dir.path.clone()),
        )
        .expect("copy template");

        assert!(output
            .join("Server")
            .join("HytaleGenerator")
            .join("WorldStructures")
            .join("MainWorld.json")
            .is_file());
        assert!(!output.join("HytaleGenerator").exists());
        assert!(output.join("manifest.json").is_file());
    }

    #[test]
    fn create_from_template_prefers_server_root_when_both_layouts_exist() {
        let resource_dir = TempDirGuard::new("template-resource-both");
        let template_dir = resource_dir.path.join("templates").join("server-template");
        let server_world_dir = template_dir
            .join("Server")
            .join("HytaleGenerator")
            .join("WorldStructures");
        let legacy_world_dir = template_dir.join("HytaleGenerator").join("WorldStructures");
        fs::create_dir_all(&server_world_dir).expect("create server world dir");
        fs::create_dir_all(&legacy_world_dir).expect("create legacy world dir");
        fs::write(server_world_dir.join("MainWorld.json"), r#"{"source":"server"}"#)
            .expect("write server world");
        fs::write(legacy_world_dir.join("MainWorld.json"), r#"{"source":"legacy"}"#)
            .expect("write legacy world");

        let target_dir = TempDirGuard::new("template-target-both");
        let output = target_dir.path.join("GeneratedWorld");

        create_from_template(
            "server-template",
            output.to_str().expect("utf8 path"),
            Some(resource_dir.path.clone()),
        )
        .expect("copy template");

        let copied = fs::read_to_string(
            output
                .join("Server")
                .join("HytaleGenerator")
                .join("WorldStructures")
                .join("MainWorld.json"),
        )
        .expect("read copied world");

        assert_eq!(copied, r#"{"source":"server"}"#);
        assert!(!output.join("HytaleGenerator").exists());
    }

    #[test]
    fn visible_template_dirs_match_bundled_set_and_references() {
        assert!(is_visible_template_dir("void"));
        assert!(is_visible_template_dir("aqua-subterrain"));
        assert!(is_visible_template_dir("mycelium-growth"));
        assert!(is_visible_template_dir("references"));
        assert!(!is_visible_template_dir("FirstTry"));
        assert!(!is_visible_template_dir("FHillsTest"));
    }
}
