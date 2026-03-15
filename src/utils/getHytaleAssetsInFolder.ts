import { listDirectory } from "./ipc";
import { joinPath } from "./pathUtils";

export async function getHytaleAssetsInFolder(basePath: string, folder: string): Promise<string[]> {
  try {
    const entries = await listDirectory(joinPath(basePath, folder));
    return entries
      .filter((entry) => entry.name && !entry.name.startsWith("."))
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
