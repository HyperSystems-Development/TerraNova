#[cfg(not(target_os = "windows"))]
use std::process::{Command, Stdio};

#[tauri::command]
pub async fn relaunch_app(app: tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    {
        // Spawn a detached shell script that waits for this process to die,
        // re-signs the bundle (the updater invalidates the code signature),
        // then launches the app via `open`. Using `open -n` while the current
        // process is still alive fails on macOS Sequoia+
        // (RBSRequestErrorDomain Code=5).
        let pid = std::process::id();

        if let Ok(exe) = std::env::current_exe() {
            if let Some(bundle) = exe
                .parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.parent())
            {
                let bundle_str = bundle.display().to_string();
                let exe_str = exe.display().to_string();
                eprintln!("[relaunch] pid={pid} bundle={bundle_str}");

                let script = concat!(
                    "for i in $(seq 1 150); do ",
                    "kill -0 \"$TN_PID\" 2>/dev/null || break; ",
                    "sleep 0.2; ",
                    "done; ",
                    "chmod +x \"$TN_EXE\"; ",
                    "xattr -cr \"$TN_BUNDLE\"; ",
                    "codesign --force --deep --sign - \"$TN_BUNDLE\"; ",
                    "open \"$TN_BUNDLE\"",
                );

                match Command::new("sh")
                    .arg("-c")
                    .arg(script)
                    .env("TN_PID", pid.to_string())
                    .env("TN_EXE", &exe_str)
                    .env("TN_BUNDLE", &bundle_str)
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                {
                    Ok(_) => eprintln!("[relaunch] script spawned"),
                    Err(e) => eprintln!("[relaunch] spawn failed: {e}"),
                }
            }
        }

        // Brief pause so the shell process is running before we exit
        std::thread::sleep(std::time::Duration::from_millis(200));
        app.exit(0);
    }

    #[cfg(target_os = "linux")]
    {
        // Ensure execute permission (Tauri bug #1608 — updated AppImage may
        // lack +x) then spawn the new binary and exit.
        if let Ok(exe) = std::env::current_exe() {
            let _ = Command::new("chmod").arg("+x").arg(&exe).output();
            let _ = Command::new(&exe)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .spawn();
        }
        app.exit(0);
    }

    #[cfg(target_os = "windows")]
    {
        // NSIS installer in passive mode auto-kills and restarts the app.
        // This is a defensive fallback in case the command is called anyway.
        app.restart();
    }
}
