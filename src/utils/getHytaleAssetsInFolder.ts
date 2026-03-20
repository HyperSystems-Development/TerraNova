import { listDirectory } from "./ipc";
import { joinPath } from "./pathUtils";

const CACHE_TTL_MS = 30_000;

interface AssetFolderCacheEntry {
  expiresAt: number;
  value: string[];
}

const assetFolderCache = new Map<string, AssetFolderCacheEntry>();
const pendingAssetFolderRequests = new Map<string, Promise<string[]>>();

function getCacheKey(basePath: string, folder: string): string {
  return `${basePath}::${folder}`;
}

function isFresh(entry: AssetFolderCacheEntry | undefined): entry is AssetFolderCacheEntry {
  return !!entry && entry.expiresAt > Date.now();
}

export function hasCachedHytaleAssetsInFolder(basePath: string, folder: string): boolean {
  return isFresh(assetFolderCache.get(getCacheKey(basePath, folder)));
}

export function clearHytaleAssetsInFolderCache(basePath?: string, folder?: string): void {
  if (basePath && folder) {
    const key = getCacheKey(basePath, folder);
    assetFolderCache.delete(key);
    pendingAssetFolderRequests.delete(key);
    return;
  }

  if (basePath) {
    for (const key of [...assetFolderCache.keys()]) {
      if (key.startsWith(`${basePath}::`)) {
        assetFolderCache.delete(key);
      }
    }
    for (const key of [...pendingAssetFolderRequests.keys()]) {
      if (key.startsWith(`${basePath}::`)) {
        pendingAssetFolderRequests.delete(key);
      }
    }
    return;
  }

  assetFolderCache.clear();
  pendingAssetFolderRequests.clear();
}

export async function getHytaleAssetsInFolder(basePath: string, folder: string): Promise<string[]> {
  const key = getCacheKey(basePath, folder);
  const cached = assetFolderCache.get(key);
  if (isFresh(cached)) {
    return cached.value;
  }

  const pending = pendingAssetFolderRequests.get(key);
  if (pending) {
    return pending;
  }

  const request = listDirectory(joinPath(basePath, folder))
    .then((entries) => entries
      .filter((entry) => entry.name && !entry.name.startsWith("."))
      .map((entry) => entry.name!))
    .catch(() => [])
    .then((assets) => {
      assetFolderCache.set(key, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value: assets,
      });
      return assets;
    })
    .finally(() => {
      pendingAssetFolderRequests.delete(key);
    });

  pendingAssetFolderRequests.set(key, request);
  return request;
}
