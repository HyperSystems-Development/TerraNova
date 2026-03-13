#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Work around WebKitGTK protocol error on Wayland with NVIDIA proprietary
    // drivers (GH-9). The DMA-BUF renderer triggers "Error 71 (Protocol error)
    // dispatching to Wayland display" and an instant crash on affected systems.
    #[cfg(target_os = "linux")]
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    terranova_lib::run()
}
