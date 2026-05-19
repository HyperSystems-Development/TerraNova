import { homeDir, join } from "@tauri-apps/api/path";
import { pathExists } from "./ipc";
import { isTauriRuntime } from "./platform";

type OS = "windows" | "macos" | "linux";

/** Detect OS from the home directory path returned by Tauri. */
function detectOsFromHome(home: string): OS {
  if (/^[A-Za-z]:[/\\]/.test(home)) return "windows";
  if (home.startsWith("/Users/")) return "macos";
  return "linux";
}

function detectOsFromNavigator(): OS {
  if (navigator.userAgent.includes("Mac")) return "macos";
  if (navigator.userAgent.includes("Windows")) return "windows";
  return "linux";
}

function fallbackJoin(os: OS, ...parts: string[]): string {
  const separator = os === "windows" ? "\\" : "/";
  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (index === 0) return part.replace(/[\\/]+$/g, "");
      return part.replace(/^[\\/]+|[\\/]+$/g, "");
    })
    .join(separator);
}

async function joinPath(os: OS, ...parts: string[]): Promise<string> {
  return isTauriRuntime() ? join(...parts) : fallbackJoin(os, ...parts);
}

/**
 * Returns the OS-appropriate Hytale AppData/config root, e.g.:
 *   Windows : C:\Users\<name>\AppData\Roaming\Hytale
 *   macOS   : /Users/<name>/Library/Application Support/Hytale
 *   Linux   : /home/<name>/.local/share/Hytale
 */
async function hytaleDataRoot(): Promise<{ home: string; root: string; os: OS }> {
  if (!isTauriRuntime()) {
    const os = detectOsFromNavigator();
    const home = os === "windows" ? "%USERPROFILE%" : "~";
    const root = os === "windows"
      ? "%APPDATA%\\Hytale"
      : os === "macos"
        ? "~/Library/Application Support/Hytale"
        : "~/.local/share/Hytale";
    return { home, root, os };
  }

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
  const { root, os } = await hytaleDataRoot();
  return joinPath(os, root, "install", "pre-release", "package", "game", "latest", "Assets.zip");
}

/**
 * Default Hytale release asset folder for the running user/OS.
 *
 * Windows : %APPDATA%\Hytale\install\release\package\game\latest
 * macOS   : ~/Library/Application Support/Hytale/install/release/package/game/latest
 * Linux   : ~/.local/share/Hytale/install/release/package/game/latest
 */
export async function resolveDefaultReleaseAssetsPath(): Promise<string> {
  const { root, os } = await hytaleDataRoot();
  return joinPath(os, root, "install", "release", "package", "game", "latest");
}

/**
 * Default Common assets source.
 * Prefer the user's installed Assets.zip when available so TerraNova can read
 * the Common subtree directly from the archive; otherwise fall back to a loose
 * Common folder path.
 */
export async function resolveDefaultCommonAssetsPath(): Promise<string> {
  const preReleaseZip = await resolveDefaultPreReleaseAssetsPath();
  if (await pathExists(preReleaseZip).catch(() => false)) {
    return preReleaseZip;
  }

  const releaseRoot = await resolveDefaultReleaseAssetsPath();
  const { os } = await hytaleDataRoot();
  const releaseZip = await joinPath(os, releaseRoot, "Assets.zip");
  if (await pathExists(releaseZip).catch(() => false)) {
    return releaseZip;
  }

  const releaseCommon = await joinPath(os, releaseRoot, "Common");
  if (await pathExists(releaseCommon).catch(() => false)) {
    return releaseCommon;
  }

  const { home } = await hytaleDataRoot();
  return joinPath(os, home, "Desktop", "Assets", "Common");
}
