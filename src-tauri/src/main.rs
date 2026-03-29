#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Hint Windows to prefer the discrete GPU when available (NVIDIA / AMD).
// These exported symbols are read by GPU drivers to prefer high-performance adapter
// for the *executable* binary. They must be present in the final exe for drivers
// like NVIDIA Optimus and AMD PowerXpress to honor the preference.
#[cfg(target_os = "windows")]
#[no_mangle]
pub static NvOptimusEnablement: u32 = 0x00000001;

#[cfg(target_os = "windows")]
#[no_mangle]
pub static AmdPowerXpressRequestHighPerformance: u32 = 0x00000001;

fn main() {
    // Work around WebKitGTK rendering issues on Linux (GH-9, GH-36).
    //
    // WEBKIT_DISABLE_DMABUF_RENDERER  – prevents "Error 71 (Protocol error)
    //   dispatching to Wayland display" crash with NVIDIA proprietary drivers.
    //
    // WEBKIT_DISABLE_COMPOSITING_MODE – prevents "Could not create default EGL
    //   display: EGL_BAD_PARAMETER" on Intel integrated GPUs (e.g. Iris Xe)
    //   where EGL initialization fails outright, producing a blank window.
    #[cfg(target_os = "linux")]
    {
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    terranova_lib::run()
}
