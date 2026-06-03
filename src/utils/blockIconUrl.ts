import { convertFileSrc } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { getHytaleAssetCacheRoot, listDirectory } from "@/utils/ipc";
import type { DirectoryEntryData } from "@/utils/ipc";
import { isTauriRuntime } from "@/utils/platform";

const ICON_RELATIVE = "Common/Icons/ItemsGenerated";

let cachedIconsRoot: string | null | undefined;

/**
 * Resolve a block/material icon URL for the UI.
 * Prefers synced Hytale release cache icons; falls back to bundled public/icons.
 */
export async function resolveBlockIconUrl(materialId: string): Promise<string> {
  if (!materialId || !isTauriRuntime()) {
    return `/icons/ItemsGenerated/${materialId}.png`;
  }

  if (cachedIconsRoot === undefined) {
    try {
      const cacheRoot = await getHytaleAssetCacheRoot();
      cachedIconsRoot = await join(cacheRoot, ICON_RELATIVE);
    } catch {
      cachedIconsRoot = null;
    }
  }

  if (cachedIconsRoot) {
    const absolute = await join(cachedIconsRoot, `${materialId}.png`);
    return convertFileSrc(absolute);
  }

  return `/icons/ItemsGenerated/${materialId}.png`;
}

/** Reset after a Hytale asset sync so new icons are picked up. */
export function clearBlockIconCache(): void {
  cachedIconsRoot = undefined;
  cachedBlockMaterialIds = undefined;
}

let cachedBlockMaterialIds: string[] | undefined;

function collectPngStems(entries: DirectoryEntryData[]): string[] {
  const stems: string[] = [];
  const stack = [...entries];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;
    if (entry.is_dir) {
      if (Array.isArray(entry.children)) {
        for (const child of entry.children) stack.push(child);
      }
      continue;
    }
    if (entry.name.toLowerCase().endsWith(".png")) {
      stems.push(entry.name.replace(/\.png$/i, ""));
    }
  }
  return stems;
}

/** Block/material IDs from synced Hytale ItemsGenerated icons (release cache). */
export async function loadSyncedBlockMaterialIds(): Promise<string[]> {
  if (!isTauriRuntime()) return [];
  if (cachedBlockMaterialIds) return cachedBlockMaterialIds;

  try {
    const cacheRoot = await getHytaleAssetCacheRoot();
    const iconsDir = await join(cacheRoot, ICON_RELATIVE);
    const entries = await listDirectory(iconsDir);
    cachedBlockMaterialIds = collectPngStems(entries);
    return cachedBlockMaterialIds;
  } catch {
    cachedBlockMaterialIds = [];
    return [];
  }
}
