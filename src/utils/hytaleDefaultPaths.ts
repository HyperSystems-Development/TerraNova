import { homeDir, join } from "@tauri-apps/api/path";

type OS = "windows" | "macos" | "linux";

/** Detect OS from the home directory path returned by Tauri. */
function detectOsFromHome(home: string): OS {
  if (/^[A-Za-z]:[/\\]/.test(home)) return "windows";
  if (home.startsWith("/Users/")) return "macos";
  return "linux";
}

/**
 * Returns the OS-appropriate Hytale AppData/config root, e.g.:
 *   Windows : C:\Users\<name>\AppData\Roaming\Hytale
 *   macOS   : /Users/<name>/Library/Application Support/Hytale
 *   Linux   : /home/<name>/.local/share/Hytale
 */
async function hytaleDataRoot(): Promise<{ home: string; root: string; os: OS }> {
  const home = await homeDir();
  const os = detectOsFromHome(home);
  let root: string;
  if (os === "windows") {
    root = await join(home, "AppData", "Roaming", "Hytale");
  } else if (os === "macos") {
    root = await join(home, "Library", "Application Support", "Hytale");
  } else {
    root = await join(home, ".local", "share", "Hytale");
  }
  return { home, root, os };
}

/**
 * Default Hytale pre-release asset zip path for the running user/OS.
 *
 * Windows : %APPDATA%\Hytale\install\pre-release\package\game\latest\Assets.zip
 * macOS   : ~/Library/Application Support/Hytale/install/pre-release/package/game/latest/Assets.zip
 * Linux   : ~/.local/share/Hytale/install/pre-release/package/game/latest/Assets.zip
 */
export async function resolveDefaultPreReleaseAssetsPath(): Promise<string> {
  const { root } = await hytaleDataRoot();
  return join(root, "install", "pre-release", "package", "game", "latest", "Assets.zip");
}

/**
 * Default Hytale release asset folder for the running user/OS.
 *
 * Windows : %APPDATA%\Hytale\install\release\package\game\latest
 * macOS   : ~/Library/Application Support/Hytale/install/release/package/game/latest
 * Linux   : ~/.local/share/Hytale/install/release/package/game/latest
 */
export async function resolveDefaultReleaseAssetsPath(): Promise<string> {
  const { root } = await hytaleDataRoot();
  return join(root, "install", "release", "package", "game", "latest");
}

/**
 * Default Common assets path — a convenience starting point for the Browse dialog.
 * Points to <home>/Desktop/Assets/Common on all platforms.
 */
export async function resolveDefaultCommonAssetsPath(): Promise<string> {
  const home = await homeDir();
  return join(home, "Desktop", "Assets", "Common");
}
