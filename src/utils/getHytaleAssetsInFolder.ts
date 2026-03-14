import * as tauriApi from "@tauri-apps/api";

export async function getHytaleAssetsInFolder(basePath: string, folder: string): Promise<string[]> {
  try {
    const fullPath = `${basePath}/${folder}`;
    const entries = await tauriApi.fs.readDir(fullPath);
    return entries
      .filter((entry) => entry.name && !entry.name.startsWith("."))
      .map((entry) => entry.name!);
  } catch {
    return [];
  }
}
