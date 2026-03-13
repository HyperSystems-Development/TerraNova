use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct HardwareInfo {
    pub cpu_cores: usize,
    pub cpu_name: String,
    pub total_ram_mb: u64,
}

#[tauri::command]
pub fn get_hardware_info() -> HardwareInfo {
    let sys = System::new_all();

    let cpu_cores = sys.cpus().len();
    let cpu_name = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_default();
    let total_ram_mb = sys.total_memory() / (1024 * 1024);

    HardwareInfo {
        cpu_cores,
        cpu_name,
        total_ram_mb,
    }
}

// ── GPU detection ──

#[derive(Serialize, Default)]
pub struct GpuInfo {
    pub gpu_name: Option<String>,
    pub vram_mb: Option<u64>,
}

#[tauri::command]
pub fn get_gpu_info() -> GpuInfo {
    detect_gpu().unwrap_or_default()
}

/// Parse a memory value string like "8192 MB", "12 GB", or "12884901888" (bytes) into megabytes.
#[cfg(any(target_os = "macos", test))]
fn parse_memory_value(s: &str) -> Option<u64> {
    let s = s.trim();

    // Try "X GB" or "X MB" patterns
    let lower = s.to_lowercase();
    if let Some(num_str) = lower.strip_suffix("gb").or_else(|| lower.strip_suffix(" gb")) {
        if let Ok(val) = num_str.trim().parse::<f64>() {
            return Some((val * 1024.0) as u64);
        }
    }
    if let Some(num_str) = lower.strip_suffix("mb").or_else(|| lower.strip_suffix(" mb")) {
        if let Ok(val) = num_str.trim().parse::<f64>() {
            return Some(val as u64);
        }
    }

    // Try plain number — if large enough, treat as bytes; otherwise MB
    if let Ok(val) = s.parse::<u64>() {
        if val > 1_000_000 {
            // Likely bytes
            return Some(val / (1024 * 1024));
        }
        return Some(val);
    }

    None
}

// ── Linux GPU detection ──

#[cfg(target_os = "linux")]
fn detect_gpu() -> Option<GpuInfo> {
    // Strategy 1: NVIDIA via nvidia-smi
    if let Some(info) = detect_gpu_nvidia_smi() {
        return Some(info);
    }

    // Strategy 2: AMD via sysfs + lspci
    if let Some(info) = detect_gpu_amd_sysfs() {
        return Some(info);
    }

    // Strategy 3: lspci for GPU name only
    if let Some(name) = detect_gpu_name_lspci() {
        return Some(GpuInfo {
            gpu_name: Some(name),
            vram_mb: None,
        });
    }

    None
}

#[cfg(target_os = "linux")]
fn detect_gpu_nvidia_smi() -> Option<GpuInfo> {
    let output = std::process::Command::new("nvidia-smi")
        .args(["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().next()?.trim().to_string();
    let mut parts = line.splitn(2, ',');
    let name = parts.next()?.trim().to_string();
    let vram_str = parts.next()?.trim();
    let vram_mb = vram_str.parse::<u64>().ok();

    if name.is_empty() {
        return None;
    }

    Some(GpuInfo {
        gpu_name: Some(name),
        vram_mb,
    })
}

#[cfg(target_os = "linux")]
fn detect_gpu_amd_sysfs() -> Option<GpuInfo> {
    // Read VRAM from sysfs (bytes)
    let vram_bytes = std::fs::read_to_string("/sys/class/drm/card0/device/mem_info_vram_total")
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok());
    let vram_mb = vram_bytes.map(|b| b / (1024 * 1024));

    // GPU name from lspci
    let gpu_name = detect_gpu_name_lspci();

    if gpu_name.is_none() && vram_mb.is_none() {
        return None;
    }

    Some(GpuInfo { gpu_name, vram_mb })
}

#[cfg(target_os = "linux")]
fn detect_gpu_name_lspci() -> Option<String> {
    let output = std::process::Command::new("lspci").output().ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let lower = line.to_lowercase();
        if lower.contains("vga") || lower.contains("3d controller") || lower.contains("display controller") {
            // Format: "XX:XX.X VGA compatible controller: Vendor Device Name (rev XX)"
            if let Some((_prefix, device)) = line.split_once(": ") {
                // Split on first ": " after the bus ID category
                if let Some((_category, name)) = device.split_once(": ") {
                    // Strip trailing "(rev XX)" if present
                    let name = if let Some(idx) = name.rfind(" (rev") {
                        &name[..idx]
                    } else {
                        name
                    };
                    let name = name.trim();
                    if !name.is_empty() {
                        return Some(name.to_string());
                    }
                }
            }
        }
    }

    None
}

// ── Windows GPU detection ──

#[cfg(target_os = "windows")]
fn detect_gpu() -> Option<GpuInfo> {
    let gpu_name = detect_gpu_name_windows();
    let vram_mb = detect_vram_windows_registry().or_else(detect_vram_windows_wmi);

    if gpu_name.is_none() && vram_mb.is_none() {
        return None;
    }

    Some(GpuInfo { gpu_name, vram_mb })
}

#[cfg(target_os = "windows")]
fn detect_gpu_name_windows() -> Option<String> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

#[cfg(target_os = "windows")]
fn detect_vram_windows_registry() -> Option<u64> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            r#"(Get-ItemProperty 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000' -Name 'HardwareInformation.qwMemorySize' -ErrorAction SilentlyContinue).'HardwareInformation.qwMemorySize'"#,
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let val_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let bytes = val_str.parse::<u64>().ok()?;
    if bytes == 0 {
        return None;
    }
    Some(bytes / (1024 * 1024))
}

#[cfg(target_os = "windows")]
fn detect_vram_windows_wmi() -> Option<u64> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_VideoController | Select-Object -First 1).AdapterRAM",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let val_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let bytes = val_str.parse::<u64>().ok()?;
    if bytes == 0 {
        return None;
    }
    Some(bytes / (1024 * 1024))
}

// ── macOS GPU detection ──

#[cfg(target_os = "macos")]
fn detect_gpu() -> Option<GpuInfo> {
    let output = std::process::Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-detailLevel", "basic"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut gpu_name: Option<String> = None;
    let mut vram_mb: Option<u64> = None;

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Chipset Model:") {
            if let Some(val) = trimmed.strip_prefix("Chipset Model:") {
                let val = val.trim();
                if !val.is_empty() {
                    gpu_name = Some(val.to_string());
                }
            }
        } else if trimmed.starts_with("VRAM") {
            // e.g. "VRAM (Total): 8 GB" or "VRAM (Dynamic, Max): 72 GB"
            if let Some((_key, val)) = trimmed.split_once(':') {
                vram_mb = parse_memory_value(val);
            }
        }
    }

    // Apple Silicon unified memory fallback: report system RAM
    if vram_mb.is_none() {
        if let Some(ref name) = gpu_name {
            if name.starts_with("Apple") {
                let sys = System::new_all();
                vram_mb = Some(sys.total_memory() / (1024 * 1024));
            }
        }
    }

    if gpu_name.is_none() && vram_mb.is_none() {
        return None;
    }

    Some(GpuInfo { gpu_name, vram_mb })
}

// ── Fallback for other platforms ──

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
fn detect_gpu() -> Option<GpuInfo> {
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_memory_value_gb() {
        assert_eq!(parse_memory_value("8 GB"), Some(8192));
        assert_eq!(parse_memory_value("12GB"), Some(12288));
        assert_eq!(parse_memory_value("  24 GB  "), Some(24576));
    }

    #[test]
    fn test_parse_memory_value_mb() {
        assert_eq!(parse_memory_value("4096 MB"), Some(4096));
        assert_eq!(parse_memory_value("512MB"), Some(512));
    }

    #[test]
    fn test_parse_memory_value_bytes() {
        // 12 GB in bytes
        assert_eq!(parse_memory_value("12884901888"), Some(12288));
    }

    #[test]
    fn test_parse_memory_value_invalid() {
        assert_eq!(parse_memory_value(""), None);
        assert_eq!(parse_memory_value("not a number"), None);
    }

    #[test]
    fn test_get_gpu_info_does_not_panic() {
        // Should return a result without panicking on any platform
        let _info = get_gpu_info();
    }
}
