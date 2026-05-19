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

#[derive(Serialize, Clone, Default)]
pub struct GpuAdapterInfo {
    pub id: String,
    pub name: String,
    pub vendor: Option<String>,
    pub kind: Option<String>,
    pub vram_mb: Option<u64>,
}

#[derive(Serialize, Default)]
pub struct GpuInfo {
    pub gpu_name: Option<String>,
    pub vram_mb: Option<u64>,
    pub gpus: Vec<GpuAdapterInfo>,
}

#[tauri::command]
pub fn get_gpu_info() -> GpuInfo {
    detect_gpu().unwrap_or_default()
}

fn infer_gpu_kind(name: &str) -> &'static str {
    let lower = name.to_lowercase();
    if lower.contains("intel")
        || lower.contains("iris")
        || lower.contains("uhd")
        || lower.contains("hd graphics")
        || lower.contains("apple")
        || lower.contains("integrated")
    {
        "integrated"
    } else if lower.contains("nvidia")
        || lower.contains("geforce")
        || lower.contains("quadro")
        || lower.contains("rtx")
        || lower.contains("gtx")
        || lower.contains("amd")
        || lower.contains("radeon")
        || lower.contains("rx ")
        || lower.contains("arc ")
        || lower.contains("discrete")
    {
        "discrete"
    } else {
        "unknown"
    }
}

fn finalize_gpu_info(mut gpus: Vec<GpuAdapterInfo>) -> Option<GpuInfo> {
    if gpus.is_empty() {
        return None;
    }

    gpus.sort_by_key(|gpu| match gpu.kind.as_deref() {
        Some("discrete") => 0,
        Some("integrated") => 1,
        _ => 2,
    });

    let primary = gpus.first().cloned()?;
    Some(GpuInfo {
        gpu_name: Some(primary.name),
        vram_mb: primary.vram_mb,
        gpus,
    })
}

/// Parse a memory value string like "8192 MB", "12 GB", or "12884901888" (bytes) into megabytes.
#[cfg(any(target_os = "macos", test))]
fn parse_memory_value(s: &str) -> Option<u64> {
    let s = s.trim();

    // Try "X GB" or "X MB" patterns
    let lower = s.to_lowercase();
    if let Some(num_str) = lower
        .strip_suffix("gb")
        .or_else(|| lower.strip_suffix(" gb"))
    {
        if let Ok(val) = num_str.trim().parse::<f64>() {
            return Some((val * 1024.0) as u64);
        }
    }
    if let Some(num_str) = lower
        .strip_suffix("mb")
        .or_else(|| lower.strip_suffix(" mb"))
    {
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
    let nvidia = detect_gpu_nvidia_smi();
    if !nvidia.is_empty() {
        return finalize_gpu_info(nvidia);
    }

    let amd = detect_gpu_amd_sysfs();
    if !amd.is_empty() {
        return finalize_gpu_info(amd);
    }

    let names = detect_gpu_names_lspci();
    if !names.is_empty() {
        return finalize_gpu_info(
            names
                .into_iter()
                .enumerate()
                .map(|(index, name)| GpuAdapterInfo {
                    id: format!("linux-gpu-{index}"),
                    vendor: None,
                    kind: Some(infer_gpu_kind(&name).to_string()),
                    vram_mb: None,
                    name,
                })
                .collect(),
        );
    }

    None
}

#[cfg(target_os = "linux")]
fn detect_gpu_nvidia_smi() -> Vec<GpuAdapterInfo> {
    let output = std::process::Command::new("nvidia-smi")
        .args([
            "--query-gpu=index,name,memory.total",
            "--format=csv,noheader,nounits",
        ])
        .output()
        .ok();

    let Some(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .filter_map(|line| {
            let mut parts = line.splitn(3, ',');
            let index = parts.next()?.trim();
            let name = parts.next()?.trim().to_string();
            let vram_mb = parts.next()?.trim().parse::<u64>().ok();
            if name.is_empty() {
                return None;
            }
            Some(GpuAdapterInfo {
                id: format!("nvidia-{index}"),
                name,
                vendor: Some("NVIDIA".to_string()),
                kind: Some("discrete".to_string()),
                vram_mb,
            })
        })
        .collect()
}

#[cfg(target_os = "linux")]
fn detect_gpu_amd_sysfs() -> Vec<GpuAdapterInfo> {
    // Read VRAM from sysfs (bytes)
    let vram_bytes = std::fs::read_to_string("/sys/class/drm/card0/device/mem_info_vram_total")
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok());
    let vram_mb = vram_bytes.map(|b| b / (1024 * 1024));

    // GPU name from lspci
    let gpu_name = detect_gpu_names_lspci().into_iter().next();

    if gpu_name.is_none() && vram_mb.is_none() {
        return Vec::new();
    }

    vec![GpuAdapterInfo {
        id: "amd-card0".to_string(),
        name: gpu_name.unwrap_or_else(|| "AMD GPU".to_string()),
        vendor: Some("AMD".to_string()),
        kind: Some("discrete".to_string()),
        vram_mb,
    }]
}

#[cfg(target_os = "linux")]
fn detect_gpu_names_lspci() -> Vec<String> {
    let output = std::process::Command::new("lspci").output().ok();
    let Some(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut names = Vec::new();
    for line in stdout.lines() {
        let lower = line.to_lowercase();
        if lower.contains("vga")
            || lower.contains("3d controller")
            || lower.contains("display controller")
        {
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
                        names.push(name.to_string());
                    }
                }
            }
        }
    }

    names
}

// ── Windows GPU detection ──

#[cfg(target_os = "windows")]
fn detect_gpu() -> Option<GpuInfo> {
    let gpus = detect_gpu_windows();
    if !gpus.is_empty() {
        return finalize_gpu_info(gpus);
    }
    None
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
fn detect_gpu_windows() -> Vec<GpuAdapterInfo> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,PNPDeviceID,VideoProcessor | ConvertTo-Json -Compress)",
        ])
        .output()
        .ok();

    let Some(output) = output else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed = serde_json::from_str::<serde_json::Value>(&stdout).ok();
    let Some(parsed) = parsed else {
        return Vec::new();
    };

    let values = match parsed {
        serde_json::Value::Array(values) => values,
        value @ serde_json::Value::Object(_) => vec![value],
        _ => return Vec::new(),
    };

    let mut gpus = Vec::new();
    for (index, value) in values.into_iter().enumerate() {
        let name = value
            .get("Name")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .trim()
            .to_string();
        if name.is_empty() {
            continue;
        }
        let id = value
            .get("PNPDeviceID")
            .and_then(|v| v.as_str())
            .filter(|v| !v.trim().is_empty())
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("windows-gpu-{index}"));
        let vram_mb = value
            .get("AdapterRAM")
            .and_then(|v| {
                v.as_u64()
                    .or_else(|| v.as_str().and_then(|s| s.parse::<u64>().ok()))
            })
            .filter(|v| *v > 0)
            .map(|bytes| bytes / (1024 * 1024));
        let vendor = if name.to_lowercase().contains("nvidia") {
            Some("NVIDIA".to_string())
        } else if name.to_lowercase().contains("amd") || name.to_lowercase().contains("radeon") {
            Some("AMD".to_string())
        } else if name.to_lowercase().contains("intel") {
            Some("Intel".to_string())
        } else {
            None
        };

        gpus.push(GpuAdapterInfo {
            id,
            name: name.clone(),
            vendor,
            kind: Some(infer_gpu_kind(&name).to_string()),
            vram_mb,
        });
    }

    if gpus.is_empty() {
        if let Some(name) = detect_gpu_name_windows() {
            return vec![GpuAdapterInfo {
                id: "windows-gpu-0".to_string(),
                name: name.clone(),
                vendor: None,
                kind: Some(infer_gpu_kind(&name).to_string()),
                vram_mb: detect_vram_windows_registry().or_else(detect_vram_windows_wmi),
            }];
        }
    }

    gpus
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
    let mut gpus: Vec<GpuAdapterInfo> = Vec::new();
    let mut current_name: Option<String> = None;
    let mut current_vram: Option<u64> = None;

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Chipset Model:") {
            if let Some(name) = current_name.take() {
                gpus.push(GpuAdapterInfo {
                    id: format!("macos-gpu-{}", gpus.len()),
                    vendor: if name.starts_with("Apple") {
                        Some("Apple".to_string())
                    } else {
                        None
                    },
                    kind: Some(infer_gpu_kind(&name).to_string()),
                    vram_mb: current_vram.take(),
                    name,
                });
            }
            if let Some(val) = trimmed.strip_prefix("Chipset Model:") {
                let val = val.trim();
                if !val.is_empty() {
                    current_name = Some(val.to_string());
                }
            }
        } else if trimmed.starts_with("VRAM") {
            // e.g. "VRAM (Total): 8 GB" or "VRAM (Dynamic, Max): 72 GB"
            if let Some((_key, val)) = trimmed.split_once(':') {
                current_vram = parse_memory_value(val);
            }
        }
    }

    if let Some(name) = current_name.take() {
        gpus.push(GpuAdapterInfo {
            id: format!("macos-gpu-{}", gpus.len()),
            vendor: if name.starts_with("Apple") {
                Some("Apple".to_string())
            } else {
                None
            },
            kind: Some(infer_gpu_kind(&name).to_string()),
            vram_mb: current_vram.take(),
            name,
        });
    }

    for gpu in &mut gpus {
        if gpu.vram_mb.is_none() && gpu.name.starts_with("Apple") {
            let sys = System::new_all();
            gpu.vram_mb = Some(sys.total_memory() / (1024 * 1024));
        }
    }

    finalize_gpu_info(gpus)
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
