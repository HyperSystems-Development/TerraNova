import { pathExists } from "./ipc";
import { joinPath } from "./pathUtils";

export const hytaleAssetFolders = [
  "Common/Blocks",
  "Common/BlockTextures",
  "Common/Characters",
  "Common/Items",
  "Common/Icons",
  "Common/Languages",
  "Common/Music",
  "Common/NotificationIcons",
  "Common/NPC",
  "Common/Particles",
  "Common/Resources",
  "Common/ScreenEffects",
  "Common/Sky",
  "Common/Sounds",
  "Common/TintGradients",
  "Common/Trails",
  "Common/UI",
  "Common/VFX",
  "Server/Audio",
  "Server/BarterShops",
  "Server/BlockTypeList",
  "Server/Camera",
  "Server/Drops",
  "Server/Entity",
  "Server/Environments",
  "Server/Farming",
  "Server/GameplayConfigs",
  "Server/HytaleGenerator",
  "Server/Instances",
  "Server/Item",
  "Server/Languages",
  "Server/Models",
  "Server/NPC",
  "Server/Objective",
  "Server/Particles",
  "Server/PortalTypes",
  "Server/Prefabs",
  "Server/ProjectileConfigs",
  "Server/Projectiles",
  "Server/ScriptedBrushes",
  "Server/TagPatterns",
  "Server/Weathers",
  "Server/WordLists",
  "Server/World",
];

const CACHE_TTL_MS = 30_000;

interface FolderCacheEntry {
  expiresAt: number;
  value: string[];
}

const availableFoldersCache = new Map<string, FolderCacheEntry>();
const pendingAvailableFolders = new Map<string, Promise<string[]>>();

function isFresh(entry: FolderCacheEntry | undefined): entry is FolderCacheEntry {
  return !!entry && entry.expiresAt > Date.now();
}

export function hasCachedAvailableHytaleAssetFolders(basePath: string): boolean {
  return isFresh(availableFoldersCache.get(basePath));
}

export function clearAvailableHytaleAssetFoldersCache(basePath?: string): void {
  if (basePath) {
    availableFoldersCache.delete(basePath);
    pendingAvailableFolders.delete(basePath);
    return;
  }
  availableFoldersCache.clear();
  pendingAvailableFolders.clear();
}

export async function getAvailableHytaleAssetFolders(basePath: string): Promise<string[]> {
  const cached = availableFoldersCache.get(basePath);
  if (isFresh(cached)) {
    return cached.value;
  }

  const pending = pendingAvailableFolders.get(basePath);
  if (pending) {
    return pending;
  }

  const request = Promise.all(
    hytaleAssetFolders.map(async (folder) => {
      const exists = await pathExists(joinPath(basePath, folder)).catch(() => false);
      return exists ? folder : null;
    }),
  )
    .then((checks) => {
      const folders = checks.filter((f): f is string => !!f);
      availableFoldersCache.set(basePath, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: folders,
      });
      return folders;
    })
    .finally(() => {
      pendingAvailableFolders.delete(basePath);
    });

  pendingAvailableFolders.set(basePath, request);
  return request;
}
