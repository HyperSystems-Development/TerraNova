import * as tauriApi from "@tauri-apps/api";

declare global {
  interface Window {
    __TAURI__?: any;
  }
}

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
  "Server/World"
];

export async function getAvailableHytaleAssetFolders(basePath: string): Promise<string[]> {
  const checks = await Promise.all(
    hytaleAssetFolders.map(async (folder) => {
      const folderExists = await tauriApi.fs.exists(`${basePath}/${folder}`);
      return folderExists ? folder : null;
    })
  );
  return checks.filter((f): f is string => !!f);
}
